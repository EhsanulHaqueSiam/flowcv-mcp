/**
 * Chrome-based authentication flow for FlowCV CLI.
 * Launches Chrome, waits for login, extracts session cookie via CDP.
 */

import { execFile } from "node:child_process";
import { saveConfig, getCookie } from "./config.js";
import { verifyAuth, setSessionCookie } from "../api-client.js";
import { printSuccess, printError, printInfo, prompt } from "./output.js";

interface CDPVersionInfo {
  webSocketDebuggerUrl: string;
}

interface CDPCookie {
  name: string;
  value: string;
}

interface CDPResponse {
  id: number;
  result?: { cookies?: CDPCookie[] };
}

const CDP_PORT = 9222;

async function getCDPWebSocketUrl(): Promise<string | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const info = (await res.json()) as CDPVersionInfo;
    const wsUrl = info.webSocketDebuggerUrl || null;
    // Validate the URL points to localhost to prevent exfiltration
    if (wsUrl && !wsUrl.startsWith(`ws://127.0.0.1:${CDP_PORT}/`) && !wsUrl.startsWith(`ws://localhost:${CDP_PORT}/`)) {
      return null;
    }
    return wsUrl;
  } catch {
    return null;
  }
}

async function extractCookieViaCDP(wsUrl: string): Promise<string | null> {
  const WS = globalThis.WebSocket;
  if (!WS) return null;

  return new Promise((resolve) => {
    const ws = new WS(wsUrl);
    const timeout = setTimeout(() => { ws.close(); resolve(null); }, 5000);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({
        id: 1,
        method: "Network.getCookies",
        params: { urls: ["https://app.flowcv.com"] },
      }));
    });

    ws.addEventListener("message", (event: { data: unknown }) => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(String(event.data)) as CDPResponse;
        const cookie = data.result?.cookies?.find((c: CDPCookie) => c.name === "flowcvsidapp");
        ws.close();
        resolve(cookie?.value || null);
      } catch {
        ws.close();
        resolve(null);
      }
    });

    ws.addEventListener("error", () => { clearTimeout(timeout); ws.close(); resolve(null); });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function persistLogin(cookieValue: string, user: Record<string, unknown>): void {
  const email = String(user.email || "unknown");
  saveConfig({ cookie: cookieValue, email, lastLogin: new Date().toISOString() });
  printSuccess(`Logged in as ${email}`);
}

export async function loginWithChrome(): Promise<boolean> {
  let launcher: { kill: () => void } | null = null;

  try {
    const chromeLauncher = await import("chrome-launcher");

    printInfo("Launching Chrome...");
    launcher = await chromeLauncher.launch({
      startingUrl: "https://app.flowcv.com/app/login",
      chromeFlags: [`--remote-debugging-port=${CDP_PORT}`, "--no-sandbox"],
    });

    console.log("Waiting for you to log in to FlowCV...");
    console.log("(The browser will close automatically after login)\n");

    const startTime = Date.now();
    const TIMEOUT = 120_000;

    while (Date.now() - startTime < TIMEOUT) {
      await sleep(2000);
      const wsUrl = await getCDPWebSocketUrl();
      if (!wsUrl) continue;
      const cookieValue = await extractCookieViaCDP(wsUrl);
      if (!cookieValue) continue;

      setSessionCookie(`flowcvsidapp=${cookieValue}`);
      const user = await verifyAuth();
      if (user) {
        persistLogin(cookieValue, user);
        launcher.kill();
        return true;
      }
    }

    printError("Login timed out after 2 minutes.");
    launcher.kill();
    return false;
  } catch {
    if (launcher) { try { launcher.kill(); } catch { /* ignore */ } }
    printInfo("Chrome launcher not available. Opening browser with xdg-open...");
    try {
      execFile("xdg-open", ["https://app.flowcv.com/app/login"], () => {});
    } catch {
      printInfo("Please open https://app.flowcv.com/app/login manually.");
    }
    return loginWithManualPaste();
  }
}

export async function loginWithManualPaste(): Promise<boolean> {
  console.log("\nTo get your session cookie:");
  console.log("  1. Log in to https://app.flowcv.com");
  console.log("  2. Open DevTools (F12) > Application > Cookies > app.flowcv.com");
  console.log('  3. Copy the "flowcvsidapp" cookie value (starts with s%3A...)\n');

  const cookieValue = await prompt("Paste cookie value");
  if (!cookieValue) { printError("No cookie provided."); return false; }

  setSessionCookie(`flowcvsidapp=${cookieValue}`);
  const user = await verifyAuth();
  if (user) { persistLogin(cookieValue, user); return true; }

  printError("Invalid cookie — authentication failed.");
  return false;
}

/**
 * Ensure the CLI is authenticated. Sets the session cookie from config.
 * Exits with error if no cookie is found.
 */
export function ensureAuth(): void {
  const cookie = getCookie();
  if (!cookie) {
    printError('Not logged in. Run "flowcv login" first.');
    process.exit(1);
  }
  setSessionCookie(`flowcvsidapp=${cookie}`);
}
