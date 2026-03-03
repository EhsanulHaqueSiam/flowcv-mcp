#!/usr/bin/env node
/**
 * FlowCV CLI — command-line interface for the FlowCV resume builder.
 */

import { printError } from "./cli/output.js";
import type { CLIContext } from "./cli/types.js";

const VERSION = "1.0.0";

function parseArgs(argv: string[]): { command: string; sub: string; ctx: CLIContext } {
  const raw = argv.slice(2);
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        const next = raw[i + 1];
        if (next && !next.startsWith("--")) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    } else {
      args.push(arg);
    }
  }

  const command = args[0] || "";
  const sub = args[1] || "";
  // For top-level commands (publish, unpublish, download-btn), sub is the first arg
  const restArgs = args.slice(2);

  return {
    command,
    sub,
    ctx: {
      args: restArgs,
      flags,
      json: flags.json === true,
      quiet: !!flags.quiet || !!flags.q || !!flags.yes || !!flags.y,
    },
  };
}

function printHelp(command?: string): void {
  if (command === "resume") {
    console.log(`Usage: flowcv resume <subcommand>

  list                          List all resumes
  get <id>                      Get full resume data (JSON)
  create [--title "..."]        Create blank resume
  duplicate <id>                Duplicate resume
  rename <id> "New Title"       Rename resume
  delete <id>                   Delete resume
  download <id>                 Download PDF
  translate <id> <lang>         Translate resume`);
  } else if (command === "entry") {
    console.log(`Usage: flowcv entry <subcommand>

  add <resume_id> <section> --data '{...}'
  update <resume_id> <section> <entry_id> --data '{...}'
  delete <resume_id> <section> <entry_id>
  list <resume_id> <section>
  reorder <resume_id> <section> --data '["id1","id2",...]'`);
  } else if (command === "personal") {
    console.log(`Usage: flowcv personal <subcommand>

  set <resume_id> --data '{...}'    Set personal details
  get <resume_id>                   Get personal details`);
  } else if (command === "design") {
    console.log(`Usage: flowcv design <subcommand>

  set <resume_id> <path> <value>     Set a design property
  get <resume_id> [path]             Get design (or specific path)
  bulk <resume_id> --data '[...]'    Bulk update design`);
  } else if (command === "section") {
    console.log(`Usage: flowcv section <subcommand>

  rename <resume_id> <section> "New Name"
  icon <resume_id> <section> <icon_key>
  type <resume_id> <section> <type>
  delete <resume_id> <section>`);
  } else if (command === "letter") {
    console.log(`Usage: flowcv letter <subcommand>

  list                                   List cover letters
  get <id>                               Get full letter data
  create [--title "..."]                 Create cover letter
  body <id> --html "..."                 Set body text
  recipient <id> --data '{...}'          Set recipient
  date <id> [--today | --custom "..."]   Set date
  design <id> --data '{...}'             Set design
  personal <id> --data '{...}'           Set personal details
  sync <id> <resume_id>                  Sync with resume
  duplicate <id>                         Duplicate
  delete <id>                            Delete
  download <id>                          Download PDF`);
  } else if (command === "tracker") {
    console.log(`Usage: flowcv tracker <subcommand>

  list                                   List tracker boards
  add-card <tracker_id> --data '{...}'   Add/update card
  columns <tracker_id> --data '[...]'    Update columns`);
  } else if (command === "ai") {
    console.log(`Usage: flowcv ai <subcommand>

  fill "prompt text"            Generate resume with AI
  suggest-skills <resume_id>    AI skill suggestions
  grammar <resume_id>           AI grammar check`);
  } else if (command === "image") {
    console.log(`Usage: flowcv image <subcommand>

  search "query"                     Search Unsplash images
  set <resume_id> --data '{...}'     Set background image`);
  } else {
    console.log(`FlowCV CLI v${VERSION}

Usage: flowcv <command> [subcommand] [options]

Auth:
  login [--paste]         Log in (Chrome auto-login or manual paste)
  logout                  Clear stored session
  status                  Show auth status + user info
  whoami                  Print current user email

Resumes:
  resume <sub>            Manage resumes (list, get, create, duplicate, rename, delete, download, translate)
  entry <sub>             Manage section entries (add, update, delete, list, reorder)
  personal <sub>          Personal details (set, get)
  design <sub>            Design customization (set, get, bulk)
  section <sub>           Section management (rename, icon, type, delete)

Templates & Publishing:
  template <sub>          Templates (list, apply)
  publish <id>            Publish resume to web
  unpublish <id>          Take resume offline
  download-btn <id> [on|off]  Toggle download button
  lang set <id> <code>    Set resume language
  tags set <id> --data    Set resume tags

Cover Letters:
  letter <sub>            Manage cover letters

Job Tracker:
  tracker <sub>           Manage job tracker

AI Features:
  ai <sub>                AI features (fill, suggest-skills, grammar)

Images:
  image <sub>             Unsplash images (search, set)

Options:
  --json                  Output raw JSON
  --data '{...}'          Pass JSON data payload
  --quiet, -q, --yes, -y  Skip confirmations
  --version               Print version
  --help                  Show help

Run "flowcv help <command>" for details on a specific command.`);
  }
}

