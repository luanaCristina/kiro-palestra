import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let testPool: Pool | null = null;

/**
 * Returns a Pool connected to the test database.
 * Uses the same connection params as the main app but with `_test` suffix on DB_NAME.
 * Reuses the same pool instance across calls.
 */
export function getTestPool(): Pool {
  if (!testPool) {
    const baseDbName = process.env.DB_NAME || 'appointment_scheduling';
    const dbName = baseDbName.endsWith('_test') ? baseDbName : baseDbName + '_test';

    testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: dbName,
      user: process.env.DB_USER || undefined,
      password: process.env.DB_PASSWORD || undefined,
    });
  }

  return testPool;
}

/**
 * Truncates all application tables in the correct order (respecting FK constraints).
 * Used between tests to ensure a clean state.
 */
export async function truncateAllTables(): Promise<void> {
  const pool = getTestPool();
  await pool.query(`
    TRUNCATE TABLE appointments, availability_ranges, patients, doctors CASCADE
  `);
}

/**
 * Runs all SQL migration files from the migrations/ folder in order.
 * Creates the schema in the test database.
 */
export async function runMigrations(): Promise<void> {
  const pool = getTestPool();
  const migrationsDir = path.resolve(__dirname, '../../migrations');

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      try {
        await client.query(sql);
      } catch (err: any) {
        // Ignore "already exists" errors — migrations may have already been applied
        if (!err.message?.includes('already exists')) {
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes the test pool connection.
 * Should be called in afterAll() hooks.
 */
export async function closePool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}
