import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printTable, printJSON, confirmOrCancel, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function list(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const res = await apiRequest<{ letters: Record<string, unknown>[] }>("/api/letters/all");
  const letters = res.data.letters;

  if (ctx.json) { printJSON(letters); return; }
  if (letters.length === 0) { console.log("No cover letters found."); return; }

  printTable(
    ["ID", "Title", "Synced Resume", "Last Changed"],
    letters.map(l => [
      String(l.id), String(l.title || "Untitled"),
      String(l.syncWithResumeId || "None"), String(l.lastChangeAt || ""),
    ])
  );
}

export async function get(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter get <id>");
  const res = await apiRequest<{ letter: Record<string, unknown> }>(`/api/letters/${ctx.args[0]}`);
  printJSON(res.data.letter);
}

export async function create(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const title = (ctx.flags.title as string) || "Untitled Letter";
  const res = await apiRequest<{ letter: Record<string, unknown> }>(
    "/api/letters/create", "POST", { clientLetter: { title } }
  );
  if (ctx.json) printJSON(res.data.letter);
  else printSuccess(`Cover letter created: ${res.data.letter.id}`);
}

export async function body(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter body <id> --html '...'");
  requireArg(ctx.flags.html as string | undefined, "--html flag is required.");
  await apiRequest("/api/letters/save_body", "POST", { letterId: ctx.args[0], body: ctx.flags.html });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Cover letter body saved.");
}

export async function recipient(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter recipient <id> --data '{...}'");
  const data = parseJSONFlag(ctx.flags.data);
  await apiRequest("/api/letters/save_recipient", "POST", { letterId: ctx.args[0], recipient: data });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Recipient saved.");
}

export async function date(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter date <id> [--today | --custom '...']");
  let dateObj: Record<string, unknown>;
  if (ctx.flags.custom) dateObj = { mode: "custom", custom: ctx.flags.custom as string };
  else dateObj = { mode: "today" };

  await apiRequest("/api/letters/save_date", "POST", { letterId: ctx.args[0], date: dateObj });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Date saved.");
}

export async function design(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter design <id> --data '{...}'");
  const data = parseJSONFlag(ctx.flags.data);
  await apiRequest("/api/letters/save-design", "POST", { letterId: ctx.args[0], design: data });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Cover letter design saved.");
}

export async function sync(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter sync <letter_id> <resume_id>");
  requireArg(ctx.args[1], "Usage: flowcv letter sync <letter_id> <resume_id>");
  await apiRequest("/api/letters/save-design", "POST", {
    letterId: ctx.args[0], syncWithResumeId: ctx.args[1],
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Letter synced with resume ${ctx.args[1]}.`);
}

export async function duplicate(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter duplicate <id>");
  const res = await apiRequest<{ letter: Record<string, unknown> }>(
    "/api/letters/duplicate", "POST", { duplicateId: ctx.args[0] }
  );
  if (ctx.json) printJSON(res.data.letter);
  else printSuccess(`Duplicated. New ID: ${res.data.letter.id}`);
}

export async function del(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter delete <id>");
  if (!await confirmOrCancel(ctx.quiet, `Delete cover letter ${ctx.args[0]}?`)) return;
  await apiRequest("/api/letters/delete_letter", "DELETE", undefined, { letterId: ctx.args[0] });
  if (ctx.json) printJSON({ success: true });
  else printSuccess(`Cover letter ${ctx.args[0]} deleted.`);
}

export async function download(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter download <id>");
  const res = await apiRequest<Record<string, unknown>>(
    "/api/letters/download", "POST", { letterId: ctx.args[0] }
  );
  printJSON(res.data);
}

export async function personalDetails(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv letter personal <id> --data '{...}'");
  const pd = parseJSONFlag(ctx.flags.data);
  await apiRequest("/api/letters/save_personal_details", "PATCH", {
    letterId: ctx.args[0], personalDetails: pd,
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Personal details saved on cover letter.");
}
