import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, requireArg, parseJSONFlag } from "../output.js";
import type { CLIContext } from "../types.js";

export async function search(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const query = ctx.args.join(" ");
  requireArg(query || undefined, 'Usage: flowcv image search "query"');
  const res = await apiRequest<Record<string, unknown>>(
    "/api/unsplash/search", "GET", undefined, { query }
  );
  printJSON(res.data);
}

export async function setBackground(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv image set <resume_id> --data '{...}'");
  const unsplashImage = parseJSONFlag(ctx.flags.data);
  await apiRequest("/api/resumes/save_unsplash_image", "PATCH", {
    resumeId: ctx.args[0], unsplashImage,
  });
  if (ctx.json) printJSON({ success: true });
  else printSuccess("Background image applied.");
}
