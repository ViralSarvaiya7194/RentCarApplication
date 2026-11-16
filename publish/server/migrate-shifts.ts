import dotenv from 'dotenv';
import path from 'path';
import { pool } from './db/connection';
import { runDatabaseMigrations } from './db/migrations';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function migrate() {
  console.log('⚡ Running database migrations via migrate-shifts.ts...');
  try {
    const result = await runDatabaseMigrations(pool);
    console.log(`✅ Migrations completed: ${result.applied} applied, ${result.skipped} previously applied.`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
