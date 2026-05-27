#!/bin/bash
# Imports dev-portfolio.json into the local running stack.
# Requires docker compose to be up (./scripts/start.sh).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
curl -s -X POST http://localhost:8080/portfolio/import \
  -H "Content-Type: application/json" \
  -d @"$ROOT/fixtures/dev-portfolio.json" | python3 -m json.tool

echo ""
echo "Seed complete. Remember to create a Firebase user in the Auth Emulator UI before logging in:"
echo "  http://localhost:4000"
