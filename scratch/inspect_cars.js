require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  const count = await pool.query("SELECT COUNT(*) FROM cars");
  console.log('Total cars:', count.rows[0].count);

  const statusCount = await pool.query("SELECT status, COUNT(*) FROM cars GROUP BY status");
  console.log('Cars by status:', statusCount.rows);

  const modelCount = await pool.query("SELECT model, COUNT(*) FROM cars GROUP BY model");
  console.log('Cars by model:', modelCount.rows);

  await pool.end();
}

main().catch(console.error);
