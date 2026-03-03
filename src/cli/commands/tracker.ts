import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function list(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const res = await apiRequest<{ trackers: Record<string, unknown>[] }>("/api/trackers/all");
  printJSON(res.data.trackers);
}

export async function addCard(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv tracker add-card <tracker_id> --data '{...}'");
  const card = parseJSONFlag(ctx.flags.data);
  await apiRequest("/api/trackers/save_card", "POST", { trackerId: ctx.args[0], card });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Card saved.");
}

export async function columns(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv tracker columns <tracker_id> --data '[...]'");
  const cols = parseJSONFlag<unknown[]>(ctx.flags.data);
  await apiRequest("/api/trackers/save_columns", "POST", { trackerId: ctx.args[0], columns: cols });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Tracker columns saved.");
}
