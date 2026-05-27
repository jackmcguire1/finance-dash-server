import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";

const BASE = "https://api.coingecko.com/api/v3";

function geckoHeaders(): Record<string, string> {
    const key = process.env.COINGECKO_API_KEY;
    if (!key) return {};
    // Demo keys (CG-...) use the demo header; Pro keys use the pro header
    return key.startsWith("CG-") ? { "x-cg-demo-api-key": key } : { "x-cg-pro-api-key": key };
}

export interface CoinData {
    name: string;
    symbol: string;
    currentPrice: number;
    twentyFourHourChange: number;
    marketCap: number;
    volume: number;
    imageUrl: string;
}

export interface TickerPrice {
    gbp: number;
    gbp_24h_change: number;
    gbp_market_cap: number;
    gbp_24h_vol: number;
}

export async function fetchCoinsList(): Promise<{ id: string; symbol: string; name: string }[]> {
    const { data } = await axios.get(`${BASE}/coins/list`, { headers: geckoHeaders() });
    return data;
}

export async function fetchCoinData(coinId: string): Promise<CoinData> {
    const { data } = await axios.get(`${BASE}/coins/${coinId}`, {
        headers: geckoHeaders(),
        params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
        },
    });
    return {
        name: data.name,
        symbol: (data.symbol as string).toUpperCase(),
        currentPrice: data.market_data.current_price.gbp,
        twentyFourHourChange: data.market_data.price_change_24h,
        marketCap: data.market_data.market_cap.gbp,
        volume: data.market_data.total_volume.gbp,
        imageUrl: data.image.large,
    };
}

export async function fetchSimplePrice(coinId: string): Promise<TickerPrice> {
    const { data } = await axios.get(`${BASE}/simple/price`, {
        headers: geckoHeaders(),
        params: {
            ids: coinId,
            vs_currencies: "gbp",
            include_24hr_change: true,
            include_market_cap: true,
            include_24hr_vol: true,
        },
    });
    return data[coinId] as TickerPrice;
}

export async function fetchHistoricalPrices(coinId: string): Promise<{
    prices: [number, number][];
    market_caps: [number, number][];
    total_volumes: [number, number][];
}> {
    const { data } = await axios.get(`${BASE}/coins/${coinId}/market_chart`, {
        headers: geckoHeaders(),
        params: { vs_currency: "gbp", days: "365", interval: "daily" },
    });
    return data;
}

export async function updateTickerPrices(): Promise<void> {
    const client = await pool.connect();
    try {
        const { rows } = await client.query<{ ticker_id: string; coin_id: string }>(
            "SELECT ticker_id, coin_id FROM tickers",
        );
        if (rows.length === 0) return;

        const coinIds = rows.map((r) => r.coin_id).join(",");
        const { data } = await axios.get(`${BASE}/simple/price`, {
            headers: geckoHeaders(),
            params: {
                ids: coinIds,
                vs_currencies: "gbp",
                include_24hr_change: true,
                include_market_cap: true,
                include_24hr_vol: true,
            },
        });

        const dateStr = new Date().toISOString();
        await Promise.all(
            rows.map(async (t) => {
                const price = data[t.coin_id];
                if (!price) return;
                await client.query(
                    `INSERT INTO ticker_prices (tp_id, ticker_id, datetime, price, twenty_four_hour_change, market_cap, volume, last_updated)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        uuidv4(),
                        t.ticker_id,
                        dateStr,
                        price.gbp,
                        price.gbp_24h_change,
                        price.gbp_market_cap,
                        price.gbp_24h_vol,
                        dateStr,
                    ],
                );
            }),
        );
    } finally {
        client.release();
    }
}
