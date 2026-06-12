#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AegisTrace — First-time VPS setup
# Run as root on a fresh Ubuntu 22.04 server:
#   curl -fsSL https://raw.githubusercontent.com/<YOU>/aegistrace/main/deploy/setup.sh | bash
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="aegistrace.uk"
APP_DIR="/opt/aegistrace"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   AegisTrace — VPS Bootstrap                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. System update ──────────────────────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# ── 2. Install Docker ─────────────────────────────────────────────────────────
echo "[2/8] Installing Docker..."
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
echo "  Docker $(docker --version | awk '{print $3}' | tr -d ',') installed ✓"

# ── 3. Install Nginx & Git ────────────────────────────────────────────────────
echo "[3/8] Installing Nginx and Git..."
apt-get install -y -qq nginx git
systemctl enable nginx

# ── 4. Firewall ───────────────────────────────────────────────────────────────
echo "[4/8] Configuring UFW firewall..."
apt-get install -y -qq ufw
# Cloudflare only uses 80 + 443. Keep 22 for SSH.
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP"
ufw allow 443/tcp  comment "HTTPS"
ufw --force enable
echo "  UFW enabled: 22, 80, 443 open ✓"

# ── 5. SSL directory ──────────────────────────────────────────────────────────
echo "[5/8] Creating SSL certificate directory..."
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl

# ── 6. App directory ──────────────────────────────────────────────────────────
echo "[6/8] Creating app directory..."
mkdir -p "${APP_DIR}"

# ── 7. Nginx config ───────────────────────────────────────────────────────────
echo "[7/8] Installing Nginx site config..."
# If you've cloned the repo to /opt/aegistrace already, copy from there:
if [ -f "${APP_DIR}/deploy/nginx.conf" ]; then
  cp "${APP_DIR}/deploy/nginx.conf" "/etc/nginx/sites-available/${DOMAIN}"
  ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && echo "  Nginx config valid ✓"
else
  echo "  (Skipping — copy deploy/nginx.conf manually after cloning)"
fi

# ── 8. Swap (important for low-memory VPS during Docker build) ───────────────
echo "[8/8] Setting up 1 GB swap..."
if ! swapon --show | grep -q swapfile; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  Swap 1 GB created ✓"
else
  echo "  Swap already exists, skipping ✓"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  Server bootstrap complete."
echo ""
echo "  NEXT STEPS — run in order:"
echo ""
echo "  1. Clone your repo:"
echo "     git clone https://github.com/<YOU>/aegistrace ${APP_DIR}"
echo ""
echo "  2. Create your .env:"
echo "     cp ${APP_DIR}/.env.example ${APP_DIR}/.env"
echo "     nano ${APP_DIR}/.env"
echo "     (set DATABASE_URL, GROQ_API_KEY, ADMIN_PIN, JWT_SECRET, PUBLIC_URL=https://${DOMAIN})"
echo ""
echo "  3. Add Cloudflare Origin Certificate:"
echo "     nano /etc/nginx/ssl/${DOMAIN}.pem   ← paste certificate"
echo "     nano /etc/nginx/ssl/${DOMAIN}.key   ← paste private key"
echo "     chmod 600 /etc/nginx/ssl/*"
echo ""
echo "  4. Install nginx config (if not done above):"
echo "     cp ${APP_DIR}/deploy/nginx.conf /etc/nginx/sites-available/${DOMAIN}"
echo "     ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}"
echo "     rm -f /etc/nginx/sites-enabled/default"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  5. Build & start AegisTrace:"
echo "     cd ${APP_DIR}"
echo "     docker compose up -d --build"
echo ""
echo "  6. Check it's running:"
echo "     docker compose ps"
echo "     curl http://localhost:8000/api/health"
echo "══════════════════════════════════════════════════"
