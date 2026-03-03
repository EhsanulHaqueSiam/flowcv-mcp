import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function set(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv design set <resume_id> <path> <value>");
  requireArg(ctx.args[1], "Usage: flowcv design set <resume_id> <path> <value>");

  let parsedValue: unknown = ctx.args[2];
  if (ctx.args[2] !== undefined) {
    try { parsedValue = JSON.parse(ctx.args[2]); } catch { /* keep as string */ }
  }

  await apiRequest("/api/resumes/save_customization", "PATCH", {
    resumeId: ctx.args[0],
    customizationUpdates: [{ path: ctx.args[1], value: parsedValue }],
  });

  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Set ${ctx.args[1]} = ${JSON.stringify(parsedValue)}`);
}

export async function get(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv design get <resume_id> [path]");
  const res = await apiRequest<{ resume: Record<string, unknown> }>(`/api/resumes/${ctx.args[0]}`);
  const customization = res.data.resume.customization as Record<string, unknown>;

  if (!ctx.args[1]) { printJSON(customization); return; }

  let current: unknown = customization;
  for (const part of ctx.args[1].split(".")) {
    if (current && typeof current === "object") current = (current as Record<string, unknown>)[part];
    else { current = undefined; break; }
  }
  printJSON(current);
}

export async function bulk(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv design bulk <resume_id> --data '[...]'");
  const updates = parseJSONFlag<{ path: string; value: unknown }[]>(ctx.flags.data);

  await apiRequest("/api/resumes/save_customization", "PATCH", {
    resumeId: ctx.args[0], customizationUpdates: updates,
  });

  if (ctx.json) printJSON({ success: true });
  else printSuccess(`${updates.length} customization(s) applied.`);
}
