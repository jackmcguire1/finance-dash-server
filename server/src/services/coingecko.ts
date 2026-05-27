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

export interface TickerPrice {
    gbp: number;
    gbp_24h_change: number;
    gbp_market_cap: number;
    gbp_24h_vol: number;
    usd: number;
    eur: number;
}

export async function fetchCoinsList(): Promise<{ id: string; symbol: string; name: string }[]> {
    const { data } = await axios.get(`${BASE}/coins/list`, { headers: geckoHeaders() });
    return data;
}

export interface MarketCoin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
}

export async function fetchCoinsMarkets(page: number, perPage: number, currency = "gbp"): Promise<MarketCoin[]> {
    const { data } = await axios.get(`${BASE}/coins/markets`, {
        headers: geckoHeaders(),
        params: { vs_currency: currency, order: "market_cap_desc", per_page: perPage, page, sparkline: false },
    });
    return data;
}

export async function searchCoins(query: string, currency = "gbp"): Promise<MarketCoin[]> {
    const { data } = await axios.get(`${BASE}/search`, {
        headers: geckoHeaders(),
        params: { query },
    });
    const coinIds = (data.coins as { id: string }[]).slice(0, 20).map((c) => c.id).join(",");
    if (!coinIds) return [];
    const { data: markets } = await axios.get(`${BASE}/coins/markets`, {
        headers: geckoHeaders(),
        params: { vs_currency: currency, ids: coinIds, order: "market_cap_desc", per_page: 20, page: 1, sparkline: false },
    });
    return markets;
}

export interface CoinData {
    name: string;
    symbol: string;
    currentPrice: number;
    currentPriceUsd: number;
    currentPriceEur: number;
    twentyFourHourChange: number;
    marketCap: number;
    volume: number;
    imageUrl: string;
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
        currentPriceUsd: data.market_data.current_price.usd,
        currentPriceEur: data.market_data.current_price.eur,
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
            vs_currencies: "gbp,usd,eur",
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
        const { rows } = await client.query<{ coin_id: string; ticker_ids: string[] }>(
            "SELECT coin_id, array_agg(ticker_id) AS ticker_ids FROM tickers GROUP BY coin_id",
        );
        if (rows.length === 0) return;

        const coinIds = rows.map((r) => r.coin_id).join(",");
        const { data } = await axios.get(`${BASE}/simple/price`, {
            headers: geckoHeaders(),
            params: {
                ids: coinIds,
                vs_currencies: "gbp,usd,eur",
                include_24hr_change: true,
                include_market_cap: true,
                include_24hr_vol: true,
            },
        });

        const dateStr = new Date().toISOString();
        const insertRows = rows.flatMap(({ coin_id, ticker_ids }) => {
            const price = data[coin_id];
            if (!price) return [];
            return ticker_ids.map((ticker_id) => ({
                tp_id: uuidv4(),
                ticker_id,
                datetime: dateStr,
                price: price.gbp,
                price_usd: price.usd,
                price_eur: price.eur,
                twenty_four_hour_change: price.gbp_24h_change,
                market_cap: price.gbp_market_cap,
                volume: price.gbp_24h_vol,
                last_updated: dateStr,
            }));
        });
        if (insertRows.length > 0) {
            await client.query(
                `INSERT INTO ticker_prices (tp_id, ticker_id, datetime, price, price_usd, price_eur, twenty_four_hour_change, market_cap, volume, last_updated)
                 SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::timestamptz[], $4::numeric[], $5::numeric[], $6::numeric[], $7::numeric[], $8::numeric[], $9::numeric[], $10::timestamptz[])`,
                [
                    insertRows.map((r) => r.tp_id),
                    insertRows.map((r) => r.ticker_id),
                    insertRows.map((r) => r.datetime),
                    insertRows.map((r) => r.price),
                    insertRows.map((r) => r.price_usd),
                    insertRows.map((r) => r.price_eur),
                    insertRows.map((r) => r.twenty_four_hour_change),
                    insertRows.map((r) => r.market_cap),
                    insertRows.map((r) => r.volume),
                    insertRows.map((r) => r.last_updated),
                ],
            );
        }
    } finally {
        client.release();
    }
}
