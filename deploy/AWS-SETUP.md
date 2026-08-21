# AWS deployment — nyumba.hytechsolution.co.ke

One EC2 instance runs the whole stack (Postgres+PostGIS, Redis, FastAPI, Celery,
nginx TLS termination, React SPA) via `docker-compose.prod.yml`.

## 1. Provision EC2

1. EC2 → Launch instance: **Ubuntu 24.04 LTS**, `t3.small` minimum (2 GB RAM),
   20 GB gp3 disk.
2. Security group inbound rules:
   | Port | Source | Purpose |
   |---|---|---|
   | 22 | your IP | SSH |
   | 80 | 0.0.0.0/0 | HTTP + ACME |
   | 443 | 0.0.0.0/0 | HTTPS |
3. Install Docker on the instance:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   ```

## 2. DNS (Route 53 or your registrar)

Create an **A record**: `nyumba.hytechsolution.co.ke` → the EC2 public IP.
Wait for `dig nyumba.hytechsolution.co.ke` to resolve before continuing.

## 3. First deploy

```bash
ssh ubuntu@<EC2_IP>
sudo mkdir -p /opt/nyumbalink && sudo chown $USER /opt/nyumbalink
git clone git@github.com:DanHacks/nyumbalink.git /opt/nyumbalink   # or copy via rsync
cd /opt/nyumbalink

# Secrets — never committed
cat > .env <<'EOF'
POSTGRES_USER=nyumbalink
POSTGRES_PASSWORD=<generate: openssl rand -hex 24>
POSTGRES_DB=nyumbalink
SECRET_KEY=<generate: openssl rand -hex 48>
EOF
chmod 600 .env

docker compose -f docker-compose.prod.yml up -d --build
sudo chmod +x deploy/init-letsencrypt.sh && ./deploy/init-letsencrypt.sh you@hytechsolution.co.ke
```

Site is now live at **https://nyumba.hytechsolution.co.ke** with auto-renewing
Let's Encrypt certificates (the certbot sidecar renews every 12 h; nginx reloads
on renewal).

## 4. Continuous deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys `main` automatically.
Add these repository secrets:

| Secret | Value |
|---|---|
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | private key PEM (add its public half to the instance) |

The app code lives at `/opt/nyumbalink` on the host; the workflow pulls,
rebuilds and restarts only changed services, then hits `/health`.

## 5. Mobile app points here too

`mobile/eas.json` production profile already sets
`EXPO_PUBLIC_API_URL=https://nyumba.hytechsolution.co.ke/api/v1`, so Android
builds consume the same backend.

## 6. Backups (recommended)

```bash
# nightly postgres dump cron on the host
0 3 * * * docker compose -f /opt/nyumbalink/docker-compose.prod.yml exec -T db \
  pg_dump -U nyumbalink nyumbalink | gzip > /opt/backups/nyumbalink-$(date +\%F).sql.gz
```

## Scaling later

- Move Postgres to RDS (PostGIS supported) and Redis to ElastiCache — just
  change `DATABASE_URL` / `REDIS_URL` in `.env`.
- Put CloudFront in front of the SPA for global caching.
- Add an ALB if you run multiple API containers across instances.
