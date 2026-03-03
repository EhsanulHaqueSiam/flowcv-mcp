import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function set(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv personal set <resume_id> --data '{...}'");
  const personalDetails = parseJSONFlag(ctx.flags.data);
  await apiRequest("/api/resumes/save_personal_details", "PATCH", {
    resumeId: ctx.args[0], personalDetails,
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Personal details saved.");
}

export async function get(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv personal get <resume_id>");
  const res = await apiRequest<{ resume: Record<string, unknown> }>(`/api/resumes/${ctx.args[0]}`);
  printJSON(res.data.resume.personalDetails || {});
}
