import pg from 'pg';

const { Pool } = pg;

// One pool, reused across warm serverless invocations. The connection isn't
// opened until the first query, so importing this without POSTGRES_URL is safe.
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export function query(text, params) {
  return pool.query(text, params);
}

// Lets tests close the pool so the process can exit cleanly.
export function endPool() {
  return pool.end();
}
