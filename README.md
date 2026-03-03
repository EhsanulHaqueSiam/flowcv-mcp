# FlowCV MCP Server + CLI

MCP (Model Context Protocol) server and CLI tool that gives AI assistants full control over [FlowCV](https://flowcv.com) — the resume builder. 50 MCP tools + a full CLI covering everything from writing content to pixel-level design customization.

Includes a **Claude Code skill** so Claude automatically knows how to use every tool, and a **CLI tool** (`flowcv`) for direct terminal usage.

## What Can It Do?

**Resume Management** — Create, duplicate, rename, delete, download PDF, translate to 20+ languages

**Content Editing** — Edit every section: profile summary, education, experience, skills, projects, awards, languages, interests, references, and up to 4 custom sections. Add/remove/reorder entries, rename section headings, set icons.

**Design Customization** — Full control over fonts, colors (single/multi/advanced), spacing (font size, line height, margins), page format (A4/Letter), layout (top/left/right details, 1-2 columns), heading styles (box/line/simple), entry layout, skill/language display modes (grid/level/text), accent color targeting, footer options, list styles, link icons.

**Cover Letters** — Full CRUD + body editing, recipient, date, personal details, design, download PDF.

**Job Tracker** — Kanban boards with columns and cards for tracking applications.

**AI Features** — AI-generated resumes, skill suggestions, grammar check (uses FlowCV AI credits).

**Publishing** — Publish resumes as web pages, toggle download buttons, share as templates.

**Images** — Search Unsplash and apply background images for creative templates.

## About Authentication (Cookie-Based)

FlowCV does not offer a public API or OAuth/API-key authentication. The only known way to interact with FlowCV programmatically is through the session cookie (`flowcvsidapp`) that the FlowCV web app sets when you log in.

This project uses that session cookie for authentication. If there were a better way (API keys, OAuth, etc.), we would use it — but as of now, this is the only option.

### How the CLI handles it

The `flowcv login` command launches Chrome, navigates to the FlowCV login page, and waits for you to log in. Once logged in, it automatically extracts the `flowcvsidapp` cookie via Chrome DevTools Protocol (CDP) and stores it securely at `~/.config/flowcv/config.json` (with `0600` file permissions).

If Chrome is not available, it falls back to manual paste mode where you copy the cookie from browser DevTools yourself.

### Security notes

- The cookie is stored with restricted file permissions (`0600` — owner read/write only)
- The config directory is created with `0700` permissions
- Cookies expire periodically and need to be refreshed (just run `flowcv login` again)
- The `.mcp.json` file (which may contain the cookie for MCP server usage) is in `.gitignore`

## Quick Start

### Option A: One-Command Setup

```bash
git clone https://github.com/EhsanulHaqueSiam/flowcv-mcp.git
cd flowcv-mcp
./setup.sh
```

This will:
- Install dependencies and build the server
- Install the Claude Code skill to `~/.claude/skills/flowcv/`
- Prompt for your session cookie
- Create `.mcp.json` with the server config

If you already have your cookie:

```bash
./setup.sh 's%3Ayour-cookie-value-here'
```

### Option B: Let Claude Do It

Paste this into Claude Code and it handles everything:

```
Set up the FlowCV MCP server from this repo. Run ./setup.sh to build the server and install the
Claude Code skill. I'll provide my flowcvsidapp cookie when prompted. After setup, test the
connection with flowcv_get_user and flowcv_list_resumes, then show me what tools are available.
```

See [SETUP_PROMPT.md](SETUP_PROMPT.md) for more detailed prompts.

### Option C: Manual Setup

#### 1. Clone & Build

```bash
git clone https://github.com/EhsanulHaqueSiam/flowcv-mcp.git
cd flowcv-mcp
npm install
npm run build
```

#### 2. Install the Claude Code Skill

```bash
cp -r skill/ ~/.claude/skills/flowcv/
```

#### 3. Get Your Session Cookie

FlowCV has no public API — this server uses your session cookie for auth.

1. Go to [app.flowcv.com](https://app.flowcv.com) and log in
2. Open DevTools (`F12`) → **Application** → **Cookies** → `app.flowcv.com`
3. Find `flowcvsidapp` and copy its **Value** (starts with `s%3A...`)

#### 4. Configure MCP

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "flowcv": {
      "command": "node",
      "args": ["/absolute/path/to/flowcv-mcp/dist/index.js"],
      "env": {
        "FLOWCV_SESSION_COOKIE": "s%3Ayour-cookie-value-here"
      }
    }
  }
}
```

Or add it globally in `~/.claude/settings.json` under `mcpServers`.

### 5. Use It

Ask Claude things like:

- *"List my FlowCV resumes"*
- *"Add a new skill 'TypeScript' with expert level to my resume"*
- *"Change the font to Inter and accent color to blue"*
- *"Download my resume as PDF"*
- *"Create a cover letter for the Software Engineer position at Google"*

## What Gets Installed

| Component | Location | Purpose |
|-----------|----------|---------|
| MCP Server | `./dist/index.js` | The 49-tool server that talks to FlowCV |
| MCP Config | `./.mcp.json` | Tells Claude Code how to start the server |
| Claude Skill | `~/.claude/skills/flowcv/` | Teaches Claude the API, customization paths, and workflows |

The **skill** gives Claude built-in knowledge of all FlowCV tools, entry schemas, customization paths, and API endpoints — so it can use the MCP tools effectively without you having to explain the API.

## CLI Tool

The `flowcv` CLI provides the same operations as the MCP server, but as shell commands.

### Install

```bash
npm install
npm run build
npm link    # Makes `flowcv` available globally
```

### Login

```bash
flowcv login           # Opens Chrome, extracts cookie automatically
flowcv login --paste   # Manual cookie paste mode
```

### Usage Examples

```bash
flowcv resume list                    # List all resumes
flowcv resume list --json             # JSON output for scripting
flowcv resume create --title "My CV"  # Create new resume
flowcv resume download <id>           # Download PDF

