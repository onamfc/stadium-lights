import fs from 'fs';
import path from 'path';
import { query } from './client';

export async function runMigrations(): Promise<void> {
  // Create migrations tracking table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get list of migration files
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found');
    return;
  }

  // Get already executed migrations
  const executed = await query<{ name: string }>(
    'SELECT name FROM migrations ORDER BY id'
  );
  const executedNames = new Set(executed.rows.map((r) => r.name));

  // Run pending migrations
  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`Migration already executed: ${file}`);
      continue;
    }

    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await query(sql);
      await query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      console.log(`Migration completed: ${file}`);
    } catch (error) {
      console.error(`Migration failed: ${file}`, error);
      throw error;
    }
  }

  console.log('All migrations completed');
}
