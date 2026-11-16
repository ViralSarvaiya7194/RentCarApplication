require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function check() {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'rentals'::regclass;
  `);
  console.log('Rentals Constraints:');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
