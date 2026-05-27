import "dotenv/config";
import { runMigrations } from "./migrate";
import { pool } from "./pool";

runMigrations(pool)
    .then(() => {
        process.exit(0);
    })
    .catch((_err) => {
        process.exit(1);
    });
