import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printTable, printJSON, confirmOrCancel, requireArg } from "../output.js";
import type { CLIContext } from "../types.js";

export async function list(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const res = await apiRequest<{ resumes: Record<string, unknown>[] }>("/api/resumes/all");
  const resumes = res.data.resumes;

  if (ctx.json) { printJSON(resumes); return; }
  if (resumes.length === 0) { console.log("No resumes found."); return; }

  printTable(
    ["ID", "Title", "Published", "Last Changed"],
    resumes.map(r => [
      String(r.id), String(r.title || "Untitled"),
      r.webResumeLive ? "Yes" : "No", String(r.lastChangeAt || ""),
    ])
  );
}

export async function get(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv resume get <id>");
  const res = await apiRequest<{ resume: Record<string, unknown> }>(`/api/resumes/${ctx.args[0]}`);
  printJSON(res.data.resume);
}

export async function create(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const title = (ctx.flags.title as string) || "Untitled Resume";
  const res = await apiRequest<{ resume: Record<string, unknown> }>(
    "/api/resumes/create", "POST", { clientResume: { title } }
  );
  if (ctx.json) printJSON(res.data.resume);
  else printSuccess(`Resume created: ${res.data.resume.id}`);
}

export async function duplicate(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv resume duplicate <id>");
  const res = await apiRequest<{ resume: Record<string, unknown> }>(
    "/api/resumes/duplicate", "POST", { duplicateId: ctx.args[0] }
  );
  if (ctx.json) printJSON(res.data.resume);
  else printSuccess(`Duplicated. New ID: ${res.data.resume.id}`);
}

export async function rename(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const id = ctx.args[0];
  const title = ctx.args[1] || (ctx.flags.title as string);
  requireArg(id, "Usage: flowcv resume rename <id> <title>");
  requireArg(title, "Usage: flowcv resume rename <id> <title>");
  await apiRequest("/api/resumes/rename_resume", "PATCH", { resumeId: id, resumeTitle: title });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Renamed to "${title}"`);
}

export async function del(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv resume delete <id>");
  if (!await confirmOrCancel(ctx.quiet, `Delete resume ${ctx.args[0]}?`)) return;
  await apiRequest("/api/resumes/delete_resume", "DELETE", undefined, { resumeId: ctx.args[0] });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Resume ${ctx.args[0]} deleted.`);
}

export async function download(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv resume download <id>");
  const res = await apiRequest<Record<string, unknown>>(
    "/api/resumes/download", "POST", { resumeId: ctx.args[0] }
  );
  printJSON(res.data);
}

export async function translate(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv resume translate <id> <lang>");
  requireArg(ctx.args[1], "Usage: flowcv resume translate <id> <lang>");
  const res = await apiRequest<{ resume: Record<string, unknown> }>(
    "/api/resumes/translate", "POST", { resumeId: ctx.args[0], targetLng: ctx.args[1] }
  );
  if (ctx.json) printJSON(res.data.resume);
  else printSuccess(`Translated. New ID: ${res.data.resume.id}`);
}
