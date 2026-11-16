import dotenv from 'dotenv';
import path from 'path';
import { pool } from './db/connection';

// Load .env configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function wipeTransactions() {
  const client = await pool.connect();
  try {
    console.log('🔄 Connecting to PostgreSQL database to wipe transaction data...');
    
    await client.query('BEGIN');

    // 1. Truncate transaction tables with CASCADE
    console.log('🧹 Truncating rentals, shifts, day_closes, and print_audit_logs...');
    await client.query(`
      TRUNCATE TABLE rentals CASCADE;
      TRUNCATE TABLE shifts CASCADE;
      TRUNCATE TABLE day_closes CASCADE;
      TRUNCATE TABLE print_audit_logs CASCADE;
    `);

    // 2. Reset car statuses to Available
    console.log('🚗 Resetting all cars status to "Available"...');
    await client.query(`UPDATE cars SET status = 'Available', updated_at = NOW();`);

    // 3. Reset serial sequences
    await client.query(`
      ALTER SEQUENCE IF EXISTS day_closes_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS print_audit_logs_id_seq RESTART WITH 1;
    `);

    await client.query('COMMIT');
    console.log('✅ Transaction data wiped successfully!');

    // 4. Verify row counts
    const verification = await client.query(`
      SELECT 'rentals' AS table_name, COUNT(*)::int AS row_count FROM rentals
      UNION ALL
      SELECT 'shifts' AS table_name, COUNT(*)::int AS row_count FROM shifts
      UNION ALL
      SELECT 'day_closes' AS table_name, COUNT(*)::int AS row_count FROM day_closes
      UNION ALL
      SELECT 'print_audit_logs' AS table_name, COUNT(*)::int AS row_count FROM print_audit_logs
      UNION ALL
      SELECT 'available_cars' AS table_name, COUNT(*)::int AS row_count FROM cars WHERE status = 'Available'
      UNION ALL
      SELECT 'total_cars' AS table_name, COUNT(*)::int AS row_count FROM cars;
    `);

    console.log('\n📊 Database Status After Wipe:');
    console.table(verification.rows);
    console.log('🎉 System is clean and ready for fresh transactions!\n');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error wiping transaction data:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

wipeTransactions();
