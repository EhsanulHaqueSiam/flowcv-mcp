import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, confirmOrCancel, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function add(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv entry add <resume_id> <section> --data '{...}'");
  requireArg(ctx.args[1], "Usage: flowcv entry add <resume_id> <section> --data '{...}'");
  const entry = parseJSONFlag<Record<string, unknown>>(ctx.flags.data);
  if (!entry.id) entry.id = crypto.randomUUID();

  await apiRequest("/api/resumes/save_entry", "PATCH", {
    resumeId: ctx.args[0], sectionId: ctx.args[1], entry,
  });

  if (ctx.json) printJSON({ success: true, id: entry.id });
  else printSuccess(`Entry added to "${ctx.args[1]}" (ID: ${entry.id})`);
}

export async function update(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv entry update <resume_id> <section> <entry_id> --data '{...}'");
  requireArg(ctx.args[1], "Usage: flowcv entry update <resume_id> <section> <entry_id> --data '{...}'");
  requireArg(ctx.args[2], "Usage: flowcv entry update <resume_id> <section> <entry_id> --data '{...}'");
  const entry = parseJSONFlag<Record<string, unknown>>(ctx.flags.data);
  entry.id = ctx.args[2];

  await apiRequest("/api/resumes/save_entry", "PATCH", {
    resumeId: ctx.args[0], sectionId: ctx.args[1], entry,
  });

  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Entry ${ctx.args[2]} updated in "${ctx.args[1]}".`);
}

export async function del(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv entry delete <resume_id> <section> <entry_id>");
  requireArg(ctx.args[1], "Usage: flowcv entry delete <resume_id> <section> <entry_id>");
  requireArg(ctx.args[2], "Usage: flowcv entry delete <resume_id> <section> <entry_id>");
  if (!await confirmOrCancel(ctx.quiet, `Delete entry ${ctx.args[2]} from "${ctx.args[1]}"?`)) return;

  await apiRequest("/api/resumes/delete_entry", "DELETE", undefined, {
    resumeId: ctx.args[0], sectionId: ctx.args[1], entryId: ctx.args[2],
  });

  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Entry ${ctx.args[2]} deleted from "${ctx.args[1]}".`);
}

export async function listEntries(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv entry list <resume_id> <section>");
  requireArg(ctx.args[1], "Usage: flowcv entry list <resume_id> <section>");

  const res = await apiRequest<{ resume: Record<string, unknown> }>(`/api/resumes/${ctx.args[0]}`);
  const content = res.data.resume.content as Record<string, unknown> | undefined;
  const sectionData = content?.[ctx.args[1]] as { entries?: Record<string, unknown>[] } | undefined;

  if (!sectionData?.entries?.length) {
    if (ctx.json) printJSON([]);
    else console.log(`No entries in section "${ctx.args[1]}".`);
    return;
  }
  printJSON(sectionData.entries);
}

export async function reorder(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv entry reorder <resume_id> <section> --data '[...]'");
  requireArg(ctx.args[1], "Usage: flowcv entry reorder <resume_id> <section> --data '[...]'");
  const entryIds = parseJSONFlag<string[]>(ctx.flags.data);

  await apiRequest("/api/resumes/save_entries_order", "PATCH", {
    resumeId: ctx.args[0], sectionId: ctx.args[1], newEntriesIdsOrder: entryIds,
  });

  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Entries reordered in "${ctx.args[1]}".`);
}
