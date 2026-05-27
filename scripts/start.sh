#!/bin/bash
# Fresh-start the full local stack and populate ticker prices.
#
# First run builds images automatically (~1 min).
# Source changes sync instantly via Docker Compose Watch.
# Changing package.json triggers an automatic image rebuild.
#
# To stop: Ctrl+C, then `docker compose down`

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Starting stack..."
docker compose -f "$ROOT/docker-compose.yml" up --build --detach

echo "==> Waiting for server to be ready..."
until curl -sf http://localhost:8080/health > /dev/null 2>&1; do
  sleep 2
done
echo "    Server is up."

echo "==> Running cron to populate ticker prices..."
docker compose -f "$ROOT/docker-compose.yml" exec -T server npm run cron

echo ""
echo "============================================"
echo " Open http://localhost:4000 to create a"
echo " Firebase user before logging in."
echo " App: http://localhost:3000"
echo "============================================"
echo ""

echo "==> Watching for changes..."
docker compose -f "$ROOT/docker-compose.yml" watch
