import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import app from './app';
import { pool } from './config/database';

async function runMigrationsOnStartup(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, skipping migrations');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) return;

  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      try {
        await client.query(sql);
      } catch (err: any) {
        if (!err.message?.includes('already exists')) {
          throw err;
        }
      }
    }
    console.log(`Migrations applied (${files.length} files)`);
  } finally {
    client.release();
  }
}

const PORT = process.env.PORT || 3000;

runMigrationsOnStartup()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });
