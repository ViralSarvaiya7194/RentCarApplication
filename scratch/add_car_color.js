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
  await pool.query("ALTER TABLE cars ADD COLUMN IF NOT EXISTS color VARCHAR(50);");
  console.log('Added color column to cars table.');

  // Check existing cars
  const carsRes = await pool.query("SELECT id, car_no, model, color, status FROM cars ORDER BY id");
  console.log('Current cars count:', carsRes.rows.length);

  // If colors are null, assign nice clean colors (Red, Blue, Yellow, White, Black, Green, Orange, Silver, Pink)
  const palette = ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black', 'Orange', 'Silver', 'Purple', 'Pink'];
  for (let i = 0; i < carsRes.rows.length; i++) {
    const c = carsRes.rows[i];
    if (!c.color) {
      const assignedColor = palette[i % palette.length];
      await pool.query("UPDATE cars SET color = $1 WHERE id = $2", [assignedColor, c.id]);
    }
  }

  const updatedCars = await pool.query("SELECT id, car_no, model, color, status FROM cars LIMIT 10");
  console.log('Sample updated cars with color:', updatedCars.rows);

  await pool.end();
}

main().catch(console.error);
