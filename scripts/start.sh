#!/bin/bash
# Starts the full local stack (postgres, server, frontend) with hot reload.
# No AWS credentials or Cognito needed — auth is bypassed in local dev mode.
#
# First run builds images automatically (~1 min).
# Source changes sync instantly via Docker Compose Watch.
# Changing package.json triggers an automatic image rebuild.
#
# To stop: Ctrl+C, then `docker compose down`

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker compose -f "$ROOT/docker-compose.yml" up --build --watch
