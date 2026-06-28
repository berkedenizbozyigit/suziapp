import { query } from './db.js';

// Insert a signup. ON CONFLICT makes a repeat signup a harmless no-op
// instead of a unique-violation error.
// Returns { created } so callers can distinguish new from duplicate.
export async function insertSignup(email) {
  const result = await query(
    `INSERT INTO signups (email) VALUES ($1)
     ON CONFLICT (email) DO NOTHING`,
    [email],
  );
  return { created: result.rowCount === 1 };
}
