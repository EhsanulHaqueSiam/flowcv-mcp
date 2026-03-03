#!/bin/bash
# FlowCV — One-liner installer
#
# CLI only:
#   curl -fsSL https://raw.githubusercontent.com/EhsanulHaqueSiam/flowcv-mcp/master/install.sh | bash
#
# CLI + MCP server:
#   curl -fsSL https://raw.githubusercontent.com/EhsanulHaqueSiam/flowcv-mcp/master/install.sh | bash -s -- --mcp

set -e

REPO="https://github.com/EhsanulHaqueSiam/flowcv-mcp.git"
INSTALL_DIR="${FLOWCV_INSTALL_DIR:-$HOME/.local/share/flowcv-mcp}"
SETUP_MCP=false

for arg in "$@"; do
  case "$arg" in
    --mcp|--all) SETUP_MCP=true ;;
  esac
done

echo ""
echo "=== FlowCV Installer ==="
echo ""

# 1. Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "[1/4] Updating existing installation..."
  git -C "$INSTALL_DIR" pull --quiet
else
  echo "[1/4] Cloning repository..."
  git clone --quiet "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# 2. Install dependencies & build
echo "[2/4] Installing dependencies & building..."
npm install --silent 2>/dev/null
npm run build --silent 2>/dev/null

# 3. Link CLI globally
echo "[3/4] Linking CLI..."
npm link --silent 2>/dev/null || {
  echo "       npm link failed (may need sudo). Trying with sudo..."
  sudo npm link --silent 2>/dev/null
}

# 4. Install Claude Code skills
echo "[4/4] Installing Claude Code skills..."

# CLI skill (always)
CLI_SKILL_DIR="$HOME/.claude/skills/flowcv-cli"
mkdir -p "$CLI_SKILL_DIR"
cp "$INSTALL_DIR/skill/cli-skill/SKILL.md" "$CLI_SKILL_DIR/SKILL.md"
echo "       CLI skill: $CLI_SKILL_DIR"

if [ "$SETUP_MCP" = true ]; then
  # MCP skill
  MCP_SKILL_DIR="$HOME/.claude/skills/flowcv"
  mkdir -p "$MCP_SKILL_DIR/references" "$MCP_SKILL_DIR/assets/src"
  cp "$INSTALL_DIR/skill/SKILL.md" "$MCP_SKILL_DIR/SKILL.md"
  cp "$INSTALL_DIR/skill/references/"*.md "$MCP_SKILL_DIR/references/"
  cp "$INSTALL_DIR/src/index.ts" "$MCP_SKILL_DIR/assets/src/index.ts"
  cp "$INSTALL_DIR/src/api-client.ts" "$MCP_SKILL_DIR/assets/src/api-client.ts"
  cp "$INSTALL_DIR/package.json" "$MCP_SKILL_DIR/assets/package.json"
  cp "$INSTALL_DIR/tsconfig.json" "$MCP_SKILL_DIR/assets/tsconfig.json"
  echo "       MCP skill: $MCP_SKILL_DIR"
fi

echo ""
echo "=== Installed ==="
echo ""
echo "  CLI:   $(which flowcv 2>/dev/null || echo "$INSTALL_DIR/dist/cli.js")"
echo "  Repo:  $INSTALL_DIR"
echo ""
echo "Next steps:"
echo ""
echo "  1. Authenticate:"
echo "     flowcv login"
echo ""

if [ "$SETUP_MCP" = true ]; then
  echo "  2. Add MCP server to Claude Code (pick one):"
  echo ""
  echo "     # Global (all projects):"
  echo "     claude mcp add -s user flowcv -- node $INSTALL_DIR/dist/index.js"
  echo ""
  echo "     # Current project only:"
  echo "     claude mcp add flowcv -- node $INSTALL_DIR/dist/index.js"
  echo ""
  echo "     The MCP server reads your cookie from ~/.config/flowcv/config.json"
  echo "     (set by 'flowcv login'), so no env var is needed."
  echo ""
fi
