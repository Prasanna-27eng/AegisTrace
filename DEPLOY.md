# AegisTrace — Deployment Guide

## Admin Credentials
- **Email:** prasanna80564@gmail.com
- **Password:** aegis2025 (set via ADMIN_PIN env var on first boot)

> Change your password after first login via Admin → Your Account → Change Password

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db GROQ_API_KEY=your_key VIRUSTOTAL_API_KEY=your_key ADMIN_PIN=aegis2025 uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start   # runs on :3000, proxies API to :8000
```

---

## Docker Build & Run

```bash
docker build -t aegistrace .
docker run -p 8000:8000 \
  -e GROQ_API_KEY=your_groq_key_here \
  -e VIRUSTOTAL_API_KEY=your_vt_key_here \
  -e ADMIN_PIN=aegis2025 \
  -v aegistrace_data:/var/data \
  aegistrace
```

App available at: http://localhost:8000

---

## Deploy to Render.com

1. Push this repo to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Render auto-detects `render.yaml`
5. Set environment variables in Render dashboard:
   - `GROQ_API_KEY`
   - `VIRUSTOTAL_API_KEY`
   - `ADMIN_PIN`
   - `PUBLIC_URL` (your Render URL)
6. Click Deploy

The app will be live at: `https://aegistrace.onrender.com`

### Add Custom Domain
1. Render Dashboard → Settings → Custom Domains
2. Add your domain
3. Update DNS CNAME → your-app.onrender.com
4. HTTPS is automatic

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| DATABASE_URL | No | sqlite:////var/data/aegistrace.db | Database connection |
| GROQ_API_KEY | Yes | — | Groq AI API key |
| VIRUSTOTAL_API_KEY | Yes | — | VirusTotal API v3 key |
| ADMIN_PIN | No | aegis2025 | Admin account password |
| JWT_SECRET | No | auto-generated | JWT signing secret |
| PUBLIC_URL | No | — | Your public URL for share links |

---

## Architecture

```
Browser → React SPA (/app/*, /portfolio, /public/*)
        → FastAPI (/api/*)
        → SQLite (/var/data/aegistrace.db)
        → Groq API (AI analysis)
        → VirusTotal API (IOC enrichment)
```
