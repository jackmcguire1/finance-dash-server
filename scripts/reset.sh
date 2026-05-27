#!/bin/bash
# Wipes all portfolio data (holdings + transactions + tickers) and re-runs the cron
# to repopulate ticker prices. Run this before re-importing a portfolio.
#
# Usage: ./scripts/reset.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Wiping holdings, transactions and tickers..."
docker compose -f "$ROOT/docker-compose.yml" exec -T postgres psql -U postgres -d financedashdb \
  -c "DELETE FROM transactions; DELETE FROM holdings; DELETE FROM ticker_prices; DELETE FROM tickers;"

echo "Done. Re-import your portfolio via the UI or run ./scripts/seed.sh"
