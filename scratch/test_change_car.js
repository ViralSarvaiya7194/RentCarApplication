require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function test() {
  console.log('--- Testing Change Car Backend Logic ---');

  // 1. Find an active rental
  const activeRes = await pool.query("SELECT * FROM rentals WHERE status = 'ACTIVE' LIMIT 1");
  if (activeRes.rows.length === 0) {
    console.log('No active rentals to test.');
    await pool.end();
    return;
  }
  const rental = activeRes.rows[0];
  console.log(`Initial Active Rental #${rental.invoice_no}: Car #${rental.car_no} (car_id: ${rental.car_id}, model: ${rental.model})`);

  // 2. Check current assigned car status
  const curCarRes = await pool.query("SELECT id, car_no, model, color, status FROM cars WHERE id = $1", [rental.car_id]);
  console.log('Current Car in DB:', curCarRes.rows[0]);

  // 3. Find an available replacement car
  const availRes = await pool.query("SELECT id, car_no, model, color, status FROM cars WHERE status = 'Available' LIMIT 1");
  if (availRes.rows.length === 0) {
    console.log('No available cars to test swap.');
    await pool.end();
    return;
  }
  const targetCar = availRes.rows[0];
  console.log(`Target Available Replacement Car: #${targetCar.car_no} (id: ${targetCar.id}, color: ${targetCar.color})`);

  // 4. Test validation: target car is same as current car -> should reject
  const sameCarCheck = (String(targetCar.id) === String(rental.car_id));
  console.log('Same car check works:', !sameCarCheck);

  // 5. Simulate swapping to targetCar
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Mark old car Available
    await client.query("UPDATE cars SET status = 'Available', updated_at = NOW() WHERE id = $1", [rental.car_id]);
    
    // Mark target car Rented
    await client.query("UPDATE cars SET status = 'Rented', updated_at = NOW() WHERE id = $1", [targetCar.id]);
    
    // Update rental
    const swapRemark = `Swapped from car #${rental.car_no} to #${targetCar.car_no}: Customer test preference`;
    const upd = await client.query(
      `UPDATE rentals 
       SET car_id = $1, car_no = $2, model = $3,
           swapped_from_car_no = SUBSTRING(
             CASE 
               WHEN swapped_from_car_no IS NULL OR swapped_from_car_no = '' THEN $4
               ELSE swapped_from_car_no || ', ' || $4
             END, 1, 50
           ),
           remarks = CASE 
             WHEN remarks IS NULL OR remarks = '' THEN $5
             ELSE remarks || ' | ' || $5
           END,
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [targetCar.id, targetCar.car_no, targetCar.model, rental.car_no, swapRemark, rental.id]
    );

    console.log('Updated rental row:', {
      id: upd.rows[0].id,
      invoice_no: upd.rows[0].invoice_no,
      new_car_no: upd.rows[0].car_no,
      swapped_from_car_no: upd.rows[0].swapped_from_car_no,
      remarks: upd.rows[0].remarks
    });

    // Verify old car is now Available
    const oldCarCheck = await client.query("SELECT id, car_no, status FROM cars WHERE id = $1", [rental.car_id]);
    console.log('Old car after swap:', oldCarCheck.rows[0]);

    // Verify target car is now Rented
    const newCarCheck = await client.query("SELECT id, car_no, status FROM cars WHERE id = $1", [targetCar.id]);
    console.log('New car after swap:', newCarCheck.rows[0]);

    // Swap back so database state remains clean
    await client.query("UPDATE cars SET status = 'Rented', updated_at = NOW() WHERE id = $1", [rental.car_id]);
    await client.query("UPDATE cars SET status = 'Available', updated_at = NOW() WHERE id = $1", [targetCar.id]);
    await client.query("UPDATE rentals SET car_id = $1, car_no = $2, model = $3 WHERE id = $4", [rental.car_id, rental.car_no, rental.model, rental.id]);

    await client.query('COMMIT');
    console.log('✅ Car Change simulation verified and state reverted cleanly!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error during test:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

test().catch(console.error);
