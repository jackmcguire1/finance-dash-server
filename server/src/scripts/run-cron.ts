import "dotenv/config";
import { pool } from "../db/pool";
import { updateTickerPrices } from "../services/coingecko";

updateTickerPrices()
    .then(() => {
        process.exit(0);
    })
    .catch((_err) => {
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });
