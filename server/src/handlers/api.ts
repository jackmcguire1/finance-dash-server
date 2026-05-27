import "dotenv/config";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { registerAuthHook } from "../auth";
import { runMigrations } from "../db/migrate";
import { pool } from "../db/pool";
import { holdingsRoutes } from "../routes/holdings";
import { portfolioRoutes } from "../routes/portfolio";
import { transactionsRoutes } from "../routes/transactions";

const app = Fastify({ logger: true, ignoreTrailingSlash: true });

async function start(): Promise<void> {
    await app.register(cors, { origin: true });
    await app.register(sensible);

    await runMigrations(pool);

    registerAuthHook(app, ["/health", "/coins/list", "/coins/markets", "/coins/search"]);

    await app.register(holdingsRoutes);
    await app.register(transactionsRoutes);
    await app.register(portfolioRoutes);

    app.get("/health", async () => ({ status: "ok" }));

    const port = Number(process.env.PORT ?? 8080);
    await app.listen({ port, host: "0.0.0.0" });
}

start().catch((_err) => {
    process.exit(1);
});
