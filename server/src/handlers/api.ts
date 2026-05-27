import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { pool } from '../db/pool';
import { runMigrations } from '../db/migrate';
import { holdingsRoutes } from '../routes/holdings';
import { transactionsRoutes } from '../routes/transactions';
import { portfolioRoutes } from '../routes/portfolio';

const app = Fastify({ logger: true, ignoreTrailingSlash: true });

async function start(): Promise<void> {
    await app.register(cors, { origin: true });
    await app.register(sensible);

    await runMigrations(pool);

    await app.register(holdingsRoutes);
    await app.register(transactionsRoutes);
    await app.register(portfolioRoutes);

    app.get('/health', async () => ({ status: 'ok' }));

    const port = Number(process.env.PORT ?? 8080);
    await app.listen({ port, host: '0.0.0.0' });
}

start().catch(err => {
    console.error(err);
    process.exit(1);
});
