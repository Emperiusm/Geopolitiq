# Gambit Docker + CI/CD Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unified Docker Compose with dev/staging/prod profiles, production Dockerfile, Nginx reverse proxy, GitHub Actions CI/CD, and environment configuration — all testable locally before touching a VPS.

**Architecture:** Single `docker-compose.yml` with Docker Compose profiles to layer services. Base services (Mongo, Redis) run in every environment. Dev profile adds tooling (Mongo Express, Mailpit). Staging profile adds Nginx with mkcert HTTPS and built production images. Prod profile uses pre-built GHCR images with Let's Encrypt.

**Tech Stack:** Docker Compose profiles, Nginx (alpine), mkcert (local HTTPS), GitHub Actions, Bun multi-stage Docker builds, rclone + R2 backups.

**Spec:** User-provided infrastructure design (production topology diagrams + detailed spec in session prompt).

**Depends on:** [gambit-backend-infra-pipeline.md](2026-03-17-gambit-backend-infra-pipeline.md) (completed)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `.gitignore` | Add env files, certs, backups, build artifacts |
| Modify | `.env.example` | Full env template with all new vars |
| Modify | `docker-compose.yml` | Unified profiles: dev, staging, prod |
| Modify | `package.json` (root) | Convenience scripts for dev/staging/test |
| Create | `api/Dockerfile.production` | Multi-stage locked-down production image |
| Create | `docker/nginx/staging.conf` | Nginx config with mkcert SSL |
| Create | `docker/nginx/production.conf` | Nginx config with Let's Encrypt SSL |
| Create | `docker/nginx/security-headers.conf` | CSP, HSTS, X-Frame-Options |
| Create | `.github/workflows/test.yml` | Run tests + typecheck on PR |
| Create | `.github/workflows/deploy.yml` | Build API + frontend, deploy on push to main |
| Create | `.github/workflows/backup.yml` | Nightly Mongo backup to R2 |
| Create | `api/.dockerignore` | Exclude node_modules, tests, .git from Docker context |
| Create | `docker/certs/localhost.pem` | mkcert local HTTPS cert (gitignored) |
| Create | `docker/certs/localhost-key.pem` | mkcert local HTTPS key (gitignored) |

---

## Task 1: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Update `.gitignore` with all necessary entries**

Replace the current single-line `.gitignore` with:

```gitignore
node_modules
.env
.env.staging
.env.production
docker/certs/
backups/
certbot/
*.tar.gz
dist/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: expand .gitignore for env files, certs, backups, build artifacts"
```

---

## Task 2: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace `.env.example` with full template**

```bash
# ═══════════════════════════════════════════════════
# Gambit Environment Configuration
# Copy to .env for local dev, .env.production for prod
# ═══════════════════════════════════════════════════

# ── Core ──────────────────────────────────────────
NODE_ENV=development            # development | production
PORT=3000

# ── Data ──────────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/gambit
REDIS_URL=redis://localhost:6380    # local: 6380 (remapped), Docker internal: 6379

# ── Auth ──────────────────────────────────────────
JWT_SECRET=change-me-to-64-random-chars
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=               # optional
GOOGLE_CLIENT_SECRET=           # optional
FRONTEND_URL=http://localhost:5173

# ── CORS ──────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ── Rate Limiting ─────────────────────────────────
RATE_LIMIT_RPM=100

# ── SSE ───────────────────────────────────────────
SSE_HEARTBEAT_MS=30000
SSE_BUFFER_SIZE=100

# ── RSS Ingestion ─────────────────────────────────
NEWS_POLL_FAST_MS=900000        # 15 min
NEWS_POLL_STANDARD_MS=3600000   # 1 hr
NEWS_POLL_SLOW_MS=14400000      # 4 hr
NEWS_BATCH_CONCURRENCY=15
NEWS_FEED_TIMEOUT_MS=8000
NEWS_OVERALL_DEADLINE_MS=25000

# ── Encryption ────────────────────────────────────
SETTINGS_ENCRYPTION_KEY=        # 32-byte hex for AES-256-GCM (generate: openssl rand -hex 32)

# ── AI Analysis ───────────────────────────────────
AI_MAX_CLUSTERS_PER_CYCLE=10

# ── Anomaly Detection ─────────────────────────────
ANOMALY_THRESHOLD_WATCH=2
ANOMALY_THRESHOLD_ALERT=3
ANOMALY_THRESHOLD_CRITICAL=4
ANOMALY_BASELINE_HOURS=168

# ── Email (dev: Mailpit, prod: SMTP) ─────────────
SMTP_HOST=localhost
SMTP_PORT=1025                  # Mailpit in dev
SMTP_FROM=noreply@gambit.local
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: expand .env.example with full config template"
```

