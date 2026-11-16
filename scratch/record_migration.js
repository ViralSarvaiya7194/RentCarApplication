require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  await pool.query(`
    INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
    VALUES ('009_allow_split_payment_method_in_rentals_constraint', 15, true)
    ON CONFLICT (migration_name) DO NOTHING;
  `);
  console.log('Migration 009 recorded successfully.');
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
