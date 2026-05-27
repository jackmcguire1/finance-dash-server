# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local Development (Docker — recommended)

The fastest way to get everything running locally. Requires Docker Desktop.

```bash
docker compose up --build --watch
```

`--watch` enables Docker Compose Watch — source file changes sync into the running containers automatically, and changing `package.json` triggers a full rebuild. No manual restarts needed.

This starts four containers:
- **postgres** (port 5435) — PostgreSQL 17, schema auto-applied from `db/schema.sql` on first run
- **server** (port 8080) — Fastify API with hot reload + Node inspector on port 9229
- **frontend** (port 3000) — Vite dev server with HMR
- **firebase-emulator** (port 9099 auth, port 4000 UI) — Firebase Auth Emulator

Open http://localhost:3000. Firebase Auth Emulator runs at http://localhost:9099, UI at http://localhost:4000. Create a user there on first boot before logging in.

On first boot, seed the DB with dev fixtures (BTC, ETH, SOL with transactions):
```bash
./scripts/seed.sh
```

Then populate ticker prices:
```bash
cd server && npm run cron
```

To tail logs:
```bash
docker compose logs -f server
docker compose logs -f frontend
```

VS Code debugger: use the **"Full stack"** compound launch config (`.vscode/launch.json`) — attaches Node inspector to the server container and opens Chrome for the frontend.

### Without Docker

Requires Node 24 (`nvm use 24`) and a local/remote Postgres instance.

```bash
# 1. Set DB connection in server/.env (PGHOST, PGPORT, PGUSER, PGPASSWORD)
# 2. Start both services concurrently
./scripts/start.sh
```

## Commands

### Backend (`server/`)
```bash
npm install
npm run build        # bundle with tsdown → dist/
npm run typecheck    # tsc type-check only (no emit)
npm run dev          # tsx watch with Node inspector (hot reload)
npm start            # run compiled dist/handlers/api.js
npm run migrate      # run DB migrations standalone
npm run cron         # run ticker price update once (uses server/.env)
```

### Infrastructure (`infra/`)
```bash
npm install
npm run build
pulumi preview --stack prod
pulumi up --stack prod
pulumi stack output apiEndpoint --stack prod
pulumi stack output dbHost --stack prod
```
Requires `PULUMI_ACCESS_TOKEN` + AWS credentials in environment.
DB password is a Pulumi secret: `pulumi config set --secret dbPassword <value> --stack prod`.

### Frontend (`frontend/`)
```bash
cd frontend
npm install
npm start            # Vite dev server (reads .env for VITE_* vars)
npm run build        # production build → build/
```

## Architecture

Serverless crypto portfolio tracker. Three independent npm projects:

| Directory | Purpose |
|-----------|---------|
| `frontend/` | React 19 + Vite 8 frontend |
| `server/` | Fastify 5 REST API — runs as Lambda via Lambda Web Adapter |
| `infra/` | Pulumi TypeScript — all AWS infrastructure in one stack |

### Frontend (`frontend/`)

Built with **Vite 8**. Uses React 19 (`createRoot`), React Router v7 (`Routes`/`Route element={}`/`useNavigate`), MUI v9, and `recharts` for charts. Styling uses MUI's `sx` prop and `styled()` — `@mui/styles`/`makeStyles` is not used.

