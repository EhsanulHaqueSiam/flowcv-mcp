---
name: flowcv-cli
description: >-
  CLI tool for FlowCV resume builder. Manage resumes, cover letters, design
  customization, templates, publishing, job tracker, and AI features — all via
  shell commands. Lighter context than the MCP skill.
allowed-tools:
  - Bash(flowcv *)
---

# FlowCV CLI

Use the `flowcv` command to manage FlowCV resumes and cover letters.

## Auth

```bash
flowcv login              # Auto-open Chrome, extract cookie
flowcv login --paste      # Manual cookie paste
flowcv logout             # Clear stored cookie
flowcv status             # Show auth status + user info
flowcv whoami             # Print email
```

## Resumes

```bash
flowcv resume list
flowcv resume get <id>
flowcv resume create [--title "..."]
flowcv resume duplicate <id>
flowcv resume rename <id> "New Title"
flowcv resume delete <id>
flowcv resume download <id>
flowcv resume translate <id> <lang>
```

## Section Entries

```bash
flowcv entry add <resume_id> <section> --data '{...}'
flowcv entry update <resume_id> <section> <entry_id> --data '{...}'
flowcv entry delete <resume_id> <section> <entry_id>
flowcv entry list <resume_id> <section>
flowcv entry reorder <resume_id> <section> --data '["id1","id2"]'
```

Section types: profile, education, skill, project, award, language, interest, reference, certificate, declaration, custom, custom2, custom3, custom4, customSkill1, customSkill2

## Personal Details

```bash
flowcv personal set <resume_id> --data '{"fullName":"...","jobTitle":"..."}'
flowcv personal get <resume_id>
```

## Design Customization

```bash
flowcv design set <resume_id> <path> <value>
flowcv design get <resume_id> [path]
flowcv design bulk <resume_id> --data '[{"path":"...","value":...}]'
```

Common paths: font.fontFamily, font.selected, colors.basic.single, spacing.fontSize, layout.detailsPosition, heading.style, header.nameSize, entryLayout.displayMode, skillDisplay.selected, pageFormat

## Sections

```bash
flowcv section rename <resume_id> <section> "New Name"
flowcv section icon <resume_id> <section> <icon_key>
flowcv section type <resume_id> <section> <type>
flowcv section delete <resume_id> <section>
```

## Templates

```bash
flowcv template list
flowcv template apply <resume_id> <template_id>
```

## Publishing

```bash
flowcv publish <resume_id>
flowcv unpublish <resume_id>
flowcv download-btn <resume_id> [on|off]
flowcv lang set <resume_id> <lang_code>
flowcv tags set <resume_id> --data '[{"id":"...","name":"...","hexColor":"#..."}]'
```

## Cover Letters

```bash
flowcv letter list
flowcv letter get <id>
flowcv letter create [--title "..."]
flowcv letter body <id> --html "..."
flowcv letter recipient <id> --data '{"hrName":"...","company":"..."}'
flowcv letter date <id> [--today | --custom "March 4, 2026"]
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
flowcv tracker add-card <tracker_id> --data '{...}'
flowcv tracker columns <tracker_id> --data '[...]'
```

## AI Features

```bash
flowcv ai fill "Senior React developer with 5 years experience"
flowcv ai suggest-skills <resume_id>
flowcv ai grammar <resume_id>
```

## Images

```bash
flowcv image search "abstract background"
flowcv image set <resume_id> --data '{...}'
```

## Output Modes

- Default: human-readable tables
- `--json`: raw JSON output (for scripting)
- `--quiet` / `-q` / `--yes` / `-y`: skip confirmations