flowcv entry add <id> skill --data '{"skill":"TypeScript","level":"5"}'
flowcv design set <id> font.fontFamily "Inter"
flowcv design set <id> colors.basic.single "#2563eb"

flowcv letter list                    # List cover letters
flowcv letter body <id> --html "<p>Dear hiring manager...</p>"

flowcv ai fill "Senior React developer with 5 years experience"
```

See [CLI_MANUAL.md](CLI_MANUAL.md) for the full command reference.

## All 49 Tools

### Session Management

| Tool | Description |
|------|-------------|
| `flowcv_check_auth` | Check if the current session cookie is valid and return user info |
| `flowcv_update_cookie` | Hot-swap the session cookie at runtime without restarting the server |

### Account & Auth

| Tool | Description |
|------|-------------|
| `flowcv_get_user` | Get user profile including email, plan, AI credits, and account details |
| `flowcv_get_subscription` | Get subscription details including plan, billing interval, and validity |

### Resume Management

| Tool | Description |
|------|-------------|
| `flowcv_list_resumes` | List all resumes with IDs, titles, web publish status, and last change date |
| `flowcv_get_resume` | Get complete resume data — all sections, entries, personal details, and customization |
| `flowcv_create_resume` | Create a new blank resume (free plan limited to 2) |
| `flowcv_duplicate_resume` | Create a copy of an existing resume |
| `flowcv_rename_resume` | Change the title of a resume |
| `flowcv_delete_resume` | Permanently delete a resume |
| `flowcv_download_resume` | Download a resume as PDF |
| `flowcv_translate_resume` | Create a translated copy of a resume in a target language |

### Content Editing

| Tool | Description |
|------|-------------|
| `flowcv_save_personal_details` | Update name, job title, email, phone, address, photo, and social links |
| `flowcv_save_entry` | Create or update an entry in any section (education, skill, project, etc.) |
| `flowcv_delete_entry` | Remove a specific entry from a section |
| `flowcv_save_entries_order` | Change the display order of entries within a section |
| `flowcv_save_section_name` | Rename a section heading (e.g., "Skills" → "Technical Skills") |
| `flowcv_save_section_icon` | Set the icon for a section heading |
| `flowcv_update_section_type` | Change the type of a custom section |
| `flowcv_delete_section` | Remove an entire section and all its entries |

### Design Customization

| Tool | Description |
|------|-------------|
| `flowcv_save_customization` | Update specific design settings via dot-path (e.g., `font.fontFamily`, `colors.basic.single`) |
| `flowcv_save_all_customizations` | Replace the entire customization object for bulk design changes |

### Templates

| Tool | Description |
|------|-------------|
| `flowcv_apply_template` | Apply a design template to a resume |
| `flowcv_list_templates` | List user's custom templates from the template library |

### Publishing & Sharing

| Tool | Description |
|------|-------------|
| `flowcv_publish_web_resume` | Publish or unpublish a resume as a public web page |
| `flowcv_enable_download_button` | Toggle the download button on the published web resume |
| `flowcv_share_template` | Share your resume design as a public or private template |
| `flowcv_unshare_template` | Stop sharing a resume template publicly |

### Language & Tags

| Tool | Description |
|------|-------------|
| `flowcv_save_language` | Set the resume language (affects date formats and section labels) |
| `flowcv_save_tags` | Assign color tags to a resume for organization |

### Cover Letters

| Tool | Description |
|------|-------------|
| `flowcv_list_letters` | List all cover letters in the account |
| `flowcv_get_letter` | Get full cover letter data including body, recipient, and design |
| `flowcv_create_letter` | Create a new cover letter |
| `flowcv_save_letter_body` | Write or update the main body text (supports HTML) |
| `flowcv_save_letter_recipient` | Set hiring manager name, company, and address |
| `flowcv_save_letter_date` | Set the cover letter date |
| `flowcv_save_letter_personal_details` | Update sender's personal details on the letter |
| `flowcv_save_letter_design` | Update the cover letter styling and design |
| `flowcv_sync_letter_with_resume` | Link a cover letter to a resume so they share personal details |
| `flowcv_duplicate_letter` | Create a copy of an existing cover letter |
| `flowcv_delete_letter` | Permanently delete a cover letter |
| `flowcv_download_letter` | Download a cover letter as PDF |

### Job Tracker

| Tool | Description |
|------|-------------|
| `flowcv_list_trackers` | List all job tracker boards with columns and cards |
| `flowcv_save_tracker_card` | Create or update a job application card in a tracker |
| `flowcv_save_tracker_columns` | Update columns and card assignments in a tracker board |

### AI Features

| Tool | Description |
|------|-------------|
| `flowcv_fill_resume_with_ai` | Generate a full resume from a text prompt (uses AI credits) |
| `flowcv_ai_suggest_skills` | Get AI-powered skill suggestions for a resume |
| `flowcv_ai_grammar_check` | Run AI grammar check on resume content |

### Unsplash Images

| Tool | Description |
|------|-------------|
| `flowcv_search_unsplash` | Search Unsplash for background images |
| `flowcv_save_unsplash_image` | Apply an Unsplash image as the resume background |

## Customization Paths

The `flowcv_save_customization` tool accepts dot-separated paths for granular design changes:

```
font.fontFamily                → "Inter", "Roboto", "Arial", ...
colors.basic.single            → "#2563eb" (hex color)
colors.border.single           → hex color (border)
spacing.fontSize               → "1" to "5"
layout.detailsPosition         → "top", "left", "right"
layout.colsFromDetails.top     → "one", "two", "mix"
heading.style                  → "simple", "line", "topBottomLine", "box", "underline",
                                  "thinLine", "thickShortUnderline", "zigZagLine"
