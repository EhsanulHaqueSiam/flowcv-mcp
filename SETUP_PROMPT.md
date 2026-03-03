# FlowCV Setup Prompts

Copy any prompt below into Claude Code.

---

## CLI Only

```
Install the FlowCV CLI from https://github.com/EhsanulHaqueSiam/flowcv-mcp:

1. Clone the repo and run ./setup.sh (builds + links the CLI globally)
2. Run "flowcv login" to open Chrome and authenticate
3. Test with "flowcv resume list" and "flowcv status"
```

---

## CLI + MCP Server

```
Install FlowCV CLI + MCP server from https://github.com/EhsanulHaqueSiam/flowcv-mcp:

1. Clone the repo and run "./setup.sh --mcp" (builds CLI, installs MCP + CLI skills)
2. Run "flowcv login" to authenticate via Chrome
3. Add the MCP server: claude mcp add -s user flowcv -- node <repo-path>/dist/index.js
4. Test the MCP server with flowcv_get_user and flowcv_list_resumes
5. Show me what tools are available
```

---

## Already Cloned

If you already have the repo cloned:

```
Set up FlowCV from this repo:

1. Run "./setup.sh --mcp" to build, link CLI, and install skills
2. Run "flowcv login" to authenticate
3. Add MCP server: claude mcp add -s user flowcv -- node ./dist/index.js
4. Test with flowcv_get_user and flowcv_list_resumes
```

---

## After Setup

Try these:

- **"List my resumes"**
- **"Add a skill: TypeScript, expert level"**
- **"Change my resume font to Inter and accent color to #2563eb"**
- **"Download my resume as PDF"**
- **"Create a cover letter for the Software Engineer position at Google"**
- **"Translate my resume to German"**