---

## Task 3: Create security headers config

**Files:**
- Create: `docker/nginx/security-headers.conf`

- [ ] **Step 1: Create directory and write security headers**

```bash
mkdir -p docker/nginx
```

Write `docker/nginx/security-headers.conf`:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https: wss:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; worker-src 'self' blob:; font-src 'self' data: https:; frame-ancestors 'none'" always;
```

- [ ] **Step 2: Commit**

```bash
git add docker/nginx/security-headers.conf
git commit -m "feat: add Nginx security headers (CSP, HSTS, X-Frame-Options)"
```

---

## Task 4: Create staging Nginx config

**Files:**
- Create: `docker/nginx/staging.conf`

- [ ] **Step 1: Write staging Nginx config with mkcert SSL**

Write `docker/nginx/staging.conf`:

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;

  gzip on;
  gzip_min_length 1024;
  gzip_comp_level 5;
  gzip_types text/plain text/css text/javascript application/javascript
             application/json application/xml image/svg+xml;

  server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/localhost.pem;
    ssl_certificate_key /etc/nginx/certs/localhost-key.pem;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers applied at server level
    include /etc/nginx/security_headers.conf;

    # Frontend — SPA fallback
    location / {
      try_files $uri $uri/ /index.html;
      add_header Cache-Control "no-cache";
    }

    # Hashed assets — immutable cache
    location ~* ^/assets/ {
      try_files $uri =404;
      add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API proxy
    location /api/ {
      proxy_pass http://api-staging:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # SSE support
      proxy_set_header Connection "";
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 86400s;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add docker/nginx/staging.conf
git commit -m "feat: add staging Nginx config with mkcert SSL and SSE proxy"
```

---

## Task 5: Create production Nginx config

**Files:**
- Create: `docker/nginx/production.conf`

- [ ] **Step 1: Write production Nginx config with Let's Encrypt**

