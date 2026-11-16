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
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rentals' AND column_name LIKE '%swap%'");
  console.log('Swap columns in rentals:', r.rows);
  await pool.end();
}

main().catch(console.error);
