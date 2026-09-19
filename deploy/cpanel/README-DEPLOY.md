# NyumbaLink — cPanel Hosting Guide

This zip contains **everything** needed to host NyumbaLink:

```
nyumbalink-cpanel.zip
├── public_html/      # built website (upload contents into cPanel public_html)
│   ├── index.html
│   ├── assets/
│   └── .htaccess     # SPA routing (React Router works on refresh/deep links)
├── backend/          # FastAPI API (needs a Python-capable host, see below)
│   ├── app/
│   ├── alembic/
│   ├── requirements.txt
│   └── passenger_wsgi.py
└── README-DEPLOY.md  # this file
```

## Option A — Website only (any cPanel shared hosting) ✅

1. Open cPanel → **File Manager** → `public_html`.
2. Upload `nyumbalink-cpanel.zip`, **Extract**, then move the contents of
   `public_html/` (index.html, assets/, .htaccess) directly into `public_html/`.
3. Done — the site is live. The map/listings pages call `/api/v1/...` on the
   **same domain**, so once the backend (Option B) is up on the same host,
   everything connects with zero config.

> No mock data anywhere: if the API isn't reachable yet, listing pages show
> an honest empty/offline state — never fake pins.

## Option B — Backend API (requires Python + PostgreSQL + Redis)

Standard cPanel **shared** hosting usually cannot run this stack
(PostGIS spatial database, Redis, background workers). You need one of:

- **cPanel with CloudLinux Python + PostgreSQL**: use
  *Software → Setup Python App*, Python 3.11+, app root = `backend/`,
  startup file `passenger_wsgi.py`, callable `application`.
  `pip install -r requirements.txt`, add a PostgreSQL database +
  `CREATE EXTENSION postgis;`, set env vars (copy `backend/.env.example`
  to `.env`), run `alembic upgrade head`.
- **A VPS** (recommended for production): Docker Compose files are in the
  repo root (`docker-compose.yml`, `docker-compose.prod.yml`).

Required env vars: `DATABASE_URL` (PostgreSQL + PostGIS),
`REDIS_URL`, `SECRET_KEY`. Optional: `GOOGLE_MAPS_API_KEY`,
M-Pesa keys, SMTP settings — see `backend/.env.example`.

## Verify

- Frontend: `https://yourdomain.com/` → homepage loads
- Deep link: `https://yourdomain.com/explore?view=map` → map tab (tests .htaccess)
- API: `https://yourdomain.com/api/v1/...` proxied to the backend, or
  `http://backend-host:8000/health` → `{"status":"healthy"}`
