# Deployment Notes

> **Scope**: infrastructure/operations only.  
> App code lives in `/backend` and `/frontend` — do not edit those here.

---

## Architecture overview

```
Browser  ──►  Vercel (frontend React app)
                  │
                  │ HTTPS fetch /api/v1/...
                  ▼
             Render (backend FastAPI)
                  │
                  │ TCP 5432
                  ▼
             Render Postgres (managed DB)
```

---

## Backend — Render

### Service type
**Web Service** (not Background Worker).

### Build & Start

| Field | Value |
|---|---|
| **Root directory** | *(leave blank — Dockerfile is at repo root)* |
| **Dockerfile path** | `./Dockerfile` |
| **Start command** | *(auto-detected from Dockerfile CMD)* |
| **Health check path** | `/health` |
| **Port** | `8000` |

### Environment variables (set in Render dashboard — values NOT stored here)

| Name | Description |
|---|---|
| `DATABASE_URL` | Full Postgres connection string (copy from Render DB "Internal Connection String") |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins (e.g., your Vercel URL) |
| `ENV` | Set to `production` |

### Postgres (Render managed DB)

1. Create a **PostgreSQL** database in Render.
2. Copy the **Internal Connection String** into `DATABASE_URL` for the backend service.
3. On first deploy, run Alembic migrations via the Render **Shell** tab:
   ```
   alembic upgrade head
   ```

### Deployment trigger
Render auto-deploys on push to the configured branch (default: `main`).  
No deploy secrets are in the GitHub Actions workflow — Render pulls directly from the repo.

---

## Frontend — Vercel

### Framework preset
Select **Vite** (or "Other" and set build/output below).

### Build settings

| Field | Value |
|---|---|
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Install command** | `npm ci` |

### Environment variables (set in Vercel dashboard — values NOT stored here)

| Name | Description |
|---|---|
| `VITE_API_BASE_URL` | Full URL of the deployed Render backend (e.g., `https://your-app.onrender.com`) |

### Custom domain (optional)
Configure in **Vercel → Project → Settings → Domains**.  
After adding, update `CORS_ORIGINS` on Render to include the custom domain.

---

## Secrets management rules

1. **Never** put real credentials in `.env.example`, `docker-compose.yml`, or any committed file.
2. `.env` is gitignored at both the repo root and `backend/`. Do not un-ignore it.
3. GitHub Secrets (used by CI) are injected as `${{ secrets.NAME }}` — the actual values are managed in  
   **GitHub → Repository → Settings → Secrets and variables → Actions**.
4. Render and Vercel each have their own env-var dashboards — values live there, never in source control.

---

## Local development (quick start)

```bash
# 1. Copy and fill in your local credentials
cp .env.example .env          # repo root (for docker-compose)
cp backend/.env.example backend/.env  # for running backend outside Docker

# 2. Start Postgres + backend
docker compose up --build

# 3. Run migrations (first time or after schema changes)
docker compose exec backend alembic upgrade head

# 4. Start frontend dev server (in a separate terminal)
cd frontend && npm install && npm run dev
```

Backend OpenAPI docs available at: `http://localhost:8000/docs`

---

## CI — GitHub Actions

Workflow file: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Runs on every push/PR:
- `backend-lint` — ruff lint + import resolution check
- `backend-docker-build` — full Docker image build (no push)
- `frontend-build` — TypeScript type-check + Vite production build

No secrets are embedded in the workflow file; any required values are
referenced by name from **GitHub Secrets**.
