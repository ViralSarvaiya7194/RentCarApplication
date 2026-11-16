import dotenv from 'dotenv';
import path from 'path';
import { pool } from './db/connection';
import { runDatabaseMigrations } from './db/migrations';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('⚡ Starting PostgreSQL Database Migration Check...');
  try {
    const result = await runDatabaseMigrations(pool);
    console.log(`Summary: ${result.applied} applied, ${result.skipped} skipped (already up to date).`);
    process.exit(0);
  } catch (err: any) {
    console.error('Fatal migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