async function main(): Promise<void> {
  const { command, sub, ctx } = parseArgs(process.argv);

  if (ctx.flags.version) {
    console.log(VERSION);
    return;
  }

  if (ctx.flags.help || command === "help") {
    printHelp(sub || (ctx.args[0] as string));
    return;
  }

  try {
    switch (command) {
      case "login": case "logout": case "status": case "whoami": {
        const auth = await import("./cli/commands/auth.js");
        const handler = auth[command as keyof typeof auth];
        await handler(ctx);
        break;
      }

      case "resume": {
        const resume = await import("./cli/commands/resume.js");
        switch (sub) {
          case "list": case "ls": await resume.list(ctx); break;
          case "get": await resume.get(ctx); break;
          case "create": await resume.create(ctx); break;
          case "duplicate": case "dup": await resume.duplicate(ctx); break;
          case "rename": await resume.rename(ctx); break;
          case "delete": case "rm": await resume.del(ctx); break;
          case "download": case "dl": await resume.download(ctx); break;
          case "translate": await resume.translate(ctx); break;
          default: printHelp("resume"); break;
        }
        break;
      }

      case "entry": {
        const entry = await import("./cli/commands/entry.js");
        switch (sub) {
          case "add": await entry.add(ctx); break;
          case "update": await entry.update(ctx); break;
          case "delete": case "rm": await entry.del(ctx); break;
          case "list": case "ls": await entry.listEntries(ctx); break;
          case "reorder": await entry.reorder(ctx); break;
          default: printHelp("entry"); break;
        }
        break;
      }

      case "personal": {
        const personal = await import("./cli/commands/personal.js");
        switch (sub) {
          case "set": await personal.set(ctx); break;
          case "get": await personal.get(ctx); break;
          default: printHelp("personal"); break;
        }
        break;
      }

      case "design": {
        const design = await import("./cli/commands/design.js");
        switch (sub) {
          case "set": await design.set(ctx); break;
          case "get": await design.get(ctx); break;
          case "bulk": await design.bulk(ctx); break;
          default: printHelp("design"); break;
        }
        break;
      }

      case "section": {
        const section = await import("./cli/commands/section.js");
        switch (sub) {
          case "rename": await section.rename(ctx); break;
          case "icon": await section.icon(ctx); break;
          case "type": await section.type(ctx); break;
          case "delete": case "rm": await section.del(ctx); break;
          default: printHelp("section"); break;
        }
        break;
      }

      case "template": {
        const tmpl = await import("./cli/commands/template.js");
        switch (sub) {
          case "list": case "ls": await tmpl.templateList(ctx); break;
          case "apply": await tmpl.templateApply(ctx); break;
          default: console.log("Usage: flowcv template <list|apply>"); break;
        }
        break;
      }

      case "publish": case "unpublish": case "download-btn": {
        const pub = await import("./cli/commands/publish.js");
        const publishArgs = sub ? [sub, ...ctx.args] : ctx.args;
        const publishCtx = { ...ctx, args: publishArgs };
        if (command === "publish") await pub.publish(publishCtx);
        else if (command === "unpublish") await pub.unpublish(publishCtx);
        else await pub.downloadBtn(publishCtx);
        break;
      }

      case "lang": {
        if (sub === "set") {
          const { langSet } = await import("./cli/commands/template.js");
          await langSet(ctx);
        } else {
          console.log("Usage: flowcv lang set <resume_id> <lang_code>");
        }
        break;
      }

      case "tags": {
        if (sub === "set") {
          const { tagsSet } = await import("./cli/commands/template.js");
          await tagsSet(ctx);
        } else {
          console.log("Usage: flowcv tags set <resume_id> --data '[...]'");
        }
        break;
      }

      case "letter": {
        const letter = await import("./cli/commands/letter.js");
        switch (sub) {
          case "list": case "ls": await letter.list(ctx); break;
          case "get": await letter.get(ctx); break;
          case "create": await letter.create(ctx); break;
          case "body": await letter.body(ctx); break;
          case "recipient": await letter.recipient(ctx); break;
          case "date": await letter.date(ctx); break;
          case "design": await letter.design(ctx); break;
          case "personal": await letter.personalDetails(ctx); break;
          case "sync": await letter.sync(ctx); break;
          case "duplicate": case "dup": await letter.duplicate(ctx); break;
          case "delete": case "rm": await letter.del(ctx); break;
          case "download": case "dl": await letter.download(ctx); break;
          default: printHelp("letter"); break;
        }
        break;
      }

      case "tracker": {
        const tracker = await import("./cli/commands/tracker.js");
        switch (sub) {
          case "list": case "ls": await tracker.list(ctx); break;
          case "add-card": await tracker.addCard(ctx); break;
          case "columns": await tracker.columns(ctx); break;
          default: printHelp("tracker"); break;
        }
        break;
      }

      case "ai": {
        const ai = await import("./cli/commands/ai.js");
        switch (sub) {
          case "fill": await ai.fill(ctx); break;
          case "suggest-skills": await ai.suggestSkills(ctx); break;
          case "grammar": await ai.grammar(ctx); break;
          default: printHelp("ai"); break;
        }
        break;
      }

      case "image": {
        const image = await import("./cli/commands/image.js");
        switch (sub) {
          case "search": await image.search(ctx); break;
          case "set": await image.setBackground(ctx); break;
          default: printHelp("image"); break;
        }
        break;
      }

      case "":
        printHelp();
        break;

      default:
        printError(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (ctx.json) {
      console.log(JSON.stringify({ error: msg }));
    } else {
      printError(msg);
    }
    process.exit(1);
  }
}

main();
