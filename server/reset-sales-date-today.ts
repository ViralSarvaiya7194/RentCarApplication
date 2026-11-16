import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { pool } from './db/connection';

// Load .env configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function resetSalesDateToToday() {
  const client = await pool.connect();
  try {
    console.log('========================================================================');
    console.log('📅 Resetting Active Sales Date to Today\'s Date');
    console.log('========================================================================');

    const sqlPath = path.resolve(__dirname, 'db', 'reset-sales-date-today.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8');

    await client.query(sqlScript);

    const res = await client.query(`
      SELECT key, value AS active_sales_date, updated_at
      FROM system_settings
      WHERE key = 'CURRENT_SALES_DATE';
    `);

    console.log('\n✅ Sales Date successfully reset to today:');
    console.table(res.rows);
  } catch (err: any) {
    console.error('❌ Error resetting sales date:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetSalesDateToToday();

