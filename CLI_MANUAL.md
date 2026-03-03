# FlowCV CLI Manual

Command-line interface for the [FlowCV](https://flowcv.com) resume builder.

## Installation

```bash
cd flowcv-mcp
npm install
npm run build
npm link          # Makes `flowcv` available globally
```

## Authentication

The CLI stores your session cookie at `~/.config/flowcv/config.json`.

### Auto Login (Chrome)

```bash
flowcv login
```

Opens Chrome, navigates to FlowCV login page, and automatically extracts the session cookie after you log in. Chrome closes automatically.

### Manual Login

```bash
flowcv login --paste
```

Prompts you to paste a cookie value manually. To get it:
1. Open https://app.flowcv.com and log in
2. DevTools (F12) > Application > Cookies > app.flowcv.com
3. Copy the `flowcvsidapp` value (starts with `s%3A...`)

### Other Auth Commands

```bash
flowcv logout      # Clear stored cookie
flowcv status      # Show auth status + user info
flowcv whoami      # Print current user email
```

### Cookie Priority

1. `FLOWCV_SESSION_COOKIE` environment variable
2. `~/.config/flowcv/config.json`
3. `.mcp.json` in current directory

## Resume Management

```bash
flowcv resume list                        # List all resumes
flowcv resume get <id>                    # Get full resume JSON
flowcv resume create [--title "My CV"]    # Create blank resume
flowcv resume duplicate <id>              # Duplicate resume
flowcv resume rename <id> "New Title"     # Rename
flowcv resume delete <id>                 # Delete (asks for confirmation)
flowcv resume download <id>              # Download PDF
flowcv resume translate <id> <lang>       # Translate (e.g., de, fr, es)
```

## Section Entries

Manage entries within resume sections (education, skills, projects, etc.).

```bash
flowcv entry add <resume_id> <section> --data '{
  "id": "optional-uuid",
  "degree": "B.Sc. Computer Science",
  "school": "MIT",
  "startDateNew": {"year":"2018","month":"9"},
  "endDateNew": {"year":"2022","month":"6"}
}'

flowcv entry update <resume_id> <section> <entry_id> --data '{
  "degree": "M.Sc. Computer Science"
}'

flowcv entry delete <resume_id> <section> <entry_id>
flowcv entry list <resume_id> <section>
flowcv entry reorder <resume_id> <section> --data '["id1","id2","id3"]'
```

### Section Types

| Section | Key Fields |
|---------|-----------|
| profile | text |
| education | degree, school, schoolLink, location, startDateNew, endDateNew, description |
| skill | skill, level, infoHtml |
| project | projectTitle, projectTitleLink, subTitle, startDateNew, endDateNew, description |
| award | awardTitle, awardTitleLink, issuer, date:{year,month}, description |
| language | language, level, infoHtml |
| interest | interest, interestLink, infoHtml |
| reference | name, nameLink, jobTitle, organisation, email, phone |
| custom* | title, titleLink, subTitle, location, startDateNew, endDateNew, description |

## Personal Details

```bash
flowcv personal set <resume_id> --data '{
  "fullName": "Jane Doe",
  "jobTitle": "Software Engineer",
  "displayEmail": "jane@example.com",
  "phone": "+1 555-0100"
}'

flowcv personal get <resume_id>
```

## Design Customization

### Set Individual Properties

```bash
flowcv design set <id> font.fontFamily "Inter"
flowcv design set <id> colors.basic.single "#2563eb"
flowcv design set <id> spacing.fontSize 3
flowcv design set <id> heading.style "line"
flowcv design set <id> layout.detailsPosition "left"
```

### Get Current Design

```bash
flowcv design get <id>                    # Full customization object
flowcv design get <id> font               # Just font settings
flowcv design get <id> colors.basic       # Just basic colors
```

### Bulk Update

```bash
flowcv design bulk <id> --json '[
  {"path": "font.fontFamily", "value": "Inter"},
  {"path": "colors.basic.single", "value": "#2563eb"},
  {"path": "heading.style", "value": "line"}
]'
```

## Section Management

```bash
flowcv section rename <id> skill "Technical Skills"
flowcv section icon <id> education "book"
flowcv section type <id> custom "experience"
flowcv section delete <id> custom2
```

## Templates

```bash
flowcv template list                      # List custom templates
flowcv template apply <id> <template_id>  # Apply template
```

## Publishing

```bash
flowcv publish <id>                       # Publish to web
flowcv unpublish <id>                     # Take offline
flowcv download-btn <id> on              # Enable download button
flowcv download-btn <id> off             # Disable download button
```

## Language & Tags

```bash
flowcv lang set <id> en                   # Set resume language
flowcv tags set <id> --data '[{"id":"t1","name":"Tech","hexColor":"#3b82f6"}]'
```

## Cover Letters

```bash
flowcv letter list
flowcv letter get <id>
flowcv letter create [--title "Application Letter"]
flowcv letter body <id> --html "<p>Dear hiring manager...</p>"
flowcv letter recipient <id> --data '{"hrName":"John","company":"Acme Inc"}'
flowcv letter date <id> --today
flowcv letter date <id> --custom "March 4, 2026"
flowcv letter design <id> --data '{...}'
flowcv letter personal <id> --data '{...}'
flowcv letter sync <id> <resume_id>
flowcv letter duplicate <id>
flowcv letter delete <id>
flowcv letter download <id>
```

## Job Tracker

```bash
flowcv tracker list
flowcv tracker add-card <tracker_id> --data '{"title":"Frontend Dev","company":"Acme"}'
flowcv tracker columns <tracker_id> --data '[{"id":"c1","name":"Applied","cardIds":["..."]}]'
```

## AI Features

```bash
flowcv ai fill "Senior React developer with 5 years experience"
flowcv ai suggest-skills <resume_id>
flowcv ai grammar <resume_id>
```

## Unsplash Images

```bash
flowcv image search "abstract gradient"
flowcv image set <resume_id> --data '{...}'   # Use image from search results
```

## Output Modes

| Flag | Effect |
|------|--------|
| *(none)* | Human-readable tables and formatted text |
| `--json` | Raw JSON output for scripting/AI |
| `--quiet` / `-q` / `--yes` / `-y` | Minimal output, skip confirmations |

## Examples

```bash
# Quick workflow: create resume, add skills, set font, download
flowcv resume create --title "My Resume"
flowcv entry add <id> skill --data '{"skill":"TypeScript","level":"5"}'
flowcv entry add <id> skill --data '{"skill":"React","level":"4"}'
flowcv design set <id> font.fontFamily "Inter"
flowcv resume download <id>

# List resumes as JSON (for scripting)
flowcv resume list --json | jq '.[].id'

# Batch design changes
flowcv design bulk <id> --json '[
  {"path":"font.fontFamily","value":"Poppins"},
  {"path":"colors.basic.single","value":"#059669"},
  {"path":"heading.style","value":"box"},
  {"path":"spacing.fontSize","value":"3"}
]'
```
