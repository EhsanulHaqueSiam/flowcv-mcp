import { loadConfig, getConfigPath } from "../config.js";
import { loginWithChrome, loginWithManualPaste, ensureAuth } from "../auth-flow.js";
import { verifyAuth } from "../../api-client.js";
import { printSuccess, printError, printKeyValue, printJSON } from "../output.js";
import type { CLIContext } from "../types.js";

async function verifyOrExit(ctx: CLIContext): Promise<Record<string, unknown>> {
  ensureAuth();
  const user = await verifyAuth();
  if (!user) {
    if (ctx.json) printJSON({ authenticated: false, error: "Cookie expired" });
    else printError('Session expired. Run "flowcv login" to re-authenticate.');
    process.exit(1);
  }
  return user;
}

export async function login(ctx: CLIContext): Promise<void> {
  if (ctx.flags.paste) await loginWithManualPaste();
  else await loginWithChrome();
}

export async function logout(_ctx: CLIContext): Promise<void> {
  const { clearConfig } = await import("../config.js");
  clearConfig();
  printSuccess("Logged out. Cookie removed.");
}

export async function status(ctx: CLIContext): Promise<void> {
  const user = await verifyOrExit(ctx);
  if (ctx.json) {
    printJSON({ authenticated: true, user });
  } else {
    const config = loadConfig();
    printSuccess("Authenticated");
    printKeyValue([
      ["Email", String(user.email || "unknown")],
      ["Role", String(user.role || "user")],
      ["Config", getConfigPath()],
      ["Last Login", config?.lastLogin || "unknown"],
    ]);
  }
}

export async function whoami(ctx: CLIContext): Promise<void> {
  const user = await verifyOrExit(ctx);
  if (ctx.json) printJSON({ email: user.email });
  else console.log(String(user.email));
}
