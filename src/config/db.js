const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Runs `work(client)` inside a single dedicated connection wrapped in
 * BEGIN/COMMIT/ROLLBACK.
 *
 * This exists because `pool.query('BEGIN')` followed by further
 * `pool.query(...)` calls does NOT guarantee the same underlying connection
 * for each statement - the pool is free to hand out a different client for
 * every query. Under load (pool exhausted, concurrent requests) that splits
 * a single "transaction" across two unrelated backend connections: the
 * BEGIN and COMMIT/ROLLBACK become no-ops on connections nobody else
 * touches, and the statements in between run un-transacted, so a failure
 * partway through leaves the database in a half-updated state instead of
 * rolling back.
 *
 * `pool.connect()` checks out one client for the whole callback, so every
 * statement - including BEGIN/COMMIT/ROLLBACK - runs on the same backend
 * connection.
 *
 * If `actingUserId` is provided, it is exposed to the transaction as the
 * Postgres session-local setting `app.current_user_id` via `SET LOCAL`.
 * `fn_audit_complaint_status_change()` reads that setting to attribute
 * automated audit log rows to the user who actually triggered the change,
 * instead of writing them with changed_by_user_id = NULL.
 */
async function withTransaction(work, actingUserId = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (actingUserId) {
            // SET LOCAL cannot take a bind parameter, so the value is
            // escaped and inlined via format() equivalent (quote_literal)
            // executed by Postgres itself, not string-concatenated here.
            await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', actingUserId]);
        }
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    withTransaction,
    pool,
};
