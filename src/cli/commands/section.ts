import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, confirmOrCancel, requireArg } from "../output.js";
import type { CLIContext } from "../types.js";

export async function rename(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], 'Usage: flowcv section rename <resume_id> <section> "New Name"');
  requireArg(ctx.args[1], 'Usage: flowcv section rename <resume_id> <section> "New Name"');
  requireArg(ctx.args[2], 'Usage: flowcv section rename <resume_id> <section> "New Name"');
  await apiRequest("/api/resumes/save_section_name", "PATCH", {
    resumeId: ctx.args[0], sectionId: ctx.args[1], displayName: ctx.args[2],
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Section renamed to "${ctx.args[2]}".`);
}

export async function icon(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv section icon <resume_id> <section> <icon_key>");
  requireArg(ctx.args[1], "Usage: flowcv section icon <resume_id> <section> <icon_key>");
  requireArg(ctx.args[2], "Usage: flowcv section icon <resume_id> <section> <icon_key>");
  await apiRequest("/api/resumes/save_section_icon", "PATCH", {
    resumeId: ctx.args[0], sectionId: ctx.args[1], iconKey: ctx.args[2],
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Icon set to "${ctx.args[2]}" for "${ctx.args[1]}".`);
}

export async function type(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv section type <resume_id> <section> <type>");
  requireArg(ctx.args[1], "Usage: flowcv section type <resume_id> <section> <type>");
  requireArg(ctx.args[2], "Usage: flowcv section type <resume_id> <section> <type>");
  await apiRequest("/api/resumes/update_section_type", "PATCH", {
    resumeId: ctx.args[0], sectionId: ctx.args[1], sectionType: ctx.args[2],
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Section type set to "${ctx.args[2]}".`);
}

export async function del(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv section delete <resume_id> <section>");
  requireArg(ctx.args[1], "Usage: flowcv section delete <resume_id> <section>");
  if (!await confirmOrCancel(ctx.quiet, `Delete section "${ctx.args[1]}" and all its entries?`)) return;
  await apiRequest("/api/resumes/delete_section", "DELETE", undefined, {
    resumeId: ctx.args[0], sectionId: ctx.args[1],
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Section "${ctx.args[1]}" deleted.`);
}
