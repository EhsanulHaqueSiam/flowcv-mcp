#!/usr/bin/env node
/**
 * FlowCV MCP Server
 *
 * Provides comprehensive tools to manage FlowCV resumes, cover letters,
 * and all customization options via the FlowCV API.
 *
 * Auth: Set FLOWCV_SESSION_COOKIE env var to your 'flowcvsidapp' cookie value.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiRequest, handleApiError, setSessionCookie, updateCookieEverywhere, verifyAuth } from "./api-client.js";

const server = new McpServer({
  name: "flowcv-mcp-server",
  version: "1.0.0",
});

// ─── Helper schemas ────────────────────────────────────────────────────────────

const ResumeIdSchema = z.object({
  resume_id: z.string().describe("The resume UUID"),
});

// ─── ACCOUNT & AUTH ─────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_get_user",
  {
    title: "Get FlowCV User Info",
    description:
      "Get current user profile including email, plan, subscription status, AI credits, and account details.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const res = await apiRequest<{ user: Record<string, unknown>; activePlans: string[] }>(
        "/api/auth/init_user"
      );
      const user = res.data.user;
      const plans = res.data.activePlans;
      const text = [
        `# FlowCV Account`,
        `- **Email**: ${user.email}`,
        `- **Role**: ${user.role}`,
        `- **Active Plans**: ${plans.join(", ") || "Free"}`,
        `- **AI Credits**: ${user.aiCredits}`,
        `- **Student**: ${user.studentEmailVerifiedAt ? "Yes" : "No"}`,
        `- **Created**: ${user.createdAt}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_get_subscription",
  {
    title: "Get Subscription Info",
    description: "Get subscription details including plan, status, billing interval, and validity.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const res = await apiRequest<{ subInfos: Record<string, unknown>[]; activePlans: string[] }>(
        "/api/users/fetch_subscription_infos"
      );
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── SESSION MANAGEMENT ─────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_update_cookie",
  {
    title: "Update Session Cookie",
    description: `Update the FlowCV session cookie at runtime (no server restart needed).
Use this when the session has expired. Pass the raw cookie value (starts with s%3A...).
This updates the in-memory cookie AND persists it to .mcp.json so future restarts use the new value.

How to get a new cookie:
1. Open https://app.flowcv.com in a browser and log in
2. DevTools (F12) → Application → Cookies → app.flowcv.com → copy "flowcvsidapp" value
3. If Chromium is running with --remote-debugging-port=9222, extract it programmatically.`,
    inputSchema: z.object({
      cookie_value: z.string().describe("The raw flowcvsidapp cookie value (starts with s%3A...)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ cookie_value }) => {
    try {
      const result = updateCookieEverywhere(cookie_value);

      // Verify the new cookie works
      const res = await apiRequest<{ user: Record<string, unknown> }>("/api/auth/init_user");
      const email = res.data.user?.email || "unknown";

      return {
        content: [
          {
            type: "text",
            text: [
              "Cookie updated and verified successfully!",
              `Logged in as: ${email}`,
              `Updated: ${result.updated.join(", ")}`,
            ].join("\n"),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update cookie — the provided value may be invalid.\n${handleApiError(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "flowcv_check_auth",
  {
    title: "Check Authentication Status",
    description:
      "Check if the current session cookie is valid. Returns user info if authenticated, or clear instructions to fix if not. Call this first when starting or if any tool returns a SESSION_EXPIRED error.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    const user = await verifyAuth();
    if (user) {
      return {
        content: [
          {
            type: "text",
            text: [
              "Authenticated successfully!",
              `- **Email**: ${user.email}`,
              `- **AI Credits**: ${user.aiCredits}`,
            ].join("\n"),
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: [
            "NOT AUTHENTICATED. The session cookie is missing, invalid, or expired.",
            "",
            "To fix this, use flowcv_update_cookie with a fresh cookie value.",
            "To get a cookie:",
            "1. Open https://app.flowcv.com in a browser and log in",
            '2. DevTools (F12) → Application → Cookies → app.flowcv.com → copy "flowcvsidapp" value',
            "3. Pass the value (starts with s%3A...) to flowcv_update_cookie",
          ].join("\n"),
        },
      ],
      isError: true,
    };
  }
);

// ─── RESUME MANAGEMENT ─────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_list_resumes",
  {
    title: "List All Resumes",
    description:
      "List all resumes in the account with their IDs, titles, page count info, web publish status, and last change date.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const res = await apiRequest<{ resumes: Record<string, unknown>[] }>("/api/resumes/all");
      const resumes = res.data.resumes;
      const lines = [`# Resumes (${resumes.length} total)\n`];
      for (const r of resumes) {
        lines.push(`## ${r.title} \`${r.id}\``);
        lines.push(`- **Web Published**: ${r.webResumeLive ? "Yes" : "No"}`);
        lines.push(`- **Last Changed**: ${r.lastChangeAt}`);
        lines.push(`- **Web Token**: ${r.webToken}`);
        lines.push("");
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_get_resume",
  {
    title: "Get Full Resume",
    description:
      "Get the complete resume data including all sections, entries, personal details, customization, and metadata. Returns the full JSON structure.",
    inputSchema: ResumeIdSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      const res = await apiRequest<{ resume: Record<string, unknown> }>(`/api/resumes/${resume_id}`);
      return { content: [{ type: "text", text: JSON.stringify(res.data.resume, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_create_resume",
  {
    title: "Create New Resume",
    description:
      "Create a new blank resume. On free plan, limited to 2 resumes. Returns the new resume ID.",
    inputSchema: z.object({
      title: z.string().default("Untitled Resume").describe("Title for the new resume"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ title }) => {
    try {
      const clientResume = { title };
      const res = await apiRequest<{ resume: Record<string, unknown> }>(
        "/api/resumes/create",
        "POST",
        { clientResume }
      );
      const resume = res.data.resume;
      return {
        content: [
          {
            type: "text",
            text: `Resume created successfully!\n- **ID**: ${resume.id}\n- **Title**: ${resume.title}`,
          },
        ],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_duplicate_resume",
  {
    title: "Duplicate Resume",
    description: "Create a copy of an existing resume. Returns the new resume ID.",
    inputSchema: ResumeIdSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      const res = await apiRequest<{ resume: Record<string, unknown> }>(
        "/api/resumes/duplicate",
        "POST",
        { duplicateId: resume_id }
      );
      const resume = res.data.resume;
      return {
        content: [{ type: "text", text: `Resume duplicated!\n- **New ID**: ${resume.id}\n- **Title**: ${resume.title}` }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_rename_resume",
  {
    title: "Rename Resume",
    description: "Change the title of a resume.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      title: z.string().describe("New title for the resume"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, title }) => {
    try {
      await apiRequest("/api/resumes/rename_resume", "PATCH", { resumeId: resume_id, resumeTitle: title });
      return { content: [{ type: "text", text: `Resume renamed to "${title}"` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_delete_resume",
  {
    title: "Delete Resume",
    description: "Permanently delete a resume. This cannot be undone.",
    inputSchema: ResumeIdSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      await apiRequest("/api/resumes/delete_resume", "DELETE", undefined, { resumeId: resume_id });
      return { content: [{ type: "text", text: `Resume ${resume_id} deleted.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_download_resume",
  {
    title: "Download Resume PDF",
    description:
      "Trigger a resume PDF download. Returns a download URL or sends via email depending on account settings.",
    inputSchema: ResumeIdSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      const res = await apiRequest<Record<string, unknown>>(
        "/api/resumes/download",
        "POST",
        { resumeId: resume_id }
      );
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_translate_resume",
  {
    title: "Translate Resume",
    description:
      "Create a translated copy of a resume. Creates a new resume in the target language.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID to translate"),
      target_language: z.string().describe("Target language code (e.g., 'de', 'fr', 'es', 'ja', 'ar')"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id, target_language }) => {
    try {
      const res = await apiRequest<{ resume: Record<string, unknown> }>(
        "/api/resumes/translate",
        "POST",
        { resumeId: resume_id, targetLng: target_language }
      );
      return {
        content: [
          {
            type: "text",
            text: `Translated copy created!\n- **New ID**: ${res.data.resume.id}\n- **Language**: ${target_language}`,
          },
        ],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── PERSONAL DETAILS ──────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_save_personal_details",
  {
    title: "Save Personal Details",
    description: `Update personal details on a resume. Supports partial updates — only include fields you want to change.

Fields: fullName, jobTitle, displayEmail, phone, address, website, websiteLink, usAddress (boolean),
detailsOrder (array of field keys like ["displayEmail","phone","address","website","github","linkedIn"]),
social (object with github/linkedIn/twitter/etc, each having "link" and "display" keys),
photo (object with shape, imageId, xPct, yPct, widthPct, heightPct).`,
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      personal_details: z
        .record(z.unknown())
        .describe(
          "Object with personal detail fields to update. E.g. {fullName: 'John', jobTitle: 'Developer', phone: '+1234'}"
        ),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, personal_details }) => {
    try {
      await apiRequest("/api/resumes/save_personal_details", "PATCH", {
        resumeId: resume_id,
        personalDetails: personal_details,
      });
      return { content: [{ type: "text", text: "Personal details saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── SECTION ENTRIES (CONTENT) ──────────────────────────────────────────────────

server.registerTool(
  "flowcv_save_entry",
  {
    title: "Save/Update Section Entry",
    description: `Create or update an entry in a resume section. To create a new entry, include an "id" field
(generate a UUID). To update an existing entry, use its existing ID.

Section types and their entry fields:
- profile: {id, text}
- education: {id, degree, school, schoolLink, location, startDateNew, endDateNew, description}
- skill: {id, skill, level, infoHtml}
- project: {id, projectTitle, projectTitleLink, subTitle, startDateNew, endDateNew, description}
- award: {id, awardTitle, awardTitleLink, issuer, date:{year,month}, description}
- language: {id, language, level, infoHtml}
- interest: {id, interest, interestLink, infoHtml}
- reference: {id, name, nameLink, jobTitle, organisation, email, phone}
- certificate: {id, certificate, certificateLink, infoHtml}
- declaration: {id, fullName, place, date, declarationText, signatureDataUrl}
- custom/custom2/custom3/custom4: {id, title, titleLink, subTitle, location, startDateNew, endDateNew, description}
- customSkill1/customSkill2: {id, skill, level, infoHtml}

Date fields (startDateNew/endDateNew) use format: {year:"2024", month:"6", day:"15", hideDay:true, hideMonth:false, present:false}
Descriptions support HTML: <p>text</p>, <strong>bold</strong>, <ul><li>item</li></ul>`,
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z
        .string()
        .describe(
          "Section key: profile, education, skill, project, award, language, interest, reference, certificate, declaration, custom, custom2, custom3, custom4, customSkill1, customSkill2"
        ),
      entry: z.record(z.unknown()).describe("The entry object with fields appropriate for the section type. Must include 'id'."),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, section_id, entry }) => {
    try {
      await apiRequest("/api/resumes/save_entry", "PATCH", {
        ...entry,
        resumeId: resume_id,
        sectionId: section_id,
      });
      return { content: [{ type: "text", text: `Entry saved in section "${section_id}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_delete_entry",
  {
    title: "Delete Section Entry",
    description: "Delete a specific entry from a resume section.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z.string().describe("Section key (e.g., 'skill', 'education', 'project')"),
      entry_id: z.string().describe("The entry UUID to delete"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id, section_id, entry_id }) => {
    try {
      await apiRequest("/api/resumes/delete_entry", "DELETE", undefined, {
        resumeId: resume_id,
        sectionId: section_id,
        entryId: entry_id,
      });
      return { content: [{ type: "text", text: `Entry ${entry_id} deleted from "${section_id}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_entries_order",
  {
    title: "Reorder Section Entries",
    description: "Change the display order of entries within a section.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z.string().describe("Section key"),
      entry_ids: z.array(z.string()).describe("Array of entry UUIDs in the desired display order"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, section_id, entry_ids }) => {
    try {
      await apiRequest("/api/resumes/save_entries_order", "PATCH", {
        resumeId: resume_id,
        sectionId: section_id,
        newEntriesIdsOrder: entry_ids,
      });
      return { content: [{ type: "text", text: `Entries reordered in "${section_id}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── SECTION MANAGEMENT ─────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_save_section_name",
  {
    title: "Rename Section Heading",
    description:
      'Change the display name of a resume section (e.g., rename "Skills" to "Technical Skills").',
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z.string().describe("Section key (e.g., 'skill', 'education')"),
      display_name: z.string().describe("New display name for the section heading"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, section_id, display_name }) => {
    try {
      await apiRequest("/api/resumes/save_section_name", "PATCH", {
        resumeId: resume_id,
        sectionId: section_id,
        displayName: display_name,
      });
      return { content: [{ type: "text", text: `Section renamed to "${display_name}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_section_icon",
  {
    title: "Set Section Icon",
    description:
      "Set the icon for a section heading. Common icon keys: award, book, briefcase, code, education, flag, globe, heart, language, mail, map, phone, project, reference, skill, star, user, wrench.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z.string().describe("Section key"),
      icon_key: z.string().describe("Icon key name (e.g., 'briefcase', 'code', 'star')"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, section_id, icon_key }) => {
    try {
      await apiRequest("/api/resumes/save_section_icon", "PATCH", {
        resumeId: resume_id,
        sectionId: section_id,
        iconKey: icon_key,
      });
      return { content: [{ type: "text", text: `Icon set to "${icon_key}" for section "${section_id}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_update_section_type",
  {
    title: "Change Section Type",
    description:
      "Change the type of a custom section. Only applicable to custom sections (custom, custom2, etc). Valid section types: custom, experience, certificate, declaration, course, organisation, publication.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z.string().describe("Section key"),
      section_type: z.string().describe("New section type: custom, experience, certificate, declaration, course, organisation, publication"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, section_id, section_type }) => {
    try {
      await apiRequest("/api/resumes/update_section_type", "PATCH", {
        resumeId: resume_id,
        sectionId: section_id,
        sectionType: section_type,
      });
      return { content: [{ type: "text", text: `Section type updated to "${section_type}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_delete_section",
  {
    title: "Delete Section",
    description: "Remove an entire section and all its entries from the resume. Cannot be undone.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      section_id: z.string().describe("Section key to delete"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id, section_id }) => {
    try {
      await apiRequest("/api/resumes/delete_section", "DELETE", undefined, {
        resumeId: resume_id,
        sectionId: section_id,
      });
      return { content: [{ type: "text", text: `Section "${section_id}" deleted.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── CUSTOMIZATION ──────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_save_customization",
  {
    title: "Save Customization (Partial)",
    description: `Update specific customization settings. Pass an array of updates, each with a dot-separated
path and value. This allows granular changes without overwriting the entire customization object.

Common paths:

FONT:
- font.selected: "serif" | "sans" | "mono"
- font.fontFamily: e.g. "Zilla Slab", "Arial", "Poppins", "Roboto", "Inter"

COLORS:
- colors.mode: "basic" | "advanced"
- colors.basic.single: hex color like "#0e374e"
- colors.basic.selected: "single" | "multi"
- colors.basic.multi: {textColor, accentColor, backgroundColor}
- colors.advanced.selected: "single" | "multi"
- colors.border.single: hex color (border color)
- colors.border.selected: "single" | "multi"
- colors.border.width: "1" to "5"
- colors.border.top/bottom/left/right: hex color (per-side)

SPACING:
- spacing.fontSize: "1" to "5" (x-small to x-large)
- spacing.lineHeight: "1" to "5"
- spacing.spacingFactor: "1" to "5"
- spacing.marginVertical: "1" to "5"
- spacing.marginHorizontal: "1" to "5"
- pageFormat: "A4" | "letter"

LAYOUT:
- layout.detailsPosition: "top" | "left" | "right"
- layout.colsFromDetails.top: "one" | "two" | "mix"
- layout.colsFromDetails.left/right: "one" | "two" | "mix"
- layout.colWidthsFromDetails.{top|left|right}.leftWidth: number (%)
- layout.colWidthsFromDetails.{top|left|right}.rightWidth: number (%)

HEADINGS:
- heading.style: "simple" | "line" | "topBottomLine" | "box" | "underline" | "thinLine" | "thickShortUnderline" | "zigZagLine"
- heading.headingSize: "xs" | "s" | "m" | "l" | "xl"
- heading.capitalization: "capitalize" | "uppercase" | "none"
- heading.icons: "none" | "outline" | "filled"

HEADER:
- header.photo.show: true | false
- header.photo.size: "xs" | "s" | "m" | "l" | "xl"
- header.photo.grayscale: true | false
- header.nameSize: "xs" | "s" | "m" | "l" | "xl"
- header.accentuateName: true | false
- header.jobTitlePosition: "below" | "sameLine"
- header.jobTitleSize: "xs" | "s" | "m" | "l" | "xl"
- header.jobTitleStyle: "normal" | "bold" | "italic"
- header.iconFrame: "none" | "circle" | "square"
- header.iconFrameStyle: "filled" | "outline"
- header.detailsArrangement: "row" | "column"
- header.detailsGrid: true | false
- header.photoPositionFromHeaderPosition.top: "left" | "right" | "center"

ENTRY LAYOUT:
- entryLayout.displayMode: "dateLocationLeft" | "dateLocationRight" | "dateContentLocation"
- entryLayout.subtitleStyle: "normal" | "bold" | "italic"
- entryLayout.titleAndSubtitleSize: "xs" | "s" | "m" | "l"
- entryLayout.bodyIndentation: true | false
- entryLayout.dateLocationOpacity: 0 to 1
- entryLayout.colMode: "one" | "two"
- entryLayout.colWidths.leftWidth/rightWidth: number (%)

SKILL/LANGUAGE/INTEREST DISPLAY:
- skillDisplay.selected: "grid" | "level" | "text"
- skillDisplay.grid.columns: number (e.g. 2, 3, 4)
- skillDisplay.level.selected: "bar" | "dots" | "bubbles"
- languageDisplay.selected: "grid" | "level" | "text"
- interestDisplay.selected: "grid" | "text"
- certificateDisplay.selected: "grid" | "level" | "text"
- customSkillSections.customSkill1.selected: "grid" | "level" | "text"

EDUCATION/WORK DISPLAY:
- educationDisplay.degreeFirst: true | false
- workDisplay.titleFirst: true | false

DECLARATION DISPLAY:
- declarationDisplay.showSignature: true | false
- declarationDisplay.showDate: true | false
- declarationDisplay.showPlace: true | false

ACCENT COLOR:
- applyAccentColor.headings: true | false
- applyAccentColor.name: true | false
- applyAccentColor.icons: true | false
- applyAccentColor.headerBg: true | false
- applyAccentColor.dates: true | false
- applyAccentColor.linkIcons: true | false
- applyAccentColor.jobTitle: true | false
- applyAccentColor.headingLine: true | false
- applyAccentColor.dotsBarsBubbles: true | false

EXPERT:
- expert.footer.pages: true | false
- expert.footer.name: true | false
- expert.footer.email: true | false
- expert.subTitlePlacement: "sameLine" | "below"
- expert.showProfileHeading: true | false

ADVANCED:
- advanced.listStyle: "bullet" | "dash" | "circle" | "none"
- advanced.linkIcon: "boxArrow" | "chain" | "none"
- advanced.underlineLinks: true | false
- advanced.makeLinksBlue: true | false
- advanced.groupPromotions: true | false

OTHER:
- creativeNameFont.fontFamily: font name (override for name only)
- regional.dateFormat: e.g. "MM/YYYY", "YYYY/MM", "MM.YYYY"
- sectionOrder.one: array of section keys
- sectionOrder.two: {left: [...], right: [...]}
- sectionOrder.mix: {left: [...], right: [...]}

Note: Photo shape is set via flowcv_save_personal_details (photo.shape), not customization.
Valid shapes: "round", "square", "squareRounded", "portrait", "portraitRounded".`,
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      updates: z
        .array(
          z.object({
            path: z.string().describe("Dot-separated path, e.g. 'font.fontFamily'"),
            value: z.unknown().describe("The new value"),
          })
        )
        .describe("Array of {path, value} customization updates"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, updates }) => {
    try {
      await apiRequest("/api/resumes/save_customization", "PATCH", {
        resumeId: resume_id,
        customizationUpdates: updates,
      });
      return {
        content: [{ type: "text", text: `Customization saved (${updates.length} update(s) applied).` }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_all_customizations",
  {
    title: "Save All Customizations",
    description:
      "Replace the entire customization object for a resume. Use flowcv_get_resume first to get the current customization, modify it, then save it back. Use this for bulk changes.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      customizations: z.record(z.unknown()).describe("The full customization object"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, customizations }) => {
    try {
      await apiRequest("/api/resumes/save_all_customizations", "PATCH", {
        resumeId: resume_id,
        allCustomizations: customizations,
      });
      return { content: [{ type: "text", text: "All customizations saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── TEMPLATES ──────────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_apply_template",
  {
    title: "Apply Resume Template",
    description:
      "Apply a design template to a resume. Use flowcv_get_resume to see the lastUsedTemplateId. Template IDs are UUIDs from FlowCV's template library.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      template_id: z.string().describe("Template UUID to apply"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, template_id }) => {
    try {
      // First get the template
      const tmpl = await apiRequest<{ template: Record<string, unknown> }>(
        "/api/resume-templates/get-template",
        "GET",
        undefined,
        { templateId: template_id }
      );
      const template = tmpl.data.template;

      await apiRequest("/api/resumes/apply_template", "PATCH", {
        resumeId: resume_id,
        templateId: template_id,
        customization: template.customization || {},
        content: {},
        businessDetails: {},
        usingBusinessTemplateId: "",
        personalDetails: {},
      });
      return { content: [{ type: "text", text: `Template ${template_id} applied.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_list_templates",
  {
    title: "List Available Templates",
    description:
      "List resume templates available in the FlowCV template library including user's custom templates.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const res = await apiRequest<{ templates: Record<string, unknown>[] }>(
        "/api/resume-templates/get-user-templates"
      );
      const templates = res.data.templates || [];
      if (templates.length === 0) {
        return { content: [{ type: "text", text: "No custom templates found. Use the FlowCV template browser to explore built-in templates." }] };
      }
      const lines = [`# Custom Templates (${templates.length})\n`];
      for (const t of templates) {
        lines.push(`- **${t.title || "Untitled"}** \`${t.id}\``);
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── PUBLISHING & SHARING ───────────────────────────────────────────────────────

server.registerTool(
  "flowcv_publish_web_resume",
  {
    title: "Publish/Unpublish Web Resume",
    description:
      "Toggle publishing of a resume as a public web page. When published, accessible via flowcv.com/resume/{webToken}.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      publish: z.boolean().describe("true to publish, false to unpublish"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, publish }) => {
    try {
      await apiRequest("/api/resumes/publish_web_resume", "PATCH", {
        resumeId: resume_id,
        publish,
      });
      return {
        content: [{ type: "text", text: publish ? "Resume published to the web." : "Resume taken offline." }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_enable_download_button",
  {
    title: "Toggle Web Resume Download Button",
    description: "Enable or disable the download button on the published web resume.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      enable: z.boolean().describe("true to show download button, false to hide it"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, enable }) => {
    try {
      await apiRequest("/api/resumes/enable_web_resume_download_btn", "PATCH", {
        resumeId: resume_id,
        enable,
      });
      return { content: [{ type: "text", text: enable ? "Download button enabled." : "Download button disabled." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── LANGUAGE & TAGS ─────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_save_language",
  {
    title: "Set Resume Language",
    description:
      "Set the language for a resume. This affects date formats and section labels. Common codes: en, en_US, de, fr, es, pt, it, nl, pl, sv, da, fi, nb, ja, ko, zh, ar, he, tr, ru.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      language: z.string().describe("Language code (e.g., 'en', 'de', 'fr')"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, language }) => {
    try {
      await apiRequest("/api/resumes/save_language", "PATCH", { resumeId: resume_id, lng: language });
      return { content: [{ type: "text", text: `Language set to "${language}".` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_tags",
  {
    title: "Set Resume Tags",
    description: "Assign color tags to a resume for organization. Tags have id, name, and hexColor.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      tags: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            hexColor: z.string().optional(),
          })
        )
        .describe("Array of tag objects"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, tags }) => {
    try {
      await apiRequest("/api/resumes/save_tags", "PATCH", { resumeId: resume_id, tags });
      return { content: [{ type: "text", text: `Tags saved (${tags.length} tags).` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── COVER LETTERS ──────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_list_letters",
  {
    title: "List Cover Letters",
    description: "List all cover letters in the account.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const res = await apiRequest<{ letters: Record<string, unknown>[] }>("/api/letters/all");
      const letters = res.data.letters;
      const lines = [`# Cover Letters (${letters.length})\n`];
      for (const l of letters) {
        lines.push(`## ${l.title || "Untitled"} \`${l.id}\``);
        lines.push(`- **Synced with Resume**: ${l.syncWithResumeId || "None"}`);
        lines.push(`- **Last Changed**: ${l.lastChangeAt}`);
        lines.push("");
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_get_letter",
  {
    title: "Get Cover Letter",
    description: "Get the full cover letter data including body, recipient, design, and personal details.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id }) => {
    try {
      const res = await apiRequest<{ letter: Record<string, unknown> }>(`/api/letters/${letter_id}`);
      return { content: [{ type: "text", text: JSON.stringify(res.data.letter, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_create_letter",
  {
    title: "Create Cover Letter",
    description: "Create a new cover letter.",
    inputSchema: z.object({
      title: z.string().default("Untitled Letter").describe("Title for the cover letter"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ title }) => {
    try {
      const clientLetter = { title };
      const res = await apiRequest<{ letter: Record<string, unknown> }>(
        "/api/letters/create",
        "POST",
        { clientLetter }
      );
      return {
        content: [{ type: "text", text: `Cover letter created!\n- **ID**: ${res.data.letter.id}` }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_letter_body",
  {
    title: "Save Cover Letter Body",
    description: "Update the main body text of a cover letter. Supports HTML formatting.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
      body: z.string().describe("HTML body content of the cover letter"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id, body }) => {
    try {
      await apiRequest("/api/letters/save_body", "POST", { letterId: letter_id, body });
      return { content: [{ type: "text", text: "Cover letter body saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_letter_recipient",
  {
    title: "Save Cover Letter Recipient",
    description:
      "Update the recipient details of a cover letter (hiring manager name, company, address).",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
      recipient: z.record(z.unknown()).describe("Recipient object: {hrName, company, address}"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id, recipient }) => {
    try {
      await apiRequest("/api/letters/save_recipient", "POST", { letterId: letter_id, recipient });
      return { content: [{ type: "text", text: "Recipient saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_letter_date",
  {
    title: "Save Cover Letter Date",
    description: "Update the date on a cover letter.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
      date: z.record(z.unknown()).describe("Date object: {mode: 'today' | 'custom', custom: 'date string'}"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id, date }) => {
    try {
      await apiRequest("/api/letters/save_date", "POST", { letterId: letter_id, date });
      return { content: [{ type: "text", text: "Date saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_letter_personal_details",
  {
    title: "Save Cover Letter Personal Details",
    description: "Update personal details on a cover letter.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
      personal_details: z.record(z.unknown()).describe("Personal details object"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id, personal_details }) => {
    try {
      await apiRequest("/api/letters/save_personal_details", "PATCH", {
        letterId: letter_id,
        personalDetails: personal_details,
      });
      return { content: [{ type: "text", text: "Personal details saved on cover letter." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_letter_design",
  {
    title: "Save Cover Letter Design",
    description: `Update the design/styling of a cover letter. The design object supports the same customization
categories as resumes: font, colors (basic/advanced/border), spacing, layout (header position: top/left/right),
header (photo, name size/bold, job title size/position/style, icon frame/style, details alignment/arrangement),
link styling (underline, blue color, link icon), accent color, declaration display, footer, and page format.`,
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
      design: z.record(z.unknown()).describe("Design object with styling options"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id, design }) => {
    try {
      await apiRequest("/api/letters/save-design", "POST", { letterId: letter_id, design });
      return { content: [{ type: "text", text: "Cover letter design saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_sync_letter_with_resume",
  {
    title: "Sync Cover Letter with Resume",
    description:
      "Link a cover letter to a resume so they share personal details. When synced, changes to the resume's personal details automatically update the cover letter.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
      resume_id: z.string().describe("The resume UUID to sync with"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id, resume_id }) => {
    try {
      await apiRequest("/api/letters/save-design", "POST", {
        letterId: letter_id,
        syncWithResumeId: resume_id,
      });
      return { content: [{ type: "text", text: `Cover letter synced with resume ${resume_id}.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_duplicate_letter",
  {
    title: "Duplicate Cover Letter",
    description: "Create a copy of an existing cover letter.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID to duplicate"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ letter_id }) => {
    try {
      const res = await apiRequest<{ letter: Record<string, unknown> }>(
        "/api/letters/duplicate",
        "POST",
        { duplicateId: letter_id }
      );
      return { content: [{ type: "text", text: `Letter duplicated! New ID: ${res.data.letter.id}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_delete_letter",
  {
    title: "Delete Cover Letter",
    description: "Permanently delete a cover letter.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID to delete"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  async ({ letter_id }) => {
    try {
      await apiRequest("/api/letters/delete_letter", "DELETE", undefined, { letterId: letter_id });
      return { content: [{ type: "text", text: `Cover letter ${letter_id} deleted.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_download_letter",
  {
    title: "Download Cover Letter PDF",
    description: "Download a cover letter as PDF.",
    inputSchema: z.object({
      letter_id: z.string().describe("The cover letter UUID"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ letter_id }) => {
    try {
      const res = await apiRequest<Record<string, unknown>>(
        "/api/letters/download",
        "POST",
        { letterId: letter_id }
      );
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── JOB TRACKER ────────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_list_trackers",
  {
    title: "List Job Trackers",
    description: "List all job tracker boards with columns and cards.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const res = await apiRequest<{ trackers: Record<string, unknown>[] }>("/api/trackers/all");
      return { content: [{ type: "text", text: JSON.stringify(res.data.trackers, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_tracker_card",
  {
    title: "Save Job Tracker Card",
    description:
      "Create or update a card in a job tracker column (e.g., a job application entry).",
    inputSchema: z.object({
      tracker_id: z.string().describe("The tracker UUID"),
      card: z.record(z.unknown()).describe("Card object with job application details"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ tracker_id, card }) => {
    try {
      await apiRequest("/api/trackers/save_card", "POST", { trackerId: tracker_id, card });
      return { content: [{ type: "text", text: "Tracker card saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_tracker_columns",
  {
    title: "Update Tracker Columns",
    description: "Update the columns and card assignments in a job tracker board.",
    inputSchema: z.object({
      tracker_id: z.string().describe("The tracker UUID"),
      columns: z.array(z.record(z.unknown())).describe("Array of column objects with {id, name, cardIds}"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ tracker_id, columns }) => {
    try {
      await apiRequest("/api/trackers/save_columns", "POST", { trackerId: tracker_id, columns });
      return { content: [{ type: "text", text: "Tracker columns saved." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── UNSPLASH (Background Images) ────────────────────────────────────────────────

server.registerTool(
  "flowcv_search_unsplash",
  {
    title: "Search Unsplash Images",
    description:
      "Search Unsplash for background images to use in creative resume templates.",
    inputSchema: z.object({
      query: z.string().describe("Search query for Unsplash images"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ query }) => {
    try {
      const res = await apiRequest<Record<string, unknown>>(
        "/api/unsplash/search",
        "GET",
        undefined,
        { query }
      );
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_save_unsplash_image",
  {
    title: "Set Background Image",
    description: "Apply an Unsplash image as the resume background (for creative templates).",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      unsplash_image: z.record(z.unknown()).describe("Unsplash image object from search results"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, unsplash_image }) => {
    try {
      await apiRequest("/api/resumes/save_unsplash_image", "PATCH", {
        resumeId: resume_id,
        unsplashImage: unsplash_image,
      });
      return { content: [{ type: "text", text: "Background image applied." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── AI FEATURES ────────────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_fill_resume_with_ai",
  {
    title: "Fill Resume with AI",
    description:
      "Use AI to generate resume content based on a prompt. Creates a new resume with AI-generated content. Requires AI credits.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe("Prompt describing the job/role/experience to generate resume content for"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ prompt }) => {
    try {
      const res = await apiRequest<{ resume: Record<string, unknown> }>(
        "/api/resumes/fill-resume-with-ai",
        "POST",
        { prompt, clientResume: {}, resumeId: null }
      );
      return {
        content: [
          {
            type: "text",
            text: `AI resume created!\n- **ID**: ${res.data.resume.id}\n- **Title**: ${res.data.resume.title}`,
          },
        ],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_ai_suggest_skills",
  {
    title: "AI Suggest Skills",
    description: "Use AI to suggest skills for a resume. Requires AI credits.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      const res = await apiRequest<Record<string, unknown>>(
        "/api/ai/skills/suggest",
        "POST",
        { resumeId: resume_id }
      );
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_ai_grammar_check",
  {
    title: "AI Grammar Check",
    description: "Run AI grammar check on resume content. Requires AI credits.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      const res = await apiRequest<Record<string, unknown>>(
        "/api/ai/tools/grammar",
        "POST",
        { resumeId: resume_id }
      );
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── TEMPLATE SHARING ───────────────────────────────────────────────────────────

server.registerTool(
  "flowcv_share_template",
  {
    title: "Share Resume as Template",
    description: "Share your resume design as a public or private template that others can use.",
    inputSchema: z.object({
      resume_id: z.string().describe("The resume UUID"),
      make_private: z.boolean().default(false).describe("true = anonymous (no personal data), false = public with content"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id, make_private }) => {
    try {
      const res = await apiRequest<{ sharedTemplate: Record<string, unknown> }>(
        "/api/resume-templates/share_template",
        "POST",
        { resumeId: resume_id, replaceContent: make_private }
      );
      return {
        content: [
          {
            type: "text",
            text: `Template shared!\n- **Public ID**: ${res.data.sharedTemplate.publicId}\n- **URL**: https://flowcv.com/resume-template/${res.data.sharedTemplate.publicId}`,
          },
        ],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

server.registerTool(
  "flowcv_unshare_template",
  {
    title: "Unshare Resume Template",
    description: "Stop sharing a resume template publicly.",
    inputSchema: ResumeIdSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ resume_id }) => {
    try {
      await apiRequest("/api/resume-templates/unshare_template", "POST", { resumeId: resume_id });
      return { content: [{ type: "text", text: "Template unshared." }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }], isError: true };
    }
  }
);

// ─── MAIN ───────────────────────────────────────────────────────────────────────

async function main() {
  const cookie = process.env.FLOWCV_SESSION_COOKIE;
  if (cookie) {
    setSessionCookie(`flowcvsidapp=${cookie}`);
    console.error("FlowCV MCP server running (cookie set from env)");
  } else {
    console.error(
      "WARNING: FLOWCV_SESSION_COOKIE not set. Server starting without auth.\n" +
        "Use the flowcv_update_cookie tool to set a cookie, or provide FLOWCV_SESSION_COOKIE env var.\n" +
        "To get a cookie: log in to https://app.flowcv.com → DevTools (F12) → Application → Cookies → copy flowcvsidapp value."
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
