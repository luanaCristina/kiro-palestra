import { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * Creates the PostgreSQL connection pool.
 * Supports both DATABASE_URL (used by Render/production) and individual env vars (local dev).
 */
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'appointment_scheduling',
        user: process.env.DB_USER || undefined,
        password: process.env.DB_PASSWORD || undefined,
      }
);

/**
 * Execute a parameterized SQL query against the connection pool.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export { pool };
