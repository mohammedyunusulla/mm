# Infrastructure Architecture

This document describes the production infrastructure for Mandi Manager — how the application is deployed, what services run where, and how they connect.

---

## 1. Deployment Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Internet                                    │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────────┐    ┌──────────────────────────────────┐
│         Vercel             │    │           Railway                 │
│    (Frontend Hosting)      │    │      (Backend + Database)         │
│                            │    │                                   │
│  ┌──────────────────────┐  │    │  ┌─────────────────────────────┐ │
│  │   Next.js 15 App     │  │    │  │   Express API               │ │
│  │                      │  │    │  │   (mellow-kindness)         │ │
│  │   Static + SSR       │──┼────┼─▶│   Port 4000                 │ │
│  │   Edge Network       │  │    │  │                             │ │
│  │                      │  │    │  │   Nixpacks (Node 20)        │ │
│  └──────────────────────┘  │    │  └──────────────┬──────────────┘ │
│                            │    │                  │                │
│  URL:                      │    │  ┌───────────────▼──────────────┐ │
│  mandi-manager.vercel.app  │    │  │   PostgreSQL 18              │ │
│                            │    │  │   (Railway managed)          │ │
│                            │    │  │                              │ │
│                            │    │  │   Master DB + Tenant DBs     │ │
│                            │    │  │   500 MB volume              │ │
│                            │    │  └──────────────────────────────┘ │
│                            │    │                                   │
│                            │    │  URL: mellow-kindness-            │
│                            │    │  production-6d20.up.railway.app   │
└────────────────────────────┘    └───────────────────────────────────┘
```

---

## 2. Service Inventory

| Service | Platform | Type | URL |
|---------|----------|------|-----|
| Frontend (Next.js) | Vercel | Serverless + Edge | `https://mandi-manager.vercel.app` |
| Backend API (Express) | Railway | Container (Nixpacks) | `https://mellow-kindness-production-6d20.up.railway.app` |
| PostgreSQL | Railway | Managed Database | Internal: `postgres.railway.internal:5432` |
| Source Code | GitHub | Repository | `https://github.com/mohammedyunusulla/mm` |

---

## 3. Railway Backend

### Build Pipeline

Configured in `railway.toml`:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Upload     │────▶│  Nixpacks    │────▶│  Docker      │
│   Source     │     │  Build       │     │  Image       │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                    ┌───────▼───────┐     ┌───────▼───────┐
                    │  npm ci       │     │  Push to      │
                    │  prisma       │     │  Railway      │
                    │  generate x2  │     │  Registry     │
                    │  tsc compile  │     │               │
                    └───────────────┘     └───────────────┘
```

**Build command:**
```
cd src/backend && npx prisma generate --schema=prisma/schema.prisma
                && npx prisma generate --schema=prisma/master.prisma
                && npm run build
```

**Start command:**
```
cd src/backend && npx prisma migrate deploy --schema=prisma/master.prisma
               && npx prisma migrate deploy --schema=prisma/schema.prisma
               && node dist/index.js
```

Migrations run automatically on every deploy before the server starts.

### Runtime Environment

| Setting | Value |
|---------|-------|
| Builder | Nixpacks v1.38+ |
| Node.js | 20.x (via `NIXPACKS_NODE_VERSION`) |
| Region | US West |
| Restart Policy | On failure (max 3 retries) |

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `MASTER_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway reference to managed Postgres |
| `TENANT_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Default tenant DB (same Postgres instance) |
| `JWT_SECRET` | `(secret)` | Signing key for JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `PORT` | `4000` | Express listen port |
| `NODE_ENV` | `production` | Environment flag |
| `ALLOWED_ORIGINS` | `https://mandi-manager.vercel.app,...` | CORS allowlist |
| `NIXPACKS_NODE_VERSION` | `20` | Node.js version for Nixpacks |

### PostgreSQL

- **Engine:** PostgreSQL 18 (Railway template `postgres-ssl`)
- **Storage:** 500 MB volume at `/var/lib/postgresql/data`
- **Access:** Internal networking via `postgres.railway.internal:5432` (no public exposure)
- **SSL:** Enabled by default

---

## 4. Vercel Frontend

### Build Pipeline

