import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, requireArg } from "../output.js";
import type { CLIContext } from "../types.js";

async function setPublishState(ctx: CLIContext, state: boolean): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], `Usage: flowcv ${state ? "publish" : "unpublish"} <resume_id>`);
  await apiRequest("/api/resumes/publish_web_resume", "PATCH", {
    resumeId: ctx.args[0], publish: state,
  });
  if (ctx.json) printJSON({ success: true, published: state });
  else printSuccess(state ? "Resume published to the web." : "Resume taken offline.");
}

export async function publish(ctx: CLIContext): Promise<void> { await setPublishState(ctx, true); }
export async function unpublish(ctx: CLIContext): Promise<void> { await setPublishState(ctx, false); }

export async function downloadBtn(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv download-btn <resume_id> [on|off]");
  const enable = ctx.args[1] !== "off";
  await apiRequest("/api/resumes/enable_web_resume_download_btn", "PATCH", {
    resumeId: ctx.args[0], enable,
  });
  if (ctx.json) printJSON({ success: true, enabled: enable });
  else printSuccess(enable ? "Download button enabled." : "Download button disabled.");
}
