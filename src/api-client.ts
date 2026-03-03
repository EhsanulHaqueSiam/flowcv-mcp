/**
 * FlowCV API client. Uses session cookie for authentication.
 * All requests are forwarded to https://app.flowcv.com/api/
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API_BASE = "https://app.flowcv.com";

let sessionCookie = "";
let authenticated = false;

export function setSessionCookie(cookie: string): void {
  sessionCookie = cookie;
  authenticated = false; // reset — will be verified on next request
}

export function getSessionCookie(): string {
  return sessionCookie;
}

export function isAuthenticated(): boolean {
  return authenticated;
}

/**
 * Update the cookie in memory and persist it to .mcp.json so restarts use the new value.
 */
export function updateCookieEverywhere(rawCookieValue: string): { updated: string[]; errors: string[] } {
  setSessionCookie(`flowcvsidapp=${rawCookieValue}`);

  const updated: string[] = ["in-memory session"];
  const errors: string[] = [];

  // Persist to .mcp.json (project-level)
  const mcpPath = resolve(process.cwd(), ".mcp.json");
  try {
    const mcpJson = JSON.parse(readFileSync(mcpPath, "utf-8"));
    if (mcpJson?.mcpServers?.flowcv?.env) {
      mcpJson.mcpServers.flowcv.env.FLOWCV_SESSION_COOKIE = rawCookieValue;
      writeFileSync(mcpPath, JSON.stringify(mcpJson, null, 2) + "\n", { mode: 0o600 });
      updated.push(mcpPath);
    }
  } catch {
    // .mcp.json might not exist or be elsewhere
  }

  return { updated, errors };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string;
  code: number;
}

const SESSION_EXPIRED_MSG = `SESSION_EXPIRED: Your FlowCV session cookie is missing, invalid, or expired. To fix this:

1. Use the flowcv_update_cookie tool with a fresh cookie value.
2. To get a new cookie: open https://app.flowcv.com in a browser → log in → DevTools (F12) → Application → Cookies → app.flowcv.com → copy the "flowcvsidapp" value (starts with s%3A...).
3. Or use the CLI: run "flowcv login" to open Chrome and extract the cookie automatically.`;

const NO_COOKIE_MSG = `NO_COOKIE: No session cookie is configured. The server started without authentication.

To fix this, use the flowcv_update_cookie tool with your cookie value.
To get a cookie: open https://app.flowcv.com → log in → DevTools (F12) → Application → Cookies → copy the "flowcvsidapp" value.`;

/**
 * Verify authentication by checking init_user endpoint.
 * Returns the user object if authenticated, null if not.
 */
export async function verifyAuth(): Promise<Record<string, unknown> | null> {
  if (!sessionCookie) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/init_user`, {
      headers: { Accept: "application/json", Cookie: sessionCookie },
    });
    const data = (await res.json()) as ApiResponse<{ user: Record<string, unknown> | null }>;
    if (data.success && data.data.user) {
      authenticated = true;
      return data.data.user;
    }
    authenticated = false;
    return null;
  } catch {
    authenticated = false;
    return null;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
  body?: unknown,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  // No cookie at all
  if (!sessionCookie) {
    throw new Error(NO_COOKIE_MSG);
  }

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Cookie: sessionCookie,
  };

  const fetchOptions: RequestInit = { method, headers, redirect: "manual" };

  if (body && method !== "GET") {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  // Redirect to login page = expired session
  if (response.status === 302 || response.status === 301) {
    const location = response.headers.get("location") || "";
    if (location.includes("login") || location.includes("signin") || location.includes("auth")) {
      authenticated = false;
      throw new Error(SESSION_EXPIRED_MSG);
    }
  }

  // 401 / 403
  if (response.status === 401 || response.status === 403) {
    authenticated = false;
    throw new Error(SESSION_EXPIRED_MSG);
  }

  let data: ApiResponse<T>;
  try {
    data = (await response.json()) as ApiResponse<T>;
  } catch {
    if (response.headers.get("content-type")?.includes("text/html")) {
      authenticated = false;
      throw new Error(SESSION_EXPIRED_MSG);
    }
    throw new Error(`API returned non-JSON response (status ${response.status})`);
  }

  // FlowCV returns success:true with user:null for unauthenticated init_user calls.
  // For other endpoints it returns success:false with a generic "An error occurred" and code 500.
  // Detect both patterns as auth failures.
  if (data.success) {
    // Check for the init_user "logged out" pattern: success but user is null
    const anyData = data.data as Record<string, unknown> | null;
    if (endpoint.includes("init_user") && anyData && anyData.user === null) {
      authenticated = false;
      throw new Error(SESSION_EXPIRED_MSG);
    }
    authenticated = true;
    return data;
  }

  // success: false
  const errMsg = data.error || "";

  // Detect auth-related failures
  if (
    errMsg.includes("not authenticated") ||
    errMsg.includes("unauthorized") ||
    data.code === 401
  ) {
    authenticated = false;
    throw new Error(SESSION_EXPIRED_MSG);
  }

  // Generic "An error occurred" with code 500 on data endpoints = likely auth issue.
  // Verify by calling init_user.
  if (!authenticated && data.code === 500 && errMsg === "An error occurred") {
    const user = await verifyAuth();
    if (!user) {
      throw new Error(SESSION_EXPIRED_MSG);
    }
    // If we ARE authenticated, it's a real server error — fall through
  }

  throw new Error(errMsg || `API request failed with status ${response.status}`);
}

export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

/**
 * Initialize the session cookie from CLI config (~/.config/flowcv/config.json).
 * Used by the CLI entry point. Does not affect MCP server behavior.
 */
export async function initFromConfig(): Promise<boolean> {
  try {
    const { getCookie } = await import("./cli/config.js");
    const cookie = getCookie();
    if (cookie) {
      setSessionCookie(`flowcvsidapp=${cookie}`);
      return true;
    }
  } catch {
    // CLI config module not available — MCP server context
  }
  return false;
}