Configured in `vercel.json` at the monorepo root:

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Git     │────▶│  npm ci      │────▶│  next build │────▶│  Deploy  │
│  Clone   │     │  (monorepo)  │     │  (web pkg)  │     │  to Edge │
└──────────┘     └──────────────┘     └─────────────┘     └──────────┘
```

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Install Command | `npm ci` |
| Build Command | `npm run build:web` |
| Output Directory | `src/frontend/web/.next` |

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_USE_MOCK` | `false` | Disable mock data, use real API |
| `NEXT_PUBLIC_API_URL` | `https://mellow-kindness-production-6d20.up.railway.app` | Backend URL |

### Deployment

- **Production URL:** `https://mandi-manager.vercel.app`
- **Preview deploys:** Auto-generated per Vercel deployment
- **CDN:** Vercel Edge Network (global distribution)

---

## 5. Network Architecture

### Request Flow

```
User Browser
     │
     │  HTTPS
     ▼
Vercel Edge CDN ──────────────── Serves static assets + SSR pages
     │
     │  Client-side fetch() to API
     ▼
Railway Load Balancer ────────── TLS termination, X-Forwarded-For
     │
     │  HTTP (internal)
     ▼
Express Container ────────────── trust proxy enabled
     │
     │  TCP (internal network)
     ▼
PostgreSQL Container ─────────── postgres.railway.internal:5432
```

### CORS Configuration

The backend only accepts requests from the configured Vercel frontend URLs. The `ALLOWED_ORIGINS` env var contains a comma-separated list of allowed origins.

### Security Layers

| Layer | Protection |
|-------|-----------|
| Vercel Edge | DDoS protection, TLS |
| Railway LB | TLS termination, request routing |
| Express | Helmet headers, CORS, rate limiting, JWT auth |
| PostgreSQL | Internal-only networking (no public endpoint) |

---

## 6. Deployment Workflow

### Current: CLI Push

```
Developer Machine
     │
     ├── git push ────────────▶ GitHub (source of truth)
     │
     ├── railway up ──────────▶ Railway (backend deploy)
     │
     └── vercel --prod ───────▶ Vercel (frontend deploy)
```

Deployments are triggered manually via CLI. Both `railway up` and `vercel --prod` upload the local source and build remotely.

### Future: Git-Triggered CI/CD

For automated deployments, connect both platforms to the GitHub repo:

```
git push to main
     │
     ├──▶ Railway auto-deploy (backend)
     │
     └──▶ Vercel auto-deploy (frontend)
```

Railway supports GitHub integration. Vercel attempted to connect but requires the GitHub app to be installed on the repository.

---

## 7. Scaling Considerations

### Current State (Single Instance)

```
┌────────────────────────────────────────┐
│  Railway (US West)                     │
│                                        │
│  1x Express container ◄──► 1x Postgres │
│                                        │
└────────────────────────────────────────┘
```

### Scaling Options

| Dimension | Strategy |
|-----------|----------|
| **API throughput** | Railway `railway service scale` — add replicas across regions |
| **Database reads** | Add PostgreSQL read replicas |
| **Database per tenant** | Already supported — each mandi can point to a separate Postgres instance |
| **Frontend** | Vercel scales automatically (serverless/edge) |
| **Heavy tenants** | Move their `dbUrl` to a dedicated Postgres server without code changes |

### Cost Profile

| Service | Tier | Cost |
|---------|------|------|
| Railway | Trial/Hobby | $5/month credit (backend + Postgres) |
| Vercel | Hobby | Free tier (sufficient for current traffic) |
| GitHub | Free | Unlimited private repos |

---

## 8. Monitoring & Observability

| Aspect | Tool |
|--------|------|
| Backend logs | `railway service logs` or Railway dashboard |
| Frontend analytics | Vercel Analytics (optional) |
| Health check | `GET /health` returns `{ status: "ok", ts: "..." }` |
| DB monitoring | Railway Postgres metrics (storage, connections) |
| Error tracking | Console logs (consider adding Sentry for production) |

---

## 9. Disaster Recovery

| Scenario | Mitigation |
|----------|-----------|
| Backend crash | Railway auto-restarts (on_failure, max 3 retries) |
| DB corruption | Railway automatic backups (managed Postgres) |
| Region outage | Vercel serves cached frontend; backend needs multi-region Railway setup |
| Secret leak | Rotate `JWT_SECRET` in Railway env vars → redeploy |
| Tenant DB loss | Per-tenant isolation limits blast radius to one mandi |
