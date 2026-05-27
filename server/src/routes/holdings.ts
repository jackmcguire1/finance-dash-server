import fs from "node:fs";
import fsp from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { from as copyFrom } from "pg-copy-streams";
import { json2tsv } from "tsv-json";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { fetchCoinData, fetchCoinsList, fetchCoinsMarkets, fetchHistoricalPrices, fetchSimplePrice, searchCoins } from "../services/coingecko";
import { randomColor } from "../utils/colors";

export async function holdingsRoutes(app: FastifyInstance): Promise<void> {
    // GET /coins/list — proxy to CoinGecko with server-side API key
    app.get("/coins/list", async (_req, reply) => {
        const coins = await fetchCoinsList();
        return reply.send(coins);
    });

    // GET /coins/markets?page=1&perPage=25&currency=gbp — top coins by market cap with images
    app.get<{ Querystring: { page?: string; perPage?: string; currency?: string } }>("/coins/markets", async (req, reply) => {
        const page = parseInt(req.query.page ?? "1", 10);
        const perPage = parseInt(req.query.perPage ?? "25", 10);
        const currency = ["gbp", "usd", "eur"].includes(req.query.currency ?? "") ? req.query.currency! : "gbp";
        const coins = await fetchCoinsMarkets(page, Math.min(perPage, 100), currency);
        return reply.send(coins);
    });

    // GET /coins/search?q=bitcoin&currency=gbp — search coins with images
    app.get<{ Querystring: { q: string; currency?: string } }>("/coins/search", async (req, reply) => {
        const { q } = req.query;
        if (!q || q.trim().length < 2) return reply.send([]);
        const currency = ["gbp", "usd", "eur"].includes(req.query.currency ?? "") ? req.query.currency! : "gbp";
        const coins = await searchCoins(q.trim(), currency);
        return reply.send(coins);
    });

    // POST /holdings — create a new holding
    app.post<{ Body: { coinId: string } }>("/holdings", async (req, reply) => {
        const { coinId } = req.body;
        const { accountId } = req;
        const tickerId = uuidv4();
        const holdingId = uuidv4();

        const coinData = await fetchCoinData(coinId);
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO tickers (ticker_id, ticker_name, symbol, current_price, current_price_usd, current_price_eur, twenty_four_hour_change, market_cap, volume, image_url, coin_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    tickerId,
                    coinData.name,
                    coinData.symbol,
                    coinData.currentPrice,
                    coinData.currentPriceUsd,
                    coinData.currentPriceEur,
                    coinData.twentyFourHourChange,
                    coinData.marketCap,
                    coinData.volume,
                    coinData.imageUrl,
                    coinId,
                ],
            );
            await client.query(
                `INSERT INTO holdings (holding_id, ticker_id, color, account_id) VALUES ($1, $2, $3, $4)`,
                [holdingId, tickerId, randomColor(), accountId],
            );
        } finally {
            client.release();
        }

        const price = await fetchSimplePrice(coinId);
        const dateStr = new Date().toISOString();

        const poolClient = await pool.connect();
        try {
            await poolClient.query(
                `INSERT INTO ticker_prices (tp_id, ticker_id, datetime, price, price_usd, price_eur, twenty_four_hour_change, market_cap, volume, last_updated)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    uuidv4(),
                    tickerId,
                    dateStr,
                    price.gbp,
                    price.usd,
                    price.eur,
                    price.gbp_24h_change,
                    price.gbp_market_cap,
                    price.gbp_24h_vol,
                    dateStr,
                ],
            );
        } finally {
            poolClient.release();
        }

        // Bulk-load historical prices via COPY
        const historical = await fetchHistoricalPrices(coinId);
        const tsvRows = historical.prices.map((curr, i) => [
            uuidv4(),
            tickerId,
            new Date(curr[0]).toISOString(),
            String(curr[1]),
            "null",
            String(historical.market_caps[i][1]),
            String(historical.total_volumes[i][1]),
            "null",
        ]);

        const tmpFile = `/tmp/bulk_${uuidv4()}.tsv`;
        try {
            await fsp.writeFile(tmpFile, json2tsv(tsvRows), "utf8");
            const copyClient = await pool.connect();
            try {
                const stream = copyClient.query(copyFrom("COPY ticker_prices (tp_id, ticker_id, datetime, price, twenty_four_hour_change, market_cap, volume, last_updated) FROM STDIN WITH NULL as 'null'"));
                const fileStream = fs.createReadStream(tmpFile);
                await pipeline(fileStream, stream);
            } finally {
                copyClient.release();
            }
        } finally {
            await fsp.unlink(tmpFile);
        }

        return reply.send({
            holding_id: holdingId,
            ticker_last_updated: dateStr,
            ticker_logo: coinData.imageUrl,
            ticker_name: coinData.name,
            ticker_price: String(price.gbp),
            ticker_price_usd: String(price.usd),
            ticker_price_eur: String(price.eur),
            ticker_symbol: coinData.symbol,
            ticker_twenty_four_change: String(price.gbp_24h_change),
            transactions: [],
        });
    });

    // GET /holdings?id= — get a single holding with price history + transactions
    app.get<{ Querystring: { id: string } }>("/holdings", async (req, reply) => {
        const { id } = req.query;
        const { accountId } = req;
        const client = await pool.connect();
        try {
            const holding = await client.query(
                `SELECT * FROM get_holding_view WHERE holding_id = $1 AND account_id = $2`,
                [id, accountId],
            );
            if (holding.rowCount !== 1) {
                return reply.status(404).send({ error: `Expected 1 row, found ${holding.rowCount}` });
            }
            const transactions = await client.query(`SELECT * FROM transactions WHERE holding_id = $1`, [id]);
            const tickerPrices = await client.query(
                `SELECT * FROM ticker_prices WHERE ticker_id = $1 ORDER BY datetime ASC`,
                [holding.rows[0].ticker_id],
            );
            return reply.send({
                holding: holding.rows[0],
                tickerPrices: tickerPrices.rows,
                transactions: transactions.rows,
            });
        } finally {
            client.release();
        }
    });

    // GET /holdings/list — list all holdings for an account
    app.get("/holdings/list", async (req, reply) => {
        const { accountId } = req;
        const client = await pool.connect();
        try {
            const holdings = await client.query(`SELECT * FROM list_holdings_view WHERE account_id = $1`, [accountId]);
            const holdingIds = holdings.rows.map((h) => h.holding_id);
            if (holdingIds.length === 0) {
                return reply.send({ items: [] });
            }
            const placeholders = holdingIds.map((_, i) => `$${i + 1}`).join(", ");
            const transactions = await client.query(
                `SELECT tx_id, holding_id, datetime, buy_sell, units, price FROM transactions WHERE holding_id IN (${placeholders})`,
                holdingIds,
            );
            return reply.send({
                items: holdings.rows.map((h) => ({
                    ...h,
                    transactions: transactions.rows.filter((t) => t.holding_id === h.holding_id),
                })),
            });
        } finally {
            client.release();
        }
    });

    // GET /tickers/prices — latest price for each distinct coin
    app.get("/tickers/prices", async (_req, reply) => {
        const client = await pool.connect();
        try {
            const { rows } = await client.query(`
                SELECT DISTINCT ON (t.coin_id)
                    t.coin_id,
                    t.ticker_name,
                    t.symbol,
                    t.image_url,
                    p.price,
                    p.price_usd,
                    p.price_eur,
                    p.twenty_four_hour_change,
                    p.market_cap,
                    p.volume,
                    p.datetime AS last_updated
                FROM tickers t
                JOIN ticker_prices p ON p.ticker_id = t.ticker_id
                ORDER BY t.coin_id, p.datetime DESC
            `);
            return reply.send(rows);
        } finally {
            client.release();
        }
    });

    // POST /holdings/delete
    app.post<{ Body: { holdingIds: string[] } }>("/holdings/delete", async (req, reply) => {
        const { holdingIds } = req.body;
        const { accountId } = req;
        // $1 = accountId, $2…$N = holdingIds
        const placeholders = holdingIds.map((_, i) => `$${i + 2}`).join(", ");
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                `DELETE FROM transactions WHERE holding_id IN (
                    SELECT holding_id FROM holdings WHERE holding_id IN (${placeholders}) AND account_id = $1
                )`,
                [accountId, ...holdingIds],
            );
            await client.query(`DELETE FROM holdings WHERE holding_id IN (${placeholders}) AND account_id = $1`, [
                accountId,
                ...holdingIds,
            ]);
            await client.query("COMMIT");
            return reply.send({ message: "Holdings deleted successfully" });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    });
}
