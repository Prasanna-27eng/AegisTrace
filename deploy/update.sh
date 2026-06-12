#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AegisTrace — Redeploy / update script
# Run from /opt/aegistrace after pushing code changes:
#   cd /opt/aegistrace && bash deploy/update.sh
# Zero downtime: new image builds before old container is replaced.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/aegistrace"
cd "${APP_DIR}"

echo "[1/4] Pulling latest code..."
git pull origin main

echo "[2/4] Building new Docker image..."
docker compose build --no-cache

echo "[3/4] Restarting container (replaces running instance)..."
docker compose up -d

echo "[4/4] Health check..."
sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health || echo "000")
if [ "$STATUS" = "200" ]; then
  echo ""
  echo "  ✓ AegisTrace is up at https://aegistrace.uk"
  echo "  Container: $(docker compose ps --format 'table {{.Status}}' | tail -1)"
else
  echo ""
  echo "  ✗ Health check returned HTTP $STATUS — check logs:"
  echo "  docker compose logs --tail=50 aegistrace"
  exit 1
fi

# ── Prune old images to save disk space ──────────────────────────────────────
docker image prune -f > /dev/null
echo "  Old images pruned ✓"
