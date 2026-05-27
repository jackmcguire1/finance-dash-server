import 'dotenv/config';
import { pool } from './pool';
import { runMigrations } from './migrate';

runMigrations(pool)
    .then(() => {
        console.log('Migrations complete');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
