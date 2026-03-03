#!/bin/bash
# FlowCV MCP Server + Claude Code Skill — One-command setup
# Usage: ./setup.sh [session-cookie]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/flowcv"
DIST_JS="$SCRIPT_DIR/dist/index.js"

echo "=== FlowCV MCP Setup ==="
echo ""

# 1. Install & build
echo "[1/6] Installing dependencies..."
cd "$SCRIPT_DIR"
npm install --silent 2>/dev/null
echo "[2/6] Building..."
npm run build --silent 2>/dev/null
echo "       Built: $DIST_JS"

# 2. Install skill
echo "[3/6] Installing Claude Code skill..."
mkdir -p "$SKILL_DIR/references" "$SKILL_DIR/assets/src"
cp "$SCRIPT_DIR/skill/SKILL.md" "$SKILL_DIR/SKILL.md"
cp "$SCRIPT_DIR/skill/references/api-reference.md" "$SKILL_DIR/references/api-reference.md"
cp "$SCRIPT_DIR/skill/references/customization-guide.md" "$SKILL_DIR/references/customization-guide.md"
cp "$SCRIPT_DIR/src/index.ts" "$SKILL_DIR/assets/src/index.ts"
cp "$SCRIPT_DIR/src/api-client.ts" "$SKILL_DIR/assets/src/api-client.ts"
cp "$SCRIPT_DIR/package.json" "$SKILL_DIR/assets/package.json"
cp "$SCRIPT_DIR/tsconfig.json" "$SKILL_DIR/assets/tsconfig.json"
echo "       Skill installed to: $SKILL_DIR"

echo "[4/6] Installing CLI skill..."
CLI_SKILL_DIR="$HOME/.claude/skills/flowcv-cli"
mkdir -p "$CLI_SKILL_DIR"
cp "$SCRIPT_DIR/skill/cli-skill/SKILL.md" "$CLI_SKILL_DIR/SKILL.md"
echo "       CLI skill installed to: $CLI_SKILL_DIR"

# 3. Cookie
COOKIE="${1:-}"
if [ -z "$COOKIE" ]; then
    echo ""
    echo "[5/6] Session cookie needed."
    echo ""
    echo "  To get it:"
    echo "  1. Log in to https://app.flowcv.com"
    echo "  2. Open DevTools (F12) > Application > Cookies > app.flowcv.com"
    echo "  3. Copy the 'flowcvsidapp' cookie value (starts with s%3A...)"
    echo ""
    read -rp "  Paste cookie value: " COOKIE
fi

if [ -z "$COOKIE" ]; then
    echo "  No cookie provided. Skipping MCP config."
    echo "  Run again with: ./setup.sh 'your-cookie-value'"
    echo ""
    echo "=== Done (partial — no MCP config) ==="
    exit 0
fi

# 4. Write .mcp.json
MCP_CONFIG="$SCRIPT_DIR/.mcp.json"
cat > "$MCP_CONFIG" <<MCPEOF
{
  "mcpServers": {
    "flowcv": {
      "command": "node",
      "args": ["$DIST_JS"],
      "env": {
        "FLOWCV_SESSION_COOKIE": "$COOKIE"
      }
    }
  }
}
MCPEOF
echo "       MCP config written to: $MCP_CONFIG"

echo ""
# 5. Link CLI globally
echo "[6/6] Linking CLI..."
cd "$SCRIPT_DIR"
npm link --silent 2>/dev/null || true
echo "       flowcv command available globally"

echo ""
echo "=== Setup complete ==="
echo ""
echo "What's installed:"
echo "  MCP Server:  $DIST_JS"
echo "  MCP Config:  $MCP_CONFIG"
echo "  Skill:       $SKILL_DIR"
echo ""
echo "Open Claude Code in this directory and try:"
echo '  "List my FlowCV resumes"'
echo '  "Change my resume font to Inter"'
echo '  "Download my resume as PDF"'
