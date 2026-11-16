require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function fixConstraint() {
  console.log('Dropping old constraint rentals_payment_method_check...');
  await pool.query(`ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_payment_method_check;`);

  console.log('Adding updated constraint allowing CASH, CARD, KNET, SPLIT...');
  await pool.query(`
    ALTER TABLE rentals ADD CONSTRAINT rentals_payment_method_check 
    CHECK (payment_method IN ('CASH', 'CARD', 'KNET', 'SPLIT'));
  `);

  console.log('Checking new constraint definition...');
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'rentals'::regclass AND conname = 'rentals_payment_method_check';
  `);
  console.log(res.rows);

  await pool.end();
}

fixConstraint().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
