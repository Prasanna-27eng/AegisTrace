#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# AegisTrace Endpoint Agent v5.0 — One-Command Installer
#
# Usage:
#   bash install.sh <TOKEN> <AGENT_ID> [SERVER_URL] [AUTO_BLOCK]
#
# Examples:
#   bash install.sh mytoken myhostname
#   bash install.sh mytoken myhostname https://primary.com,https://backup.com alert
#
# AUTO_BLOCK values: off | alert | block  (default: alert)
# ─────────────────────────────────────────────────────────────────
set -e

AGENT_TOKEN=${1:-""}
AGENT_ID=${2:-"$(hostname)"}
SERVER_URL=${3:-"https://aegistrace-7qvn.onrender.com"}
AUTO_BLOCK=${4:-"alert"}

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         AegisTrace Endpoint Agent v5.0 Installer        ║"
echo "║  🍯 Honey Token Trap · DNS/DGA · Guardian · Auto-Block  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$AGENT_TOKEN" ]; then
    echo "ERROR: Agent token required."
    echo "Usage: bash install.sh <TOKEN> <AGENT_ID>"
    echo ""
    echo "Get your token from: ${SERVER_URL}/app/endpoints"
    exit 1
fi

echo "→ Server:   ${SERVER_URL}"
echo "→ Agent ID: ${AGENT_ID}"
echo ""

# ── Detect Python ────────────────────────────────────────────────
PYTHON=""
for py in python3 python; do
    if command -v "$py" &>/dev/null; then
        VER=$($py --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 8 ]; then
            PYTHON="$py"
            echo "✓ Python $VER found: $PYTHON"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    echo "ERROR: Python 3.8+ required but not found."
    echo "Install Python: https://python.org/downloads"
    exit 1
fi

# ── Install psutil ────────────────────────────────────────────────
echo "→ Installing psutil..."
$PYTHON -m pip install psutil --quiet --break-system-packages 2>/dev/null || \
$PYTHON -m pip install psutil --quiet 2>/dev/null || \
echo "  WARNING: psutil install failed — agent will run in reduced mode"

# ── Download agent script ─────────────────────────────────────────
INSTALL_DIR="$HOME/.aegistrace"
mkdir -p "$INSTALL_DIR"

if command -v curl &>/dev/null; then
    curl -sSL "${SERVER_URL}/agent/aegistrace_agent.py" -o "$INSTALL_DIR/aegistrace_agent.py" 2>/dev/null || true
fi

# If download failed or we're running from source, copy from current dir
if [ ! -f "$INSTALL_DIR/aegistrace_agent.py" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/aegistrace_agent.py" ]; then
        cp "$SCRIPT_DIR/aegistrace_agent.py" "$INSTALL_DIR/aegistrace_agent.py"
        echo "✓ Agent script copied from local source"
    else
        echo "ERROR: Could not find or download aegistrace_agent.py"
        exit 1
    fi
else
    echo "✓ Agent script downloaded"
fi

# ── Write config ──────────────────────────────────────────────────
cat > "$INSTALL_DIR/aegistrace.env" << EOF
export AEGISTRACE_TOKEN="${AGENT_TOKEN}"
export AEGISTRACE_AGENT_ID="${AGENT_ID}"
export AEGISTRACE_SERVER="${SERVER_URL}"
export AEGISTRACE_POLL_INTERVAL="30"
export AEGISTRACE_CMD_INTERVAL="10"
export AEGISTRACE_AUTO_BLOCK="${AUTO_BLOCK}"
export AEGISTRACE_HONEY_TOKENS="true"
EOF

echo "✓ Config written to $INSTALL_DIR/aegistrace.env"

# ── Run connectivity check ────────────────────────────────────────
echo ""
echo "→ Testing connectivity..."
export AEGISTRACE_TOKEN="${AGENT_TOKEN}"
export AEGISTRACE_AGENT_ID="${AGENT_ID}"
export AEGISTRACE_SERVER="${SERVER_URL}"
$PYTHON "$INSTALL_DIR/aegistrace_agent.py" --check || true

# ── Create startup script ─────────────────────────────────────────
cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/bash
source "$INSTALL_DIR/aegistrace.env"
exec $PYTHON "$INSTALL_DIR/aegistrace_agent.py" "\$@"
EOF
chmod +x "$INSTALL_DIR/start.sh"

# ── Register as service ───────────────────────────────────────────
echo ""
echo "→ Registering as system service..."
source "$INSTALL_DIR/aegistrace.env"
$PYTHON "$INSTALL_DIR/aegistrace_agent.py" --install-service 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    Install Complete!                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  To start manually:  $INSTALL_DIR/start.sh"
echo "  To run once:        $INSTALL_DIR/start.sh --once"
echo "  To test:            $INSTALL_DIR/start.sh --check"
echo ""
echo "  Agent will report to: ${SERVER_URL}/app/endpoints"
echo ""
