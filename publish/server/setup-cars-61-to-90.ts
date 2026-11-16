import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { pool } from './db/connection';

// Load .env configuration
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function setupCars61To90() {
  const client = await pool.connect();
  try {
    console.log('========================================================================');
    console.log('🚗 Removing existing cars & inserting Double (61-65) and Single (66-90)');
    console.log('========================================================================');

    const sqlPath = path.resolve(__dirname, 'db', 'setup-cars-61-to-90.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8');

    await client.query(sqlScript);

    const carsRes = await client.query(`
      SELECT id, car_no, model_id, model, status
      FROM cars
      ORDER BY CAST(car_no AS INTEGER) ASC;
    `);

    console.log(`\n✅ Fleet updated (${carsRes.rowCount} cars total):`);
    console.table(carsRes.rows);
  } catch (err: any) {
    console.error('❌ Error updating cars:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupCars61To90();

