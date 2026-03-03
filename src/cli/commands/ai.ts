import { apiRequest } from "../../api-client.js";
import { ensureAuth } from "../auth-flow.js";
import { printSuccess, printJSON, requireArg } from "../output.js";
import type { CLIContext } from "../types.js";

export async function fill(ctx: CLIContext): Promise<void> {
  ensureAuth();
  const prompt = ctx.args.join(" ");
  requireArg(prompt || undefined, 'Usage: flowcv ai fill "prompt text"');
  const res = await apiRequest<{ resume: Record<string, unknown> }>(
    "/api/resumes/fill-resume-with-ai", "POST",
    { prompt, clientResume: {}, resumeId: null }
  );
  if (ctx.json) printJSON(res.data.resume);
  else printSuccess(`AI resume created: ${res.data.resume.id} — "${res.data.resume.title}"`);
}

export async function suggestSkills(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv ai suggest-skills <resume_id>");
  const res = await apiRequest<Record<string, unknown>>(
    "/api/ai/skills/suggest", "POST", { resumeId: ctx.args[0] }
  );
  printJSON(res.data);
}

export async function grammar(ctx: CLIContext): Promise<void> {
  ensureAuth();
  requireArg(ctx.args[0], "Usage: flowcv ai grammar <resume_id>");
  const res = await apiRequest<Record<string, unknown>>(
    "/api/ai/tools/grammar", "POST", { resumeId: ctx.args[0] }
  );
  printJSON(res.data);
}
