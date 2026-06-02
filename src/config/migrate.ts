import * as fs from 'fs';
import * as path from 'path';
import { pool } from './database';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../migrations');

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s)`);

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`Completed: ${file}`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration process failed:', error);
  process.exit(1);
});
