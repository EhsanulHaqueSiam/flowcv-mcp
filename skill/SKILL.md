---
name: flowcv
description: >-
  MCP server for FlowCV resume builder (flowcv.com). 50 tools for full resume lifecycle:
  create, edit, customize, download, publish, translate, delete resumes and cover letters.
  All content sections (education, skills, projects, experience, etc.), granular design
  customization (fonts, colors, spacing, layout, headings, entry display, skill display,
  footer, page format), job tracker boards, AI features, template management, Unsplash images.
  Use when user wants to: (1) create or edit a FlowCV resume or cover letter,
  (2) customize resume design (fonts, colors, layout, spacing, headings, icons),
  (3) manage FlowCV account (list resumes, check subscription, download PDFs),
  (4) use FlowCV job tracker, (5) publish/share resumes on the web,
  (6) translate resumes, (7) apply or share templates, (8) use FlowCV AI features.
  Triggers: "FlowCV", "flowcv", "resume builder", "cover letter builder",
  "edit my resume on FlowCV", "customize my FlowCV resume", "download resume PDF".
---

# FlowCV MCP Server

Manage FlowCV resumes, cover letters, and job trackers through 50 MCP tools.

## Setup

### 1. Install and Build

```bash
# Clone or copy the MCP server source
cd <project-directory>
npm install
npm run build
```

### 2. Get Session Cookie

FlowCV uses cookie-based auth. Extract your `flowcvsidapp` cookie:

1. Log in to https://app.flowcv.com
2. Open DevTools (F12) > Application > Cookies > `app.flowcv.com`
3. Copy the full `flowcvsidapp` cookie value (starts with `s%3A...`)

### 3. Configure MCP

Add to your `.mcp.json` or Claude Code settings:

```json
{
  "mcpServers": {
    "flowcv": {
      "command": "node",
      "args": ["<path-to>/dist/index.js"],
      "env": {
        "FLOWCV_SESSION_COOKIE": "<your-flowcvsidapp-cookie-value>"
      }
    }
  }
}
```

## Tool Categories

### Session Management (2 tools)
- `flowcv_check_auth` - Check if cookie is valid. Call first on SESSION_EXPIRED errors
- `flowcv_update_cookie` - Hot-swap the session cookie at runtime (no restart needed). Also persists to .mcp.json

When any tool returns a `SESSION_EXPIRED` or `NO_COOKIE` error, guide the user to get a fresh cookie from DevTools, then call `flowcv_update_cookie`. The server does NOT need to restart.

### Account (2 tools)
- `flowcv_get_user` - Get user profile, plan, AI credits
- `flowcv_get_subscription` - Get subscription status and billing info

### Resume Management (8 tools)
- `flowcv_list_resumes` - List all resumes with IDs and metadata
- `flowcv_get_resume` - Get full resume data (sections, entries, customization)
- `flowcv_create_resume` - Create blank resume (free plan: max 2)
- `flowcv_duplicate_resume` - Copy an existing resume
- `flowcv_rename_resume` - Change resume title
- `flowcv_delete_resume` - Permanently delete resume
- `flowcv_download_resume` - Download as PDF
- `flowcv_translate_resume` - Create translated copy

### Content Editing (8 tools)
- `flowcv_save_personal_details` - Update name, email, phone, address, photo, social links
- `flowcv_save_entry` - Create/update section entries (education, skill, project, etc.)
- `flowcv_delete_entry` - Remove an entry from a section
- `flowcv_save_entries_order` - Reorder entries within a section
- `flowcv_save_section_name` - Rename a section heading
- `flowcv_save_section_icon` - Set section icon
- `flowcv_update_section_type` - Change custom section type
- `flowcv_delete_section` - Remove entire section

### Design Customization (2 tools)
- `flowcv_save_customization` - Granular updates via dot-path (e.g., `font.fontFamily`, `colors.basic.single`)
- `flowcv_save_all_customizations` - Replace entire customization object

For full customization paths and values, see [references/customization-guide.md](references/customization-guide.md).

### Templates (2 tools)
- `flowcv_apply_template` - Apply a design template
- `flowcv_list_templates` - List user's custom templates

### Publishing (2 tools)
- `flowcv_publish_web_resume` - Publish/unpublish as web page
- `flowcv_enable_download_button` - Toggle download button on web resume

### Language & Tags (2 tools)
- `flowcv_save_language` - Set resume language (affects date formats)
- `flowcv_save_tags` - Assign color tags for organization

### Cover Letters (12 tools)
- `flowcv_list_letters`, `flowcv_get_letter`, `flowcv_create_letter`
- `flowcv_save_letter_body` - Write/update letter content (HTML)
- `flowcv_save_letter_recipient` - Set hiring manager, company, address
- `flowcv_save_letter_date` - Set letter date
- `flowcv_save_letter_personal_details` - Sender details
- `flowcv_save_letter_design` - Letter styling (font, colors, layout, spacing, header, footer, etc.)
- `flowcv_sync_letter_with_resume` - Link cover letter to a resume (share personal details)
- `flowcv_duplicate_letter`, `flowcv_delete_letter`, `flowcv_download_letter`

### Job Tracker (3 tools)
- `flowcv_list_trackers` - List tracker boards
- `flowcv_save_tracker_card` - Create/update job application card
- `flowcv_save_tracker_columns` - Update columns and card assignments

### AI Features (3 tools)
- `flowcv_fill_resume_with_ai` - Generate resume from prompt (uses AI credits)
- `flowcv_ai_suggest_skills` - AI skill suggestions
- `flowcv_ai_grammar_check` - AI grammar check

### Images & Sharing (4 tools)
- `flowcv_search_unsplash` - Search background images
- `flowcv_save_unsplash_image` - Apply background image
- `flowcv_share_template` - Share resume as template
- `flowcv_unshare_template` - Stop sharing

## Workflow: Edit Resume Content

1. Call `flowcv_list_resumes` to get resume IDs
2. Call `flowcv_get_resume` with the target ID to see current data
3. Use `flowcv_save_entry` to add/update entries (generate UUIDs for new entries)
4. Use `flowcv_save_personal_details` for header info
5. Use `flowcv_save_customization` for design changes

## Section Types and Entry Fields

See [references/api-reference.md](references/api-reference.md) for complete entry schemas per section type.

## Source Code

The MCP server source is in [assets/src/](assets/src/). Two files:
- `index.ts` - Main server with all 50 tool registrations
- `api-client.ts` - HTTP client with cookie auth
