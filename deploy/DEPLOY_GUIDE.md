# Deploying AegisTrace to a VPS at aegistrace.uk

## Overview

| What | Where |
|------|-------|
| DNS & CDN | Cloudflare (you already own aegistrace.uk) |
| App hosting | Your paid VPS (Ubuntu 22.04) |
| Stack | Docker → Nginx → AegisTrace (FastAPI + React) |
| SSL | Cloudflare Origin Certificate (free, 15-year) |

---

## Step 1 — Choose & provision your VPS

Recommended providers (all Ubuntu 22.04):

| Provider | Plan | RAM | Price | Notes |
|----------|------|-----|-------|-------|
| **Hetzner** | CX22 | 4 GB | €4.49/mo | Best value, Frankfurt ← closest to Render region |
| DigitalOcean | Basic | 2 GB | $6/mo | Good docs |
| Vultr | Regular | 2 GB | $6/mo | Fast spin-up |

**Minimum spec:** 2 GB RAM, 20 GB disk. The Docker build needs ~1.5 GB RAM (that's why `setup.sh` adds 1 GB swap).

After provisioning, note your **VPS public IP address**.

---

## Step 2 — Cloudflare DNS

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **aegistrace.uk** → **DNS**
2. Add two A records:

| Type | Name | IPv4 address | Proxy status |
|------|------|-------------|--------------|
| A | `@` | `YOUR_VPS_IP` | **Proxied** (orange cloud ☁️) |
| A | `www` | `YOUR_VPS_IP` | **Proxied** (orange cloud ☁️) |

3. Go to **SSL/TLS** → set mode to **Full (Strict)**

> "Proxied" means Cloudflare acts as your CDN, hides your VPS IP, and handles DDoS protection — highly recommended for a security product.

---

## Step 3 — Cloudflare Origin Certificate

This is a free TLS certificate that covers the Cloudflare → your server leg.

1. Cloudflare dashboard → **aegistrace.uk** → **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Settings:
   - Key type: RSA (2048)
   - Hostnames: `aegistrace.uk`, `*.aegistrace.uk`
   - Validity: **15 years**
4. Click **Create**
5. Copy **Origin Certificate** → paste into `/etc/nginx/ssl/aegistrace.uk.pem` on your VPS
6. Copy **Private Key** → paste into `/etc/nginx/ssl/aegistrace.uk.key` on your VPS

```bash
# On the VPS, after pasting the cert:
chmod 600 /etc/nginx/ssl/aegistrace.uk.pem
chmod 600 /etc/nginx/ssl/aegistrace.uk.key
```

---

## Step 4 — Bootstrap the VPS

SSH into your new server as root:

```bash
ssh root@YOUR_VPS_IP
```

Run the setup script (installs Docker, Nginx, UFW, swap):

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB/aegistrace/main/deploy/setup.sh | bash
# OR if you've cloned already:
bash /opt/aegistrace/deploy/setup.sh
```

---

## Step 5 — Clone & configure

```bash
# Clone your repo
git clone https://github.com/YOUR_GITHUB/aegistrace /opt/aegistrace
cd /opt/aegistrace

# Create .env from the example
cp .env.example .env
nano .env
```

Edit `.env` — the critical values:

```bash
DATABASE_URL=sqlite:////var/data/aegistrace.db
PUBLIC_URL=https://aegistrace.uk          # ← change from Render URL to this
ADMIN_PIN=your_secure_pin_here
JWT_SECRET=generate_with_openssl_rand_hex_32  # see below
GROQ_API_KEY=your_key
VIRUSTOTAL_API_KEY=your_key

# Generate a secure JWT_SECRET:
# openssl rand -hex 32
```

---

## Step 6 — Nginx config

```bash
cp /opt/aegistrace/deploy/nginx.conf /etc/nginx/sites-available/aegistrace.uk
ln -sf /etc/nginx/sites-available/aegistrace.uk /etc/nginx/sites-enabled/aegistrace.uk
rm -f /etc/nginx/sites-enabled/default

# Test & reload
nginx -t
systemctl reload nginx
```

---

## Step 7 — Build & launch

```bash
cd /opt/aegistrace
docker compose up -d --build
```

This takes 3–5 minutes on first run (building the React frontend + installing Python deps).

Check it's healthy:

```bash
docker compose ps
docker compose logs -f aegistrace     # Ctrl+C to exit
curl http://localhost:8000/api/health  # should return {"status":"ok"}
```

Then visit **https://aegistrace.uk** — it should load.

---

## Step 8 — Migrate data from Render (if needed)

If you have existing data on Render, download it before cancelling:

**On Render dashboard:**
1. Go to your service → **Shell**
2. Run: `sqlite3 /var/data/aegistrace.db .dump > /tmp/aegistrace-export.sql`
3. Download via: `cat /tmp/aegistrace-export.sql`

**On your VPS:**
```bash
# Copy the SQL dump to the VPS, then:
docker compose exec -T aegistrace sqlite3 /var/data/aegistrace.db < aegistrace-export.sql
```

Or use the backup restore approach:
```bash
# On Render shell: tar the data directory and download it
# Then on VPS, restore into the Docker volume:
docker run --rm -v aegistrace_aegistrace-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/aegistrace-backup.tar.gz -C /data
```

---

## Updating after code changes

```bash
cd /opt/aegistrace
bash deploy/update.sh
```

This pulls latest code, rebuilds the image, replaces the container, and runs a health check.

---

## Useful commands

```bash
# Live logs
docker compose logs -f aegistrace

# Restart without rebuild
docker compose restart aegistrace

# Open a shell inside the container
docker compose exec aegistrace bash

# Backup the database
docker run --rm \
  -v aegistrace_aegistrace-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/aegistrace-$(date +%Y%m%d).tar.gz -C /data .

# Check resource usage
docker stats aegistrace

# Nginx reload after config change
nginx -t && systemctl reload nginx
```

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 Bad Gateway | `docker compose ps` — is the container running? `docker compose logs` for errors |
| SSL error in browser | Did you set Cloudflare SSL/TLS to **Full (Strict)**? Are the cert files in `/etc/nginx/ssl/`? |
| DNS not resolving | Cloudflare propagation can take up to 5 min. Check with `dig aegistrace.uk` |
| Build runs out of memory | The 1 GB swap in `setup.sh` covers this. If still failing, upgrade to 4 GB RAM VPS |
| Can't reach VPS on 443 | `ufw status` — confirm 443 is open. Also check your VPS provider's firewall rules (Hetzner/DO have their own panel firewall too) |
