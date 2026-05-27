import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";

export async function transactionsRoutes(app: FastifyInstance): Promise<void> {
    // POST /transactions
    app.post<{
        Body: { holdingId: string; datetime: string; buySell: string; units: string; price: string };
    }>("/transactions", async (req, reply) => {
        const { holdingId, datetime, buySell, units, price } = req.body;
        const { accountId } = req;
        const txId = uuidv4();
        const isoDate = new Date(datetime).toISOString();
        const client = await pool.connect();
        try {
            // Verify the holding belongs to this user before inserting
            const ownerCheck = await client.query(`SELECT 1 FROM holdings WHERE holding_id = $1 AND account_id = $2`, [
                holdingId,
                accountId,
            ]);
            if (ownerCheck.rowCount === 0) {
                return reply.status(403).send({ error: "Forbidden" });
            }
            await client.query(
                `INSERT INTO transactions (tx_id, holding_id, datetime, buy_sell, units, price)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [txId, holdingId, isoDate, buySell, units, price],
            );
            return reply.send({
                tx_id: txId,
                holding_id: holdingId,
                datetime: isoDate,
                buy_sell: buySell,
                units,
                price,
            });
        } finally {
            client.release();
        }
    });

    // PUT /transactions/:id
    app.put<{
        Params: { id: string };
        Body: { datetime: string; buySell: string; units: string; price: string };
    }>("/transactions/:id", async (req, reply) => {
        const { id } = req.params;
        const { datetime, buySell, units, price } = req.body;
        const { accountId } = req;
        const isoDate = new Date(datetime).toISOString();
        const client = await pool.connect();
        try {
            const result = await client.query(
                `UPDATE transactions
                 SET datetime = $1, buy_sell = $2, units = $3, price = $4
                 WHERE tx_id = $5
                   AND holding_id IN (SELECT holding_id FROM holdings WHERE account_id = $6)
                 RETURNING *`,
                [isoDate, buySell, units, price, id, accountId],
            );
            if (result.rowCount === 0) {
                return reply.status(404).send({ error: "Transaction not found" });
            }
            return reply.send(result.rows[0]);
        } finally {
            client.release();
        }
    });

    // POST /transactions/delete
    app.post<{ Body: { txIds: string[] } }>("/transactions/delete", async (req, reply) => {
        const { txIds } = req.body;
        const { accountId } = req;
        // $1 = accountId, $2…$N = txIds
        const placeholders = txIds.map((_, i) => `$${i + 2}`).join(", ");
        const client = await pool.connect();
        try {
            await client.query(
                `DELETE FROM transactions
                 WHERE tx_id IN (${placeholders})
                   AND holding_id IN (SELECT holding_id FROM holdings WHERE account_id = $1)`,
                [accountId, ...txIds],
            );
            return reply.send({ message: "Transactions deleted successfully" });
        } finally {
            client.release();
        }
    });
}
