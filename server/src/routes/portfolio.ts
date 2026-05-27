import fs from "node:fs";
import fsp from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { from as copyFrom } from "pg-copy-streams";
import { json2tsv } from "tsv-json";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { fetchCoinData, fetchHistoricalPrices, fetchSimplePrice } from "../services/coingecko";
import { randomColor } from "../utils/colors";

async function createHolding(coinId: string, accountId: string): Promise<string> {
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
        await client.query(`INSERT INTO holdings (holding_id, ticker_id, color, account_id) VALUES ($1, $2, $3, $4)`, [
            holdingId,
            tickerId,
            randomColor(),
            accountId,
        ]);
    } finally {
        client.release();
    }

    const price = await fetchSimplePrice(coinId);
    const dateStr = new Date().toISOString();
    const priceClient = await pool.connect();
    try {
        await priceClient.query(
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
        priceClient.release();
    }

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
            await pipeline(fs.createReadStream(tmpFile), stream);
        } finally {
            copyClient.release();
        }
    } finally {
        await fsp.unlink(tmpFile);
    }

    return holdingId;
}

async function createTransaction(
    holdingId: string,
    datetime: string,
    buySell: string,
    units: string,
    price: string,
): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO transactions (tx_id, holding_id, datetime, buy_sell, units, price) VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), holdingId, new Date(datetime).toISOString(), buySell, units, price],
        );
    } finally {
        client.release();
    }
}

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
    // GET /portfolio
    app.get("/portfolio", async (req, reply) => {
        const { accountId } = req;
        const client = await pool.connect();
        try {
            const holdings = await client.query(`SELECT * FROM get_holding_view WHERE account_id = $1`, [accountId]);
            const holdingIds = holdings.rows.map((h) => h.holding_id);
            if (holdingIds.length === 0) {
                return reply.send({ holdings: [], tickerPrices: [], transactions: [] });
            }
            const placeholders = holdingIds.map((_, i) => `$${i + 1}`).join(", ");
            const transactions = await client.query(
                `SELECT * FROM transactions WHERE holding_id IN (${placeholders})`,
                holdingIds,
            );
            const tickerIds = holdings.rows.map((h) => h.ticker_id);
            const tickerPlaceholders = tickerIds.map((_, i) => `$${i + 1}`).join(", ");
            const lastUpdatedResult = await client.query<{ ticker_id: string; last_updated: string }>(
                `SELECT ticker_id, MAX(last_updated) AS last_updated FROM ticker_prices WHERE ticker_id IN (${tickerPlaceholders}) GROUP BY ticker_id`,
                tickerIds,
            );
            const lastUpdatedByTicker = Object.fromEntries(
                lastUpdatedResult.rows.map((r) => [r.ticker_id, r.last_updated]),
            );
            const holdingsWithTimestamp = holdings.rows.map((h) => ({
                ...h,
                price_last_updated: lastUpdatedByTicker[h.ticker_id] ?? null,
            }));
            const overallLastUpdate = lastUpdatedResult.rows.reduce<string | null>((max, r) => {
                if (!max || r.last_updated > max) return r.last_updated;
                return max;
            }, null);
            return reply.send({
                holdings: holdingsWithTimestamp,
                tickerPrices: [],
                transactions: transactions.rows,
                lastPriceUpdate: overallLastUpdate,
            });
        } finally {
            client.release();
        }
    });

    // GET /portfolio/export
    app.get("/portfolio/export", async (req, reply) => {
        const { accountId } = req;
        const client = await pool.connect();
        try {
            const holdings = await client.query(`SELECT * FROM get_holding_view WHERE account_id = $1`, [accountId]);
            const holdingIds = holdings.rows.map((h) => h.holding_id);
            if (holdingIds.length === 0) {
                return reply.send([]);
            }
            const placeholders = holdingIds.map((_, i) => `$${i + 1}`).join(", ");
            const transactions = await client.query(
                `SELECT * FROM transactions WHERE holding_id IN (${placeholders})`,
                holdingIds,
            );
            return reply.send(
                holdings.rows.map((h) => ({
                    coinID: h.coin_id,
                    transactions: transactions.rows
                        .filter((t) => t.holding_id === h.holding_id)
                        .map((t) => ({ buySell: t.buy_sell, datetime: t.datetime, price: t.price, units: t.units })),
                })),
            );
        } finally {
            client.release();
        }
    });

    // POST /portfolio/import
    app.post<{
        Body: {
            portfolio: Array<{
                coinID: string;
                transactions: Array<{ buySell: string; datetime: string; units: string; price: string }>;
            }>;
        };
    }>("/portfolio/import", async (req, reply) => {
        const { portfolio } = req.body;
        const { accountId } = req;
        for (const holding of portfolio) {
            const holdingId = await createHolding(holding.coinID, accountId);
            for (const tx of holding.transactions) {
                await createTransaction(holdingId, tx.datetime, tx.buySell, tx.units, tx.price);
            }
        }
        return reply.send({ message: "Portfolio imported successfully" });
    });
}
