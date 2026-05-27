import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const schema = readFileSync(join(__dirname, '../../../db/schema.sql'), 'utf8');

export async function runMigrations(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(schema);
    } finally {
        client.release();
    }
}
