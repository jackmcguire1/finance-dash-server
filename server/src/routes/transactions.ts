import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';

export async function transactionsRoutes(app: FastifyInstance): Promise<void> {
    // POST /transactions
    app.post<{
        Body: { holdingId: string; datetime: string; buySell: string; units: string; price: string };
    }>('/transactions', async (req, reply) => {
        const { holdingId, datetime, buySell, units, price } = req.body;
        const txId = uuidv4();
        const isoDate = new Date(datetime).toISOString();
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO transactions (tx_id, holding_id, datetime, buy_sell, units, price)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [txId, holdingId, isoDate, buySell, units, price]
            );
            return reply.send({ tx_id: txId, holding_id: holdingId, datetime: isoDate, buy_sell: buySell, units, price });
        } finally {
            client.release();
        }
    });

    // POST /transactions/delete
    app.post<{ Body: { txIds: string[] } }>('/transactions/delete', async (req, reply) => {
        const { txIds } = req.body;
        const placeholders = txIds.map((_, i) => `$${i + 1}`).join(', ');
        const client = await pool.connect();
        try {
            await client.query(`DELETE FROM transactions WHERE tx_id IN (${placeholders})`, txIds);
            return reply.send({ message: 'Transactions deleted successfully' });
        } finally {
            client.release();
        }
    });
}
