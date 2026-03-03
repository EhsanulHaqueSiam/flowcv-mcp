# FlowCV MCP Setup Prompt

Copy any of the prompts below into Claude Code. Claude will set up the MCP server **and** install the Claude Code skill automatically.

---

## Quick Prompt (Recommended)

```
Set up the FlowCV MCP server from this repo:

1. Run ./setup.sh — it builds the server, installs the Claude Code skill, and creates .mcp.json
2. I'll provide my flowcvsidapp cookie when it asks (I'll get it from DevTools > Application > Cookies on app.flowcv.com)
3. After setup, test with flowcv_get_user and flowcv_list_resumes
4. Show me what tools are available
```

---

## Detailed Prompt

```
Set up the FlowCV MCP server so I can manage my FlowCV resumes through Claude. Here's what to do:

1. Build the server:
   - Run `npm install` and `npm run build`
   - Verify dist/index.js exists

2. Install the Claude Code skill:
   - Copy the skill/ directory to ~/.claude/skills/flowcv/
   - This gives you built-in knowledge of all FlowCV API endpoints, entry schemas, and customization paths

3. Help me get my session cookie:
   - I need the `flowcvsidapp` cookie from app.flowcv.com
   - Guide me: open app.flowcv.com → log in → DevTools (F12) → Application → Cookies → app.flowcv.com → copy flowcvsidapp value
   - It starts with `s%3A` and is URL-encoded

4. Configure MCP:
   - Create .mcp.json with the server command, dist/index.js path, and my cookie as FLOWCV_SESSION_COOKIE env var

5. Test:
   - Call flowcv_get_user to verify auth
   - Call flowcv_list_resumes to show my resumes
   - If auth fails, help me get a fresh cookie

Show me a summary of all 47 tools organized by category when done.
```

---

## Fully Automated (Browser with Remote Debugging)

If you're already logged into FlowCV in Chromium with remote debugging (`chromium --remote-debugging-port=9222`):

```
Set up FlowCV MCP fully automatically:

1. Run npm install && npm run build
2. Copy skill/ to ~/.claude/skills/flowcv/
3. Extract my session cookie from Chromium CDP on port 9222:
   - Connect to http://localhost:9222/json/version to get the debugger URL
   - Use Network.getCookies for app.flowcv.com domain
   - Find the flowcvsidapp cookie value
4. Create .mcp.json with the server config and extracted cookie
5. Test with flowcv_get_user and flowcv_list_resumes
6. Show me all available tools
```

---

## After Setup

Try these:

- **"List my resumes"** — see all your FlowCV resumes
- **"Show me the full data for my first resume"** — inspect sections, entries, customization
- **"Add a skill: Python, expert level"** — add entries to any section
- **"Change the font to Poppins and make the accent color #e11d48"** — customize design
- **"Download my resume as PDF"** — trigger PDF generation
- **"Create a cover letter addressed to Jane Smith at Acme Corp"** — cover letter workflow
- **"Publish my resume as a web page"** — make it publicly accessible
- **"Translate my resume to German"** — create a translated copy
