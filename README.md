# finance-dash

Crypto portfolio tracker — React 19 frontend, Fastify 5 REST API, PostgreSQL, deployed serverlessly on AWS via Pulumi.

[![PR](https://github.com/robbiejdunn/finance-dash-server/actions/workflows/pr.yml/badge.svg)](https://github.com/robbiejdunn/finance-dash-server/actions/workflows/pr.yml)

## Quick start (Docker)

```bash
docker compose up --build --watch
```

Opens the full stack locally — no AWS account or Cognito setup needed. `--watch` keeps source files in sync with the running containers automatically; editing `package.json` triggers a full image rebuild.

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:3000 |
| Backend API (Fastify) | http://localhost:8080 |
| PostgreSQL | localhost:5435 |

The stack now includes a Firebase Auth Emulator — auth works fully locally with no Google account needed.

| Service | URL |
|---------|-----|
| Firebase Emulator UI | http://localhost:4000 |
| Firebase Auth API | http://localhost:9099 |

### Creating a local user

On first boot you need to create a user to log in with:

1. Open http://localhost:4000 → **Authentication** tab
2. Click **Add user**, enter an email and password
3. Log in at http://localhost:3000 with those credentials

Users are reset when the emulator container restarts — just re-create them, or use the seed script (see below).

### Seeding dev data

On first boot the database is empty. Import a sample portfolio (BTC, ETH, SOL with historical transactions):

```bash
./scripts/seed.sh
```

The fixture lives in `fixtures/dev-portfolio.json` — edit it to add your own coins/transactions, then re-seed:

```bash
# Wipe and re-seed
docker compose exec postgres psql -U postgres -d financedashdb -c "DELETE FROM holdings;"
./scripts/seed.sh
```

### Populating ticker prices

Run this after seeding and any time you want fresh prices:

```bash
cd server && npm run cron
```

This hits CoinGecko for every ticker in the DB and writes the latest prices. The same job runs automatically every 10 minutes in prod via EventBridge.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, MUI v9, React Router v7, Recharts |
| Backend | Fastify 5, TypeScript, Node 24 |
| Database | PostgreSQL 17 (local) / RDS PostgreSQL 16 (prod) |
| Infrastructure | Pulumi TypeScript (single stack) |
| Auth | Firebase Auth (prod + local emulator) |
| Hosting | Lambda Web Adapter + Lambda Function URL, S3 + CloudFront |

## Project layout

```
/               — React 19 frontend (Vite)
server/         — Fastify REST API + cron handler
infra/          — Pulumi stack (all AWS resources)
db/schema.sql   — single source of truth for DB schema
docker-compose.yml
```

## Local development without Docker

Requires Node 24 and a Postgres instance. Edit `server/.env`:

```
PGHOST=localhost
PGPORT=5435
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=financedashdb
PORT=8080
COINGECKO_API_KEY=<your key>   # optional, free demo keys start with CG-
```

Then:

```bash
./scripts/start.sh
```

## VS Code debugging

Use the **"Full stack"** compound launch config — attaches the Node inspector to the server container on port 9229 and opens Chrome pointed at the Vite dev server.

## Deployment

Deployments are triggered by publishing a GitHub release. The workflow:

1. Runs `pulumi up` to apply any infrastructure changes
2. Runs DB migrations against RDS
3. Builds the frontend with the live API endpoint injected
4. Syncs to S3 and invalidates CloudFront

Required GitHub secrets: `PULUMI_ACCESS_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DB_PASSWORD`.

To deploy infrastructure manually:

```bash
cd infra && pulumi up --stack prod
```

## Database

No ORM — raw parameterised queries via `pg`. Schema in `db/schema.sql` is applied automatically:
- **Locally** — mounted into the postgres container as an init script
- **In prod** — run on server startup via `server/src/db/migrate.ts`

To run migrations manually against any environment:

```bash
cd server && npm run migrate
```

## Database debugging

```bash
docker run -p 80:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@admin.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4:latest
```

Connect to `localhost:5435` with user `postgres` / password `postgres` locally, or use the RDS hostname from `cd infra && pulumi stack output dbHost --stack prod` in prod.
