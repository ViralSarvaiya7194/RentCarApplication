require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function inspect() {
  const cars = await pool.query(`SELECT id, car_no, model, status FROM cars WHERE model ILIKE '%double%' LIMIT 5;`);
  console.log('Double cars:', cars.rows);

  const rates = await pool.query(`SELECT id, model_id, model, duration, amount, status FROM rates;`);
  console.log('Rates:', rates.rows);

  const recentRentals = await pool.query(`SELECT id, invoice_no, car_no, model, payment_method, status, created_at FROM rentals ORDER BY id DESC LIMIT 5;`);
  console.log('Recent rentals:', recentRentals.rows);

  await pool.end();
}

inspect().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
