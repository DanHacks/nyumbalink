# Deployment — https://heylaos.com

Production runs on AWS behind a **Cloudflare Tunnel**. Public traffic reaches
Cloudflare, the tunnel connects outbound to `cloudflared` on the host, and
`cloudflared` forwards to the stack in `docker-compose.prod.yml`
(`nginx` → `frontend` static build + `api` + `db`/`redis`/`celery_worker`).

No inbound ports are opened to the internet; TLS is terminated by Cloudflare.

## How a deploy happens

**Push-to-deploy via a server-side git poll.**

1. You `git push origin main`.
2. A poll unit on the host (systemd timer or a small loop service) runs
   `git fetch` in `/opt/nyumbalink` on its interval.
3. When `origin/main` moved it does `git reset --hard origin/main`, rebuilds the
   changed images (`api`, `frontend`, `celery_worker`), `docker compose up -d`,
   prunes old images and checks `https://heylaos.com/health`.
4. Because it runs **on the host, inside the tunnel's network**, the rebuilt
   stack is automatically served through the tunnel. Nothing about the tunnel
   config is touched by a deploy.

There is nothing to run by hand: `git push origin main` is the deploy command.

## GitHub Actions (manual fallback only)

`.github/workflows/deploy.yml` used to run on every push and SSH into the host.
That path is disabled:

- it had **no secrets** configured, so it failed on every push;
- an SSH-driven `docker compose up` runs outside the poll service's control and
  is the wrong mechanism for a tunnel-fronted host.

It now runs **only** on `workflow_dispatch` (Actions tab → *Deploy to EC2
(manual SSH fallback)* → *Run workflow* → type `deploy`). Use it only if the
poll service is broken and you need to force a deploy. To enable it you must set
`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` repository secrets **and** allow GitHub
runner IPs to reach SSH (Lightsail static IPs are firewalled by default — you'd
need to permit the runner's IP for the duration of the run). Prefer fixing the
poll service over re-enabling this.

## First-time / host setup (reference)

The host already runs this. Reproduce it on a new host with:

```bash
sudo mkdir -p /opt/nyumbalink && sudo chown $USER /opt/nyumbalink
git clone git@github.com:DanHacks/nyumbalink.git /opt/nyumbalink
cd /opt/nyumbalink

cat > .env <<'EOF'
POSTGRES_USER=nyumbalink
POSTGRES_PASSWORD=<openssl rand -hex 24>
POSTGRES_DB=nyumbalink
SECRET_KEY=<openssl rand -hex 48>
EOF
chmod 600 .env

docker compose -f docker-compose.prod.yml up -d --build
```

Then point the Cloudflare Tunnel at `http://127.0.0.1:80` for `heylaos.com`
(public hostname `heylaos.com` → service `http://localhost:80`).

`deploy/init-letsencrypt.sh` and `deploy/nginx/nyumbalink.conf` belong to the
older direct-EC2 setup (nginx on 80/443 with Let's Encrypt). With the tunnel you
don't need the `certbot` sidecar or public 80/443; Cloudflare serves TLS.

## Configuration that must match the domain

Hardcoded in the repo (all `heylaos.com`):

| Where | What |
|---|---|
| `docker-compose.prod.yml` | `CORS_ORIGINS` |
| `mobile/app.json` | `extra.apiUrl` |
| `mobile/lib/api.ts` | fallback API host |
| `frontend/vite.config.ts` | dev-server `allowedHosts` |
| `deploy/nginx/nyumba.conf` | tunnel reverse-proxy `server_name` |

The mobile app resolves its API as `EXPO_PUBLIC_API_URL` → `app.json extra.apiUrl`
→ `https://heylaos.com`. A change to the mobile host only takes effect in a
**new native build**, not over the air.

## Verify a deploy

```bash
curl -fsS https://heylaos.com/health            # {"status":"healthy"}
curl -fsS https://heylaos.com/api/v1/maps/config
```

Then load `https://heylaos.com/` and `https://heylaos.com/explore?view=map`, and
the instant-request flow at `https://heylaos.com/request`.

## Real-time viewing requests

Instant requests are pushed over WebSockets (`/api/v1/chat/ws`, API is mounted at
`/api` by nginx) and fanned out across the 4 gunicorn workers through
**Redis pub/sub** (`REDIS_URL`). Requirements:

- `redis` must be healthy (it is in `docker-compose.prod.yml`); if Redis is
  unreachable the API still works, the UI just falls back to its 60 s polling.
- nginx must forward `Upgrade`/`Connection` headers on that path
  (`deploy/nginx/nyumba.conf`); HTTP/2 through the Cloudflare Tunnel carries the
  WebSocket upgrade transparently.

## Seed the map with demo listings

Production had zero VERIFIED listings, so the map and the request tiers were
empty. `backend/scripts/seed_demo.py` creates real listings in real Kenyan
estates owned by clearly-labelled seed accounts
(`seed-owner-*@seed.nyumbalink.local`, non-deliverable mailboxes):

```bash
cd /opt/nyumbalink
docker compose -f docker-compose.prod.yml exec api python -m scripts.seed_demo
# re-create from scratch (removes seed listings, rooms, photos and their bookings):
docker compose -f docker-compose.prod.yml exec api python -m scripts.seed_demo --fresh
```

Every seeded row has `property_code = NL-SEED-###` and
`metadata.demo_seed = true`, so demo supply is always distinguishable from real
owners' listings and can be removed with `--fresh`.
