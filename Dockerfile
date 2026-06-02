# ─────────────────────────────────────────────
# Stage 1: Build React frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json ./
RUN npm install

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Python backend + frontend bundle
# ─────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend/static
COPY --from=frontend-build /app/frontend/build ./static

# Persistent data directory
RUN mkdir -p /var/data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