heading.icons                  → "none", "outline", "filled"
header.jobTitlePosition        → "below", "sameLine"
header.iconFrame               → "none", "circle", "square"
header.photo.grayscale         → true/false
entryLayout.displayMode        → "dateLocationLeft", "dateLocationRight", "dateContentLocation"
entryLayout.bodyIndentation    → true/false
skillDisplay.selected          → "grid", "level", "text"
skillDisplay.level.selected    → "bar", "dots", "bubbles"
certificateDisplay.selected    → "grid", "level", "text"
declarationDisplay.showSignature → true/false
educationDisplay.degreeFirst   → true/false
workDisplay.titleFirst         → true/false
applyAccentColor.headings      → true/false
applyAccentColor.dotsBarsBubbles → true/false
expert.subTitlePlacement       → "sameLine", "below"
advanced.listStyle             → "bullet", "dash", "circle", "none"
advanced.underlineLinks        → true/false
advanced.groupPromotions       → true/false
pageFormat                     → "A4", "letter"
sectionOrder.one               → [...section keys]
sectionOrder.two               → {left: [...], right: [...]}
```

See the full list in `skill/references/customization-guide.md`.

## Section Entry Fields

| Section | Key Fields |
|---------|-----------|
| Profile | `text` |
| Education | `degree`, `school`, `location`, `startDateNew`, `endDateNew`, `description` |
| Experience | `title`, `subTitle`, `location`, `startDateNew`, `endDateNew`, `description` |
| Skills | `skill`, `level`, `infoHtml` |
| Projects | `projectTitle`, `subTitle`, `description` |
| Awards | `awardTitle`, `issuer`, `date`, `description` |
| Languages | `language`, `level`, `infoHtml` |
| Interests | `interest`, `interestLink`, `infoHtml` |
| References | `name`, `jobTitle`, `organisation`, `email`, `phone` |
| Certificates | `certificate`, `certificateLink`, `infoHtml` |
| Declarations | `fullName`, `place`, `date`, `declarationText`, `signatureDataUrl` |

Dates use: `{year: "2024", month: "6", present: false}`
Descriptions support HTML: `<p>`, `<strong>`, `<ul><li>`, `<a href>`

## Free vs Pro

| Feature | Free | Pro |
|---------|------|-----|
| Resumes | 2 | Unlimited |
| Templates | Basic | All |
| AI Features | No credits | Included |
| PDF Download | Watermark | Clean |
| Web Resume | Yes | Yes |

## Cookie Expiry — Handled Automatically

Session cookies expire periodically. When that happens:

1. Any tool call returns a `SESSION_EXPIRED` error with clear instructions
2. Claude knows to ask you for a fresh cookie (or extract it from Chromium CDP if available)
3. You paste the new cookie → Claude calls `flowcv_update_cookie` → everything works again, **no server restart needed**
4. The new cookie is persisted to `.mcp.json` so it survives restarts

The server also works if started **without** a cookie — it just can't make API calls until you provide one via `flowcv_update_cookie`.

## Tech Stack

- TypeScript + Node.js 18+
- `@modelcontextprotocol/sdk` for MCP protocol
- `zod` for input validation
- `chrome-launcher` for automated cookie extraction (CLI)
- Native `fetch` for HTTP requests
- Native `WebSocket` for Chrome DevTools Protocol (Node 22+)
- stdio transport (MCP server)

## License

MIT
