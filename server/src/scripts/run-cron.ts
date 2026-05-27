import 'dotenv/config';
import { updateTickerPrices } from '../services/coingecko';
import { pool } from '../db/pool';

console.log('Running ticker price update...');

updateTickerPrices()
    .then(() => {
        console.log('Done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });
