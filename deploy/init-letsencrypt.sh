#!/usr/bin/env bash
# Bootstrap Let's Encrypt for nyumba.hytechsolution.co.ke.
# Run ONCE on the EC2 host from the repo root, after DNS points to the server:
#   sudo ./deploy/init-letsencrypt.sh your@email.com
set -euo pipefail

DOMAIN="nyumba.hytechsolution.co.ke"
EMAIL="${1:?Usage: $0 <email>}"
RSA_KEY_SIZE=4096
CERTBOT_CONF="./deploy/certbot/conf"
CERTBOT_WWW="./deploy/certbot/www"

if [ ! -d "$CERTBOT_CONF/live/$DOMAIN" ]; then
  echo "### Requesting certificate for $DOMAIN..."
  docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
    sh -c 'certbot certonly --webroot -w /var/www/certbot \
      -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email \
      --non-interactive'" certbot
else
  echo "### Existing certificate found, skipping issuance."
fi

echo "### Reloading nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### Done. https://$DOMAIN is live (allow a minute for first boot)."
