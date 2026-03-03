#!/bin/bash
# FlowCV — Local setup (for people who already cloned the repo)
# Usage: ./setup.sh [--mcp]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=== FlowCV Setup ==="
echo ""

# 1. Install & build
echo "[1/3] Installing dependencies & building..."
cd "$SCRIPT_DIR"
npm install --silent 2>/dev/null
npm run build --silent 2>/dev/null

# 2. Link CLI globally
echo "[2/3] Linking CLI..."
npm link --silent 2>/dev/null || {
  echo "       npm link failed (may need sudo). Trying with sudo..."
  sudo npm link --silent 2>/dev/null
}

# 3. Install skills
echo "[3/3] Installing Claude Code skills..."

CLI_SKILL_DIR="$HOME/.claude/skills/flowcv-cli"
mkdir -p "$CLI_SKILL_DIR"
cp "$SCRIPT_DIR/skill/cli-skill/SKILL.md" "$CLI_SKILL_DIR/SKILL.md"
echo "       CLI skill: $CLI_SKILL_DIR"

if [[ "$1" == "--mcp" || "$1" == "--all" ]]; then
  MCP_SKILL_DIR="$HOME/.claude/skills/flowcv"
  mkdir -p "$MCP_SKILL_DIR/references" "$MCP_SKILL_DIR/assets/src"
  cp "$SCRIPT_DIR/skill/SKILL.md" "$MCP_SKILL_DIR/SKILL.md"
  cp "$SCRIPT_DIR/skill/references/"*.md "$MCP_SKILL_DIR/references/"
  cp "$SCRIPT_DIR/src/index.ts" "$MCP_SKILL_DIR/assets/src/index.ts"
  cp "$SCRIPT_DIR/src/api-client.ts" "$MCP_SKILL_DIR/assets/src/api-client.ts"
  cp "$SCRIPT_DIR/package.json" "$MCP_SKILL_DIR/assets/package.json"
  cp "$SCRIPT_DIR/tsconfig.json" "$MCP_SKILL_DIR/assets/tsconfig.json"
  echo "       MCP skill: $MCP_SKILL_DIR"
fi

echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo ""
echo "  1. flowcv login            # Authenticate"
echo ""

if [[ "$1" == "--mcp" || "$1" == "--all" ]]; then
  echo "  2. Add MCP server to Claude Code:"
  echo "     claude mcp add -s user flowcv -- node $SCRIPT_DIR/dist/index.js"
  echo ""
  echo "     Or for this project only:"
  echo "     claude mcp add flowcv -- node $SCRIPT_DIR/dist/index.js"
  echo ""
fi
