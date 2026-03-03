import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printTable, printJSON, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function templateList(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const res = await apiRequest<{ templates: Record<string, unknown>[] }>(
    "/api/resume-templates/get-user-templates"
  );
  const templates = res.data.templates || [];

  if (ctx.json) { printJSON(templates); return; }
  if (templates.length === 0) { console.log("No custom templates found."); return; }

  printTable(
    ["ID", "Title"],
    templates.map(t => [String(t.id), String(t.title || "Untitled")])
  );
}

export async function templateApply(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv template apply <resume_id> <template_id>");
  requireArg(ctx.args[1], "Usage: flowcv template apply <resume_id> <template_id>");

  const tmpl = await apiRequest<{ template: Record<string, unknown> }>(
    "/api/resume-templates/get-template", "GET", undefined, { templateId: ctx.args[1] }
  );

  await apiRequest("/api/resumes/apply_template", "PATCH", {
    resumeId: ctx.args[0],
    templateId: ctx.args[1],
    customization: tmpl.data.template.customization || {},
    content: {},
    businessDetails: {},
    usingBusinessTemplateId: "",
    personalDetails: {},
  });

  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Template ${ctx.args[1]} applied.`);
}

export async function langSet(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv lang set <resume_id> <lang_code>");
  requireArg(ctx.args[1], "Usage: flowcv lang set <resume_id> <lang_code>");
  await apiRequest("/api/resumes/save_language", "PATCH", {
    resumeId: ctx.args[0], lng: ctx.args[1],
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Language set to "${ctx.args[1]}".`);
}

export async function tagsSet(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv tags set <resume_id> --data '[...]'");
  const tags = parseJSONFlag<unknown[]>(ctx.flags.data);
  await apiRequest("/api/resumes/save_tags", "PATCH", {
    resumeId: ctx.args[0], tags,
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Tags saved (${tags.length} tags).`);
}