Write `docker/nginx/production.conf`:

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;

  gzip on;
  gzip_min_length 1024;
  gzip_comp_level 5;
  gzip_types text/plain text/css text/javascript application/javascript
             application/json application/xml image/svg+xml;

  server {
    listen 80;
    server_name gambit.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }

    location / {
      return 301 https://$host$request_uri;
    }
  }

  server {
    listen 443 ssl;
    server_name gambit.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/gambit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gambit.yourdomain.com/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers applied at server level
    include /etc/nginx/security_headers.conf;

    # Frontend — SPA fallback
    location / {
      try_files $uri $uri/ /index.html;
      add_header Cache-Control "no-cache";
    }

    # Hashed assets — immutable cache
    location ~* ^/assets/ {
      try_files $uri =404;
      add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API proxy
    location /api/ {
      proxy_pass http://api-prod:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # SSE support
      proxy_set_header Connection "";
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 86400s;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add docker/nginx/production.conf
git commit -m "feat: add production Nginx config with Let's Encrypt SSL"
```

---

## Task 6: Create `api/.dockerignore`

**Files:**
- Create: `api/.dockerignore`

- [ ] **Step 1: Write `.dockerignore` to exclude build noise from Docker context**

Write `api/.dockerignore`:

```
node_modules
dist
.git
tests
*.md
.env*
Dockerfile*
```

Without this, every `docker build` copies `node_modules` and test files into the build context, significantly slowing builds.

- [ ] **Step 2: Commit**

```bash
git add api/.dockerignore
git commit -m "chore: add api/.dockerignore to speed up Docker builds"
```

---

## Task 7: Create production Dockerfile

**Files:**
- Create: `api/Dockerfile.production`

- [ ] **Step 1: Write multi-stage production Dockerfile**

Write `api/Dockerfile.production`:

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install
COPY src/ ./src/
COPY tsconfig.json ./
RUN bun x tsc --noEmit

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup -S gambit && adduser -S gambit -G gambit
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production 2>/dev/null || bun install --production
COPY --from=builder /app/src ./src

RUN mkdir -p /app/plugins && chown gambit:gambit /app/plugins

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

USER gambit
EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

- [ ] **Step 2: Test production Dockerfile builds**

Run: `cd api && docker build -f Dockerfile.production -t gambit-api:test .`
Expected: Build succeeds, typecheck passes in builder stage.

- [ ] **Step 3: Commit**

```bash
git add api/Dockerfile.production
git commit -m "feat: add multi-stage production Dockerfile with non-root user and healthcheck"
```

---

## Task 8: Rewrite `docker-compose.yml` with profiles

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Replace `docker-compose.yml` with unified profile-based config**

Replace the entire file with the unified compose file. Key changes from current:
- **Base services** (mongo, redis): Add healthchecks, backup volume to mongo, `maxmemory` to redis.
- **Dev profile**: New `api-dev` (source-mounted, relaxed polling), keep `mongo-express`, add `mailpit`. Remove old `api` and `frontend` services.
- **Staging profile**: New `api-staging` (Dockerfile.production), `nginx-staging` (mkcert SSL, built frontend).
- **Prod profile**: New `api-prod` (GHCR image), `nginx-prod` (Let's Encrypt), `certbot` (auto-renewal).

Full replacement content:

```yaml
# docker-compose.yml — profiles: dev, staging, prod

services:
  # ═══════════════════════════════════════════════════
  # BASE SERVICES (always run)
  # ═══════════════════════════════════════════════════

  mongo:
    container_name: gambit-mongo
    image: mongo:7
    restart: unless-stopped
    ports: ["27017:27017"]      # Remove or bind to 127.0.0.1 in prod
    volumes:
      - mongo-data:/data/db
      - ./backups:/backups
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    container_name: gambit-redis
    image: redis:7-alpine
    restart: unless-stopped
    ports: ["6380:6379"]        # Remove or bind to 127.0.0.1 in prod
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # ═══════════════════════════════════════════════════
  # DEV PROFILE — tools for local development
  # ═══════════════════════════════════════════════════

  api-dev:
    container_name: gambit-api-dev
    build: ./api
    ports: ["3000:3000"]
    env_file: .env
    environment:
      MONGO_URI: mongodb://mongo:27017/gambit
      REDIS_URL: redis://redis:6379
      PORT: "3000"
      NODE_ENV: development
      CORS_ORIGINS: http://localhost:5173,http://localhost:3000
      RATE_LIMIT_RPM: "1000"
      NEWS_POLL_FAST_MS: "1800000"
      NEWS_POLL_STANDARD_MS: "3600000"
      NEWS_POLL_SLOW_MS: "14400000"
    depends_on:
      mongo: { condition: service_healthy }
      redis: { condition: service_healthy }
    volumes:
      - ./api/src:/app/src
      - ./.firecrawl:/app/.firecrawl:ro
    profiles: ["dev"]

  mongo-express:
    container_name: gambit-mongo-express
    image: mongo-express:latest
    ports: ["8081:8081"]
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://mongo:27017
    depends_on:
      mongo: { condition: service_healthy }
    profiles: ["dev"]

  mailpit:
    container_name: gambit-mailpit
    image: axllent/mailpit
    ports:
      - "8025:8025"
      - "1025:1025"
    profiles: ["dev"]

  # ═══════════════════════════════════════════════════
  # STAGING PROFILE — local production simulation
  # ═══════════════════════════════════════════════════

  api-staging:
    container_name: gambit-api-staging
    build:
      context: ./api
      dockerfile: Dockerfile.production
    ports: ["3000:3000"]
    environment:
      MONGO_URI: mongodb://mongo:27017/gambit
      REDIS_URL: redis://redis:6379
      PORT: "3000"
      NODE_ENV: production
      CORS_ORIGINS: https://localhost
      FRONTEND_URL: https://localhost
      JWT_SECRET: ${JWT_SECRET:-staging-secret-change-for-production}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      SETTINGS_ENCRYPTION_KEY: ${SETTINGS_ENCRYPTION_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}
    depends_on:
      mongo: { condition: service_healthy }
      redis: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3
    profiles: ["staging"]

  nginx-staging:
    container_name: gambit-nginx-staging
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/staging.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/security-headers.conf:/etc/nginx/security_headers.conf:ro
      - ./docker/certs:/etc/nginx/certs:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on: [api-staging]
    profiles: ["staging"]

  # ═══════════════════════════════════════════════════
  # PROD PROFILE — actual production (on VPS)
  # ═══════════════════════════════════════════════════

  api-prod:
    container_name: gambit-api
    image: ghcr.io/${GITHUB_REPOSITORY:-your-org/gambit}/api:latest
    restart: unless-stopped
    ports: ["3000:3000"]
    env_file: .env.production
    depends_on:
      mongo: { condition: service_healthy }
      redis: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3
    profiles: ["prod"]

  nginx-prod:
    container_name: gambit-nginx
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/production.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/security-headers.conf:/etc/nginx/security_headers.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on: [api-prod]
    profiles: ["prod"]

  certbot:
    container_name: gambit-certbot
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    profiles: ["prod"]

volumes:
  mongo-data:
```

- [ ] **Step 2: Verify base services start with healthchecks**

Run: `docker compose up -d mongo redis`
Expected: Both containers start, healthchecks pass within 30s.

Run: `docker compose ps`
Expected: Both show `healthy` status.

- [ ] **Step 3: Verify dev profile starts all dev services**

Run: `docker compose --profile dev up -d`
Expected: `api-dev`, `mongo-express`, `mailpit` start alongside base services.

Run: `docker compose --profile dev down`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: rewrite docker-compose.yml with unified dev/staging/prod profiles"
```

---

## Task 9: Create GitHub Actions — test workflow

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Create directory and write test workflow**

```bash
mkdir -p .github/workflows
```

Write `.github/workflows/test.yml`:

```yaml
name: Test
on: [pull_request]
jobs:
  test-api:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: [27017:27017]
        options: --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'" --health-interval 10s
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
        options: --health-cmd "redis-cli ping" --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: cd api && bun install
      - run: cd api && bun run typecheck
      - run: cd api && bun test
        env:
          MONGO_URI: mongodb://localhost:27017/gambit-test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-jwt-secret-for-ci-do-not-use-in-production-1234567890
          SETTINGS_ENCRYPTION_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add test workflow — typecheck + tests with Mongo/Redis services"
```

---

## Task 10: Create GitHub Actions — deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write build and deploy workflow**

Write `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
jobs:
  build-api:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: ./api
          file: ./api/Dockerfile.production
          push: true
          tags: ghcr.io/${{ github.repository }}/api:latest,ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: cd frontend && bun install && bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist/

  deploy:
    needs: [build-api, build-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: frontend-dist/
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/gambit
            # Save current image ID for rollback
            PREV_IMAGE=$(docker inspect --format='{{.Image}}' gambit-api 2>/dev/null || echo "")
            docker compose --profile prod pull api-prod
            docker compose --profile prod up -d api-prod
            sleep 10
            if ! curl -f http://localhost:3000/api/v1/health; then
              echo "Health check failed — rolling back"
              docker compose --profile prod logs api-prod --tail 50
              if [ -n "$PREV_IMAGE" ]; then
                docker tag "$PREV_IMAGE" ghcr.io/${{ github.repository }}/api:latest
                docker compose --profile prod up -d api-prod
              fi
              exit 1
            fi
      - name: Sync frontend dist to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "frontend-dist/*"
          target: "/opt/gambit/frontend/dist/"
          strip_components: 1
      - name: Reload Nginx
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: docker exec gambit-nginx nginx -s reload
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add build & deploy workflow — GHCR image + VPS SSH deploy"
```

---

## Task 11: Create GitHub Actions — backup workflow

**Files:**
- Create: `.github/workflows/backup.yml`

- [ ] **Step 1: Write nightly backup workflow**

Write `.github/workflows/backup.yml`:

```yaml
name: Nightly Backup
on:
  schedule:
    - cron: "0 3 * * *"
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Run backup
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            BACKUP_NAME="$(date +%Y-%m-%d)"
            docker exec gambit-mongo mongodump --db=gambit --out="/backups/$BACKUP_NAME"
            tar -czf "/opt/gambit/backups/${BACKUP_NAME}.tar.gz" -C /opt/gambit/backups "$BACKUP_NAME"
            rm -rf "/opt/gambit/backups/$BACKUP_NAME"
            rclone copy "/opt/gambit/backups/${BACKUP_NAME}.tar.gz" r2:gambit-backups/
            find /opt/gambit/backups -name "*.tar.gz" -mtime +7 -delete
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/backup.yml
git commit -m "ci: add nightly Mongo backup workflow — dump, compress, upload to R2"
```

---

## Task 12: Update root `package.json` with convenience scripts

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Replace scripts section with infrastructure convenience scripts**

Replace the `scripts` section in root `package.json`:

```json
{
  "scripts": {
    "dev": "docker compose up -d mongo redis && cd api && bun dev",
    "dev:docker": "docker compose --profile dev up -d",
    "dev:stop": "docker compose down",
    "staging": "cd frontend && bun run build && cd .. && docker compose --profile staging up -d --build",
    "staging:stop": "docker compose --profile staging down",
    "seed": "cd api && bun src/seed/seed-all.ts",
    "test": "cd api && bun test",
    "test:watch": "cd api && bun test --watch",
    "typecheck": "cd api && bun run typecheck",
    "backup": "docker exec gambit-mongo mongodump --db=gambit --out=/backups/manual-$(date +%Y%m%d)",
    "logs": "docker compose logs -f",
    "logs:api": "docker compose logs -f api-dev || docker compose logs -f api-staging",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

Note: The existing `dev` (Vite), `build`, `preview`, `typecheck` scripts are replaced. Frontend Vite dev is accessed via `cd frontend && bun dev` separately, or through the `dev:docker` profile.

- [ ] **Step 2: Rename package from `geopolitiq` to `gambit`**

Also update the `name` field in root `package.json` from `"geopolitiq"` to `"gambit"`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: rename package to gambit, add convenience scripts for dev/staging/test/backup workflows"
```

---

## Task 13: Generate local mkcert certificates for staging

**Files:**
- Create: `docker/certs/localhost.pem` (gitignored)
- Create: `docker/certs/localhost-key.pem` (gitignored)

> **Prerequisite:** `mkcert` must be installed. On Windows: `choco install mkcert` or `scoop install mkcert`. On macOS: `brew install mkcert`.

- [ ] **Step 1: Install mkcert root CA and generate local certs**

```bash
mkcert -install
mkdir -p docker/certs
mkcert -cert-file docker/certs/localhost.pem -key-file docker/certs/localhost-key.pem localhost 127.0.0.1
```

Expected: Two files created in `docker/certs/`. These are gitignored so no commit needed.

- [ ] **Step 2: Verify certs exist**

```bash
ls docker/certs/
```

Expected: `localhost.pem` and `localhost-key.pem` listed.

---

## Task 14: Smoke test the full stack locally

- [ ] **Step 1: Verify base services start clean**

```bash
docker compose down -v
docker compose up -d mongo redis
docker compose ps
```

Expected: Both `gambit-mongo` and `gambit-redis` show `healthy`.

- [ ] **Step 2: Verify production Dockerfile builds**

```bash
cd api && docker build -f Dockerfile.production -t gambit-api:test .
```

Expected: Build succeeds (typecheck passes in builder stage, runtime image created with non-root user).

- [ ] **Step 3: Verify dev profile**

```bash
docker compose --profile dev up -d
```

Expected: `api-dev`, `mongo-express` (port 8081), `mailpit` (port 8025) all start.

```bash
curl http://localhost:3000/api/v1/health
docker compose --profile dev down
```

Expected: Health check returns `{"status":"ok",...}`.

- [ ] **Step 4: Verify staging profile (requires Task 13 mkcert certs)**

> Skip this step if mkcert certs were not generated in Task 13.

```bash
docker compose --profile staging up -d --build
```

Expected: `api-staging` and `nginx-staging` start. The API builds using `Dockerfile.production`.

```bash
curl -k https://localhost/api/v1/health
```

Expected: Health check returns `{"status":"ok",...}` through Nginx HTTPS proxy.

```bash
docker compose --profile staging down
```

- [ ] **Step 5: Clean up**

```bash
docker compose down -v
docker rmi gambit-api:test 2>/dev/null
```

- [ ] **Step 6: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```

Only commit if changes were needed during smoke testing.
