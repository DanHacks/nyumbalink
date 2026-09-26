# NyumbaLink

**Find, verify and book student accommodation in Kenya — on a map.**

NyumbaLink is a full-stack housing platform that connects students/tenants with landlords, caretakers and agents. Listings are shown on an interactive map (guest-first: no sign-in required to browse), every property can be GPS-verified by field officers, and bookings, reviews, chat and M-Pesa payments all run through one API.

| | |
|---|---|
| **Web app** | React 19 + Vite + TypeScript + Tailwind (orange/navy theme) |
| **Mobile app** | React Native + Expo (Expo Router), Android/iOS |
| **API** | Python 3.12 + FastAPI + SQLAlchemy 2 (async) |
| **Data** | PostgreSQL 16 + PostGIS 3.4, Redis 7, Celery |
| **Maps** | Leaflet + Google Maps tiles, OSM Nominatim geocoding |
| **Payments** | M-Pesa Daraja STK push (KES) |
| **Deploy** | Docker Compose + nginx + Let's Encrypt (AWS EC2), cPanel zip kit |

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Quick start (Docker)](#quick-start-docker)
- [Manual local setup](#manual-local-setup)
- [Environment variables](#environment-variables)
- [Ports](#ports)
- [Demo data](#demo-data)
- [API overview](#api-overview)
- [Frontend (web)](#frontend-web)
- [Mobile app](#mobile-app)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Known gaps & gotchas](#known-gaps--gotchas)
- [License](#license)

---

## Features

**Tenants & students (guest-first)**
- Browse and search listings **without an account** — auth is only required to book.
- Uber-style map view: cluster pins, price filters, property preview card, directions, geocoding and nearby search.
- Smart search, price categories, autocomplete, price-intelligence insights per area.
- Booking / viewing requests, check-in and cancellation flow.
- Favorites, reviews (with category breakdown + property health score), report a listing, appeal a takedown.
- Realtime chat (WebSocket) with landlords, in-app notifications, notification preferences.
- Universities & campuses pages with nearby accommodation.

**Landlords, caretakers, agents, hosts**
- Property → building → floor → room hierarchy with vacancy/occupancy management.
- Owner dashboard KPIs: views, clicks, viewing requests, per-property analytics.
- Verification pipeline: upload ≥12 geo-taged photos + a 30–120 s walkthrough video; officers approve/reject.
- M-Pesa payments and premium plans (`basic` / `standard` / `premium`), ad campaigns & featured listings.

**Verification officers & admins**
- Verification queue (photos, videos, owner identity), property verification decisions.
- Admin console: users & roles, properties, scam reports, audit logs, analytics overview, fraud centre (blacklist queue + appeals).
- AI endpoints: photo verification, duplicate detection, scam-owner detection, rent estimation, recommendations.

**Trust & safety**
- Scam reports, owner trust scores, property blacklist/appeal workflow, HMAC-signed expiring media URLs.

---

## Architecture

```
                       ┌──────────────────────────────┐
  Browser (mobile /    │  React 19 + Vite (nginx SPA) │  Expo app (React Native)
  desktop shell)       └───────────────┬──────────────┘        │
                                       │ /api/v1                │ EXPO_PUBLIC_API_URL
                                       ▼                        ▼
                        ┌──────────────────────────────────────────────┐
                        │        nginx (TLS, WebSocket upgrade)        │
                        └───────────────────┬──────────────────────────┘
                                            ▼
   ┌───────────────────────────────────────────────────────────────────────┐
   │  FastAPI  (app/main.py)  — JWT auth, REST /api/v1/*, WS /chat/ws      │
   │  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────────┐  │
   │  │ media/HMAC  │ │ M-Pesa client│ │ Nominatim   │ │ Google Maps    │  │
   │  │ uploads     │ │ (Daraja)     │ │ geocoding   │ │ key /config    │  │
   │  └─────────────┘ └──────────────┘ └─────────────┘ └────────────────┘  │
   └──────────┬──────────────────────────────┬─────────────────────────────┘
              ▼                              ▼
   PostgreSQL 16 + PostGIS 3.4        Redis 7 ── Celery worker
   (properties.location = POINT)      (cache, broker, beat: daily analytics)
```

Every service can run standalone (local venv + npm) or under Docker Compose.

---

## Repository layout

```
nyumbalink/
├── backend/                  # FastAPI app (Python 3.12)
│   ├── app/
│   │   ├── api/v1/           # 21 routers (auth, properties, bookings, …)
│   │   ├── core/             # config, database, security (JWT), dependencies
│   │   ├── models/           # SQLAlchemy models (users, property, payment, …)
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── services/         # media_service (HMAC URLs), etc.
│   │   ├── tasks/            # Celery app: verification, notifications, analytics
│   │   └── main.py           # FastAPI entrypoint, /health, /docs
│   ├── alembic/              # Alembic env (schema currently created via create_all)
│   ├── scripts/seed_demo.py  # demo properties + demo users
│   ├── requirements.txt  .env.example  Dockerfile  Dockerfile.prod  run.py
├── frontend/                 # React 19 + Vite + Tailwind web app
│   └── src/{pages,components,features,store,lib,hooks,styles}
├── mobile/                   # Expo (React Native) app, Expo Router v4
│   ├── app/(auth)  app/(tabs)  app/property/[id]
│   └── lib/{api.ts,auth.tsx,theme.ts}  components/
├── deploy/
│   ├── AWS-SETUP.md          # EC2 + Let's Encrypt production guide
│   ├── nginx/nyumbalink.conf # reverse proxy + WebSocket + SPA
│   ├── init-letsencrypt.sh   # certificate bootstrap
│   └── cpanel/               # shared-hosting kit (README-DEPLOY.md, passenger_wsgi.py)
├── scripts/                  # setup.sh, build_cpanel_zip.sh
├── .github/workflows/deploy.yml
├── docker-compose.yml        # dev:  db, redis, api, frontend, celery_worker
└── docker-compose.prod.yml   # prod: + nginx, certbot (ports 80/443 only)
```

---

## Quick start (Docker)

Requirements: Docker + Docker Compose v2.

```bash
git clone <repo-url> nyumbalink
cd nyumbalink

# 1. configure the backend
cp backend/.env.example backend/.env      # then edit SECRET_KEY, keys, etc.

# 2. start everything (db:5432, redis:6379, api:8000, frontend:5173, worker)
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:5173 |
| API + Swagger | http://localhost:8000/docs |
| API health | http://localhost:8000/health → `{"status":"healthy", …}` |

Schema is created automatically at API startup. Optional demo data:

```bash
docker compose exec api python -m scripts.seed_demo           # add demo data
docker compose exec api python -m scripts.seed_demo --reset   # wipe & reseed
```

---

## Manual local setup

Requirements: **Python 3.12**, **Node 20+**, **PostgreSQL 16 with PostGIS**, **Redis 7**.

```bash
bash scripts/setup.sh        # creates backend/venv, installs deps, copies .env, npm install (frontend)
```

> Note: the root `npm run setup` script points at `scripts/setup.ps1`, which does not exist — use `bash scripts/setup.sh` instead.

Then, in separate terminals:

```bash
# database
createdb nyumbalink
psql nyumbalink -c "CREATE EXTENSION postgis;"

# API  → http://localhost:8000
cd backend
source venv/bin/activate
pip install -r requirements.txt
python run.py                       # uvicorn, reload on 0.0.0.0:8000

# background worker (email, analytics aggregation, verification tasks)
celery -A app.tasks.worker worker --loglevel=info

# web → http://localhost:5173  (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

Root scripts (from the repo root):

| Command | What it does |
|---|---|
| `npm run dev` | frontend on `0.0.0.0:8080` |
| `npm run dev:web` | frontend on `0.0.0.0:5173` |
| `npm run dev:api` | backend on `:8000` |
| `npm run dev:mobile` | Expo dev server |
| `npm run build` | `tsc -b && vite build` for the frontend |

> `npm` is the effective package manager (lockfiles are npm). A root `bun.lock` also exists if you prefer Bun.

---

## Environment variables

### Backend — `backend/.env.example` → `backend/.env`

Loaded by `pydantic-settings` (`backend/app/core/config.py`).

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/nyumbalink` | must be PostGIS-enabled |
| `REDIS_URL` | `redis://localhost:6379/0` | cache |
| `SECRET_KEY` | JWT + media HMAC signing | **required, keep secret** |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `60` / `7` | refresh tokens stored in `user_sessions` |
| `GOOGLE_CLIENT_ID` | validates `POST /auth/google` ID tokens | `aud` must match |
| `GOOGLE_MAPS_API_KEY` | exposed to clients via `GET /maps/config` | public key |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` / `MPESA_SHORTCODE` | Daraja STK push | **sandbox** host is hardcoded |
| `BACKEND_PUBLIC_URL` | M-Pesa callback base, e.g. `http://localhost:8000` | |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | outbound email via Celery | |
| `SENTRY_DSN` | optional error tracking | *declared but Sentry is not initialised yet* |
| `CLOUDFLARE_R2_*` | reserved object storage | *declared but unused — uploads are local disk* |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis db `1` / db `2` | |
| `VITE_API_URL`, `VITE_GOOGLE_MAPS_KEY` | build hints shipped in the same file | used by the frontend build |

Also configurable (defaults in `config.py`): `APP_NAME`, `VERSION`, `DEBUG`, `API_V1_PREFIX=/api/v1`,
`CORS_ORIGINS` (default `["http://localhost:5173","http://localhost:3000"]`), `UPLOAD_DIR=uploads`,
`MAX_UPLOAD_SIZE=50MB`, `PHOTO_MIN_COUNT=12`, `VIDEO_MIN_DURATION=30`, `VIDEO_MAX_DURATION=120`.

### Frontend — `frontend/.env.example`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | defaults to `/api/v1` (same-origin / dev proxy) |
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in button |
| `VITE_GOOGLE_MAPS_KEY` | declared; the runtime key actually comes from `GET /api/v1/maps/config` |

### Mobile — `mobile/` (no `.env`; use `EXPO_PUBLIC_*` or `app.json`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | falls back to `app.json → extra.apiUrl`, then the production host |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Sign-In (web / Android) |
| — | Google Maps key is embedded in `mobile/app.json` (`ios`/`android` config) |

---

## Ports

| Port | Service |
|---|---|
| 5432 | PostgreSQL (dev compose only) |
| 6379 | Redis |
| 8000 | FastAPI (`/docs`, `/redoc`, `/health`, `/uploads`) |
| 5173 | Vite dev server / Docker frontend |
| 8080 | `npm run dev` (root) frontend |
| 80 / 443 | nginx in production |

---

## Demo data

```bash
cd backend
python -m scripts.seed_demo           # add
python -m scripts.seed_demo --reset   # wipe first, then seed
```

Seeds ~26 demo properties across Kisumu, Kisii, Nairobi, Nakuru, Mombasa, Eldoret, Thika and Machakos, plus rooms, services, reviews, blacklist entries and demo accounts:

| Email | Role |
|---|---|
| `demo-landlord@nyumbalink.local` | owner |
| `demo-tenant@nyumbalink.local` | tenant |
| `demo-officer@nyumbalink.local` | verification officer |

> These demo accounts are seeded **without** usable passwords — register a real account (or use Google sign-in / OTP) to log in.

---

## API overview

Interactive docs: **`http://localhost:8000/docs`** (Swagger) · `/redoc` · base prefix **`/api/v1`** · health **`GET /health`**.

Auth: bearer **JWT** (access + refresh), bcrypt passwords, OTP login (6-digit, 10 min TTL — printed to the server console in dev), Google ID-token sign-in. Roles: `student, tenant, owner, caretaker, manager, host, agent, admin, moderator, verification_officer, superadmin`.

| Area | Endpoints (prefix `/api/v1`) | Access |
|---|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/select-role`, `GET /auth/me` | public / user |
| Properties | `GET|POST /properties`, `/properties/search`, `GET|PUT|DELETE /properties/{id}`, buildings → floors → rooms | list/create: optional / owner |
| Rooms | `GET /rooms/property/{id}`, `/rooms/vacant`, `/rooms/{id}`, `PUT`, `mark-occupied`, `mark-vacant` | public / owner |
| Bookings | `POST /bookings`, `/my-bookings`, `/my-property-bookings`, `/{id}`, `/{id}/status`, `/{id}/check-in`, `/{id}/cancel` | user |
| Verification | photo & video upload (multipart, GPS-checked), approve/reject, owner identity | user / officer |
| Reviews | `POST|GET /reviews/property/{id}`, `GET /reviews/health/{id}` | user / public |
| Search | `/search/smart`, `/search/price-categories`, `/search/autocomplete` | optional / public |
| Maps | `/maps/nearby/{id}`, `/maps/properties-in-bounds`, `/maps/directions`, `/maps/geocode`, `/maps/config` | public |
| Analytics | `/analytics/property/{id}`, `/analytics/owner/dashboard`, `POST /analytics/track/view|click` | user / optional |
| Ads | `/ads/featured`, `/ads/campaigns`, `POST /ads/track/impression|click` | public / user |
| Payments | `POST /payments/mpesa/stk-push`, `POST /payments/mpesa/callback`, `/payments/mpesa/status/{id}`, `/payments/history`, `POST /payments/premium/subscribe` | user / public (callback) |
| Admin | dashboard, users & roles, verification queue, scam reports, properties, analytics, audit logs, fraud centre & appeals | admin |
| AI | `POST /ai/verify-photo`, `/ai/detect-duplicates`, `/ai/detect-scam-owner`, `/ai/estimate-rent`, `GET /ai/recommendations/{user_id}` | user/admin/public |
| Reports & trust | `POST /reports/properties/{id}/reports`, `/appeals`, `GET .../trust` | user / public |
| Media | `GET /media?path=&expires=&sig=` | public, **HMAC-signed & expiring** |
| Favorites | `GET /favorites`, `POST|DELETE /favorites/{id}`, `/{id}/status` | user |
| Notifications | `GET /notifications`, `/{id}/read`, `/read-all`, `/preferences` | user |
| Services | `/services/categories`, `/services/property/{id}`, `/{id}/verify` | public / user / officer |
| Chat | `GET|POST /chat/conversations`, `.../messages`, **`WS /chat/ws?token=<JWT>`** | user (WS closes with `4401`) |
| Universities | `GET /universities`, `/{id}`, `POST` (admin), `/campuses/{id}/nearby-accommodation` | public / admin |

---

## Frontend (web)

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173  (proxies /api → localhost:8000)
npm run build     # tsc -b && vite build
npm run lint      # eslint
```

- **Routing:** `react-router-dom` v6 in `src/App.tsx`, with two shells chosen at runtime by `useIsMobile()` — a desktop `WebLayout` and a mobile-browser `MobileShell` + tab bar.
- **Guards:** `ProtectedRoute`, `AdminRoute` (`admin`/`superadmin`/`moderator`/`verification_officer`), `RoleRoute`, `DashboardRouter` (student / owner-family / tenant dashboards), `/choose-role` on first login.
- **State:** Zustand (`src/store/authStore.ts`) for auth, TanStack Query for server data, axios with automatic refresh interceptor (`src/lib/api.ts`).
- **Data entry:** react-hook-form + zod.
- **Maps:** Leaflet `MapContainer` + `leaflet.gridlayer.googlemutant` (Google tiles over OSM base), clustering and routing in `src/features/map/`.
- **Styling:** Tailwind v3 with shadcn-style HSL variables in `src/styles/globals.css` — primary **orange** (`24 95% 53%`), secondary **navy** (`217 55% 24%`), radius `0.75rem`, dark mode supported, animations disabled under `prefers-reduced-motion`.

---

## Mobile app

```bash
cd mobile
npm install
npx expo start        # Expo Go / dev server   (repo root: npm run dev:mobile)
npm run android       # expo run:android (dev client, native build)
npm run ios           # expo run:ios
npm run web           # expo start --web
npm run typecheck     # tsc --noEmit
```

- **Expo Router v4** (file-based): `app/(auth)/` (login, register, select-role), `app/(tabs)/` (Home map, Explore, Bookings, Messages, Profile), `app/property/[id]/` (detail, book, directions, report, recommend).
- **Auth:** `expo-secure-store` tokens (`nl_access_token` / `nl_refresh_token`), Google via `expo-auth-session`.
- **Maps:** `react-native-maps` with the Google provider key from `app.json`.
- **API base URL resolution:** `EXPO_PUBLIC_API_URL` → `app.json extra.apiUrl` → production host.
- Note: the native app uses a **teal/amber** theme (`lib/theme.ts`, `#0e7490`), while the web app uses orange/navy.
- `eas.json` is **not committed** — run `npx eas init` before `npx eas build`.

---

## Deployment

### Production (AWS EC2 + Docker + Let's Encrypt)

Full guide: [`deploy/AWS-SETUP.md`](deploy/AWS-SETUP.md). Short version:

```bash
# host: Ubuntu 24.04, Docker installed, DNS A record → EC2 IP
git clone <repo-url> /opt/nyumbalink && cd /opt/nyumbalink
cat > .env <<'EOF'
POSTGRES_USER=nyumbalink
POSTGRES_PASSWORD=<openssl rand -hex 24>
POSTGRES_DB=nyumbalink
SECRET_KEY=<openssl rand -hex 48>
EOF
chmod 600 .env

docker compose -f docker-compose.prod.yml up -d --build
./deploy/init-letsencrypt.sh you@example.com     # TLS bootstrap (idempotent)
```

`docker-compose.prod.yml` runs: `db`, `redis`, `api` (gunicorn/uvicorn, 4 workers), `celery_worker`, `frontend` (static build), `nginx` (80/443), `certbot` (renews every 12 h). Only nginx is exposed; db/redis stay internal.

Reverse proxy config: [`deploy/nginx/nyumbalink.conf`](deploy/nginx/nyumbalink.conf) — `/api/` → api:8000, `/api/v1/chat/ws` → WebSocket upgrade, `/uploads/` (7-day cache), `= /health`, everything else → SPA.

Nightly backup example:

```bash
0 3 * * * docker compose -f /opt/nyumbalink/docker-compose.prod.yml exec -T db \
  pg_dump -U nyumbalink nyumbalink | gzip > /opt/backups/nyumbalink-$(date +\%F).sql.gz
```

### Shared cPanel hosting

Guide: [`deploy/cpanel/README-DEPLOY.md`](deploy/cpanel/README-DEPLOY.md).

```bash
bash scripts/build_cpanel_zip.sh          # → $HOME/nyumbalink-cpanel.zip
```

- **Option A — website only:** upload the zip, extract into `public_html`, done (`.htaccess` handles SPA routing; API calls go to `/api/v1` on the same domain).
- **Option B — backend too:** cPanel *Setup Python App* (Python ≥3.11), app root `backend/`, startup file `passenger_wsgi.py`, callable `application`; requires PostgreSQL + PostGIS + Redis (`CREATE EXTENSION postgis;`, `alembic upgrade head`). A VPS/Docker deploy is recommended instead.

### Verify a deployment

- `https://yourdomain.com/` loads the SPA
- `https://yourdomain.com/explore?view=map` deep-links correctly
- `GET /health` → `{"status":"healthy"}`
- `https://yourdomain.com/docs` (consider restricting in production)

---

## CI/CD

One workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — **Deploy to AWS EC2**.

- **Trigger:** push to `main` (or manual `workflow_dispatch`), concurrency group `deploy-production`.
- **Action:** SSH into the host (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` secrets), `git reset --hard origin/main`, rebuild `api`/`frontend`/`celery_worker`, `docker compose up -d`, prune images, then `curl http://localhost/health`.
- There is currently **no test/lint/build CI job**.

---

## Known gaps & gotchas

Useful if you're about to change things:

- **Schema management:** Alembic is configured but **no migration versions are committed** — the schema comes from `Base.metadata.create_all()` at startup. Add real migrations before running against production data you care about.
- **No test suite yet** — there are no `tests/`, pytest is not in `requirements.txt`, and CI does not lint or test.
- **M-Pesa** points at the **sandbox** (`https://sandbox.safaricom.co.ke`) hardcoded in `backend/app/utils/mpesa.py`.
- **OTP / SMS:** SMS sending is a stub (`app/utils/sms.py` always returns `True`) and dev OTPs are printed to the API console.
- **Declared but unused:** `SENTRY_DSN` (Sentry never initialised), `CLOUDFLARE_R2_*` (uploads go to local disk), TOTP 2FA (`pyotp`/`qrcode` installed, no endpoints), Stripe (only a column name).
- **bcrypt** is pinned to `4.0.1` for passlib compatibility — don't bump casually.
- **Root `npm run setup`** references a missing `scripts/setup.ps1`; use `scripts/setup.sh`.
- **API keys committed** as defaults in `docker-compose.prod.yml` / `app.json` are *public* identifiers (Google client ID, Maps key) — still rotate and move secrets to `.env`.
- **Branding:** web = orange/navy, native app = teal/amber.

---

## License

NyumbaLink is released under a **multi-license**. You may use, copy, modify, merge, publish, distribute, sublicense and/or sell copies of this software under **any one** of the following licenses, at your option:

| License | File |
|---|---|
| MIT License | [`LICENSE`](LICENSE) |
| Apache License 2.0 | [`LICENSE-APACHE`](LICENSE-APACHE) |
| GNU GPL v3 | [`LICENSE-GPL-3.0`](LICENSE-GPL-3.0) |
| GNU AGPL v3 | [`LICENSE-AGPL-3.0`](LICENSE-AGPL-3.0) |

Pick **one** license for your use of the code and comply with that license's terms (including its patent/grant and attribution requirements). If you do not choose one, the MIT License applies as the default.

SPDX identifier: `(MIT OR Apache-2.0 OR GPL-3.0-only OR AGPL-3.0-only)`

```
Copyright (c) 2026 DanHacks
```

> Note: the AGPL is relevant if you run NyumbaLink as a hosted/network service and modify it — AGPL §13 requires offering the modified source to users of the service. Third-party dependencies keep their own licenses.
