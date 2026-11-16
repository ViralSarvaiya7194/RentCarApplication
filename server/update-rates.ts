import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Delete conflicting dummy rates
    await pool.query(
      "DELETE FROM rates WHERE id IN ('RAT-101', 'RAT-102', 'RAT-103', 'RAT-104', 'RAT-105', 'RAT-106')"
    );

    // Upsert Single Seater rate (1.000 KD, 60 mins)
    await pool.query(`
      INSERT INTO rates (id, model_id, model, duration, amount, status)
      VALUES ('RAT-001', 'MOD-101', 'Single Seater', 60, 1.000, 'ACTIVE')
      ON CONFLICT (id) DO UPDATE 
      SET model_id = 'MOD-101', model = 'Single Seater', duration = 60, amount = 1.000, status = 'ACTIVE'
    `);

    // Upsert Double Seater rate (2.000 KD, 60 mins)
    await pool.query(`
      INSERT INTO rates (id, model_id, model, duration, amount, status)
      VALUES ('RAT-004', 'MOD-102', 'Double Seater', 60, 2.000, 'ACTIVE')
      ON CONFLICT (id) DO UPDATE 
      SET model_id = 'MOD-102', model = 'Double Seater', duration = 60, amount = 2.000, status = 'ACTIVE'
    `);

    const res = await pool.query('SELECT * FROM rates ORDER BY id');
    console.log('✅ Current PostgreSQL Rates:');
    console.table(res.rows.map(r => ({
      id: r.id,
      model_id: r.model_id,
      model: r.model,
      duration: r.duration,
      amount: r.amount,
      status: r.status
    })));
  } catch (err) {
    console.error('Error updating rates:', err);
  } finally {
    await pool.end();
  }
}

run();
