#!/usr/bin/env bash
# Builds nyumbalink-cpanel.zip: production frontend bundle + backend source.
# Run from the repo root:  bash scripts/build_cpanel_zip.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/node/bin:$PATH"
OUT="${1:-$HOME/nyumbalink-cpanel.zip}"
STAGE="$(mktemp -d)"

echo "==> Building frontend..."
(cd "$ROOT/frontend" && npm run build >/dev/null 2>&1)

echo "==> Staging package..."
mkdir -p "$STAGE/public_html" "$STAGE/backend"
cp -r "$ROOT/frontend/dist/." "$STAGE/public_html/"
cp "$ROOT/deploy/cpanel/public_html/.htaccess" "$STAGE/public_html/"
cp "$ROOT/deploy/cpanel/backend/passenger_wsgi.py" "$STAGE/backend/"

# Backend source, minus anything environment-specific or generated
rsync -a --delete \
  --exclude '__pycache__' --exclude '*.pyc' --exclude '.env' \
  --exclude 'uploads/*' --exclude '.venv' --exclude 'venv' \
  "$ROOT/backend/app/" "$STAGE/backend/app/"
rsync -a "$ROOT/backend/alembic/" "$STAGE/backend/alembic/"
cp "$ROOT/backend/requirements.txt" "$ROOT/backend/alembic.ini" "$STAGE/backend/"
cp "$ROOT/backend/.env.example" "$STAGE/backend/"
cp "$ROOT/deploy/cpanel/README-DEPLOY.md" "$STAGE/"

echo "==> Zipping to $OUT ..."
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OUT" .)
rm -rf "$STAGE"
echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