Key env vars (set in `.env` for local, injected by CI for prod):
- `VITE_API_ENDPOINT` — base URL for the backend (include trailing slash)
- `VITE_FIREBASE_EMULATOR=true` — points Firebase Auth at the local emulator (http://localhost:9099)
- `VITE_FIREBASE_API_KEY` — Firebase API key (any non-empty string works for the emulator)
- `VITE_FIREBASE_AUTH_DOMAIN` — Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` — Firebase project ID

Vite config notes:
- `.js` files are treated as JSX via esbuild loader config

### Backend (`server/`)

```
server/src/
  handlers/
    api.ts       — Fastify entry point (ignoreTrailingSlash: true)
    cron.ts      — bare Lambda handler for EventBridge
  routes/
    holdings.ts       — GET /coins/list, POST/GET /holdings, GET /holdings/list, POST /holdings/delete
    transactions.ts   — POST /transactions, POST /transactions/delete
    portfolio.ts      — GET /portfolio, GET /portfolio/export, POST /portfolio/import
    news.ts           — GET /news (aggregates RSS from CoinTelegraph, Decrypt, CoinDesk; 5-min cache)
  services/
    coingecko.ts      — all CoinGecko API calls; geckoHeaders() auto-selects demo vs pro key
  db/
    pool.ts           — pg Pool singleton
    migrate.ts        — idempotent schema creation (runs on server startup)
  utils/
    colors.ts         — catTwentyColors palette + randomColor()
server/run.sh    — exec node dist/handlers/api.js  (Lambda Web Adapter entry)
server/.env      — local env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD, COINGECKO_API_KEY, etc.)
```

Two Lambda functions in prod:
- **API Lambda** — `handler: "run.sh"`, LWA layer (`arn:aws:lambda:eu-west-2:753240598075:layer:LambdaAdapterLayerArm64:26`), exposed via Lambda Function URL
- **Cron Lambda** — `handler: "dist/handlers/cron.handler"`, EventBridge every 10 minutes

`GET /coins/list` proxies CoinGecko through the backend so the API key is never exposed to the browser.

### Infrastructure (`infra/index.ts`)

Single Pulumi stack. Key resources:
- **VPC** (10.0.0.0/24, 2 public subnets, IGW)
- **RDS PostgreSQL 16** (t3.micro, public subnet)
- **API Lambda + Function URL** (CORS: all origins)
- **Cron Lambda + EventBridge rule** (every 10 minutes)
- **S3 + CloudFront** — static frontend hosting
Stack outputs used by CI/CD: `apiEndpoint`, `bucketName`, `distributionId`, `distributionDomain`, `dbHost`.

### Database Schema

No ORM — parameterised `$1, $2, ...` queries via the `pg` client. `db/schema.sql` is the single source of truth: mounted into the postgres Docker container for local init, and run on server startup via `migrate.ts` in prod.

Four tables: `tickers`, `ticker_prices`, `holdings`, `transactions`.
Two views: `get_holding_view`, `list_holdings_view` (latest price per holding via window function).

### Auth

- Firebase Auth is used throughout. `frontend/src/firebase.jsx` initialises the Firebase app and exports `auth`.
- `frontend/src/components/Account.jsx` provides the auth context (`getSession`, `authenticate`, `logout`). Firebase's `user.uid` maps to `accountId`.
- Locally, `VITE_FIREBASE_EMULATOR=true` connects to the Firebase Auth Emulator at http://localhost:9099. Create a user via the Emulator UI at http://localhost:4000 on first boot.
- Firebase ID tokens are validated server-side via `firebase-admin` in a Fastify `preHandler` hook (`server/src/auth.ts`). All routes except `/health`, `/coins/list`, and `/news` require `Authorization: Bearer <token>`. The verified `uid` is injected as `req.accountId` — routes never trust a client-supplied `accountId`.
- For local dev, `FIREBASE_AUTH_EMULATOR_HOST` in the server env points the Admin SDK at the Firebase Auth Emulator so tokens issued by the emulator are accepted.

### External Dependencies

- **CoinGecko API** — coin metadata and price history. API key in `server/.env` (`COINGECKO_API_KEY`). Demo keys start with `CG-`, pro keys do not.
- Currency: **GBP** throughout

## CI/CD

- **`pr.yml`** — on PR to master: version bump check, TypeScript build of `server/` + frontend, `pulumi preview`
- **`release.yml`** — on published GitHub release: `pulumi up`, DB migrations, frontend build with injected API URL, S3 sync, CloudFront invalidation

Required GitHub Secrets: `PULUMI_ACCESS_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DB_PASSWORD`.

## Key Conventions

- All DB queries use parameterised placeholders (no string interpolation)
- Bulk historical price loading uses `pg-copy-streams` COPY via a temp TSV file in `/tmp`
- `import-portfolio` calls service functions in-process (no Lambda invocation)
- AWS region is `eu-west-2` throughout
- All primary keys are UUIDs (v4 via `uuid`)
- Node 24 throughout
