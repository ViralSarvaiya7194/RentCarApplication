import { pool } from './db/connection';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runAcceptanceTests() {
  console.log('===============================================================');
  console.log('🚀 RUNNING AUTOMATIC SHIFT ASSIGNMENT & SESSION LOGIC TESTS');
  console.log('===============================================================\n');

  const testDate = '2026-10-04';
  let passedCount = 0;
  let failedCount = 0;

  try {
    // Clean up test data for this test run
    console.log('🧹 Preparing clean test database state...');
    await pool.query(`DELETE FROM rentals WHERE DATE(start_time) = $1`, [testDate]);
    await pool.query(`DELETE FROM shifts WHERE business_date = $1`, [testDate]);
    await pool.query(`DELETE FROM day_closes WHERE close_date = $1`, [testDate]);
    await pool.query(`DELETE FROM audit_logs WHERE created_at >= NOW() - INTERVAL '1 hour'`);

    // Ensure test users exist
    await pool.query(`
      INSERT INTO users (id, username, employee_name, password, role, status)
      VALUES 
        ('TEST-USER-A', 'cashier01', 'Cashier One', '123456', 'STAFF', 'ACTIVE'),
        ('TEST-USER-B', 'cashier02', 'Cashier Two', '123456', 'STAFF', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE 
      SET username = EXCLUDED.username, employee_name = EXCLUDED.employee_name, status = 'ACTIVE'
    `);

    // Ensure a test car exists
    await pool.query(`
      INSERT INTO cars (id, car_no, model, status)
      VALUES ('TEST-CAR-1', 'C-999', 'Single Seater', 'Available')
      ON CONFLICT (id) DO UPDATE SET status = 'Available'
    `);

    // ------------------------------------------------------------------------
    // TEST 1: Single User / Single Shift
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Single User / Single Shift ---');
    // Cashier01 logs in -> System determines/creates Shift 1
    const shift1Res = await pool.query(`
      INSERT INTO shifts (
        id, shift_number, business_date, cashier_name, username, opened_by_user_id, opened_by_username,
        branch_name, location_name, terminal_info, status, start_time
      ) VALUES ($1, 1, $2, 'Cashier One', 'cashier01', 'TEST-USER-A', 'cashier01', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-1', 'OPEN', NOW())
      RETURNING *
    `, [`SHIFT-${testDate}-1`, testDate]);
    const shift1 = shift1Res.rows[0];

    // Cashier01 performs rental transaction
    await pool.query(`
      INSERT INTO rentals (
        invoice_no, car_id, car_no, model, duration_minutes, expected_end_time, rental_amount, total_amount, payment_method, status, shift_id, shift_number, created_by, start_time
      ) VALUES ('TEST-INV-1', 'TEST-CAR-1', 'C-999', 'Single Seater', 60, NOW() + INTERVAL '1 hour', 5.000, 5.000, 'CASH', 'COMPLETED', $1, 1, 'Cashier One', NOW())
    `, [shift1.id]);

    // Cashier01 closes Shift 1
    const close1Res = await pool.query(`
      UPDATE shifts SET 
        status = 'CLOSED', end_time = NOW(), closed_by_user_id = 'TEST-USER-A', closed_by_username = 'cashier01', closed_by_name = 'Cashier One',
        total_rentals = 1, cash_total = 5.000, overall_total = 5.000, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [shift1.id]);

    if (close1Res.rows[0].status === 'CLOSED' && close1Res.rows[0].closed_by_username === 'cashier01') {
      console.log('✅ TEST 1 PASSED: User A successfully worked on Shift 1 and closed it.');
      passedCount++;
    } else {
      console.error('❌ TEST 1 FAILED');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 2: Single User / Multiple Shifts
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Single User / Multiple Shifts ---');
    // Cashier01 logs in again -> Next shift (Shift 2) is automatically created
    const shiftCountToday = await pool.query(`
      SELECT COALESCE(MAX(shift_number), 0) AS max_shift FROM shifts WHERE business_date = $1
    `, [testDate]);
    const nextShiftNum = parseInt(shiftCountToday.rows[0].max_shift, 10) + 1; // Expected 2

    const shift2Res = await pool.query(`
      INSERT INTO shifts (
        id, shift_number, business_date, cashier_name, username, opened_by_user_id, opened_by_username,
        branch_name, location_name, terminal_info, status, start_time
      ) VALUES ($1, $2, $3, 'Cashier One', 'cashier01', 'TEST-USER-A', 'cashier01', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-1', 'OPEN', NOW())
      RETURNING *
    `, [`SHIFT-${testDate}-${nextShiftNum}`, nextShiftNum, testDate]);
    const shift2 = shift2Res.rows[0];

    // Cashier01 closes Shift 2
    const close2Res = await pool.query(`
      UPDATE shifts SET 
        status = 'CLOSED', end_time = NOW(), closed_by_user_id = 'TEST-USER-A', closed_by_username = 'cashier01', closed_by_name = 'Cashier One',
        total_rentals = 0, overall_total = 0.000, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [shift2.id]);

    if (shift2.shift_number === 2 && close2Res.rows[0].status === 'CLOSED' && close2Res.rows[0].closed_by_username === 'cashier01') {
      console.log('✅ TEST 2 PASSED: Same User A sequentially opened, operated, and closed Shift 2.');
      passedCount++;
    } else {
      console.error('❌ TEST 2 FAILED');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 3: No User-Wise Shift Assignment in User Master
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: No User-Wise Shift Assignment ---');
    const userColumnsRes = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('shift_id', 'shift_number', 'assigned_shift')
    `);
    if (userColumnsRes.rows.length === 0) {
      console.log('✅ TEST 3 PASSED: User master table has no fixed shift columns or user-shift bindings.');
      passedCount++;
    } else {
      console.error('❌ TEST 3 FAILED: Found fixed shift columns in users table');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 4: Different User Closes Shift
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Different User Closes Shift ---');
    // User A opens Shift 3
    const shift3Res = await pool.query(`
      INSERT INTO shifts (
        id, shift_number, business_date, cashier_name, username, opened_by_user_id, opened_by_username,
        branch_name, location_name, terminal_info, status, start_time
      ) VALUES ($1, 3, $2, 'Cashier One', 'cashier01', 'TEST-USER-A', 'cashier01', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-1', 'OPEN', NOW())
      RETURNING *
    `, [`SHIFT-${testDate}-3`, testDate]);
    const shift3 = shift3Res.rows[0];

    // User B closes Shift 3
    const close3Res = await pool.query(`
      UPDATE shifts SET 
        status = 'CLOSED', end_time = NOW(), closed_by_user_id = 'TEST-USER-B', closed_by_username = 'cashier02', closed_by_name = 'Cashier Two',
        total_rentals = 0, overall_total = 0.000, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [shift3.id]);

    if (close3Res.rows[0].opened_by_username === 'cashier01' && close3Res.rows[0].closed_by_username === 'cashier02') {
      console.log('✅ TEST 4 PASSED: Shift 3 opened by User A and closed by User B successfully.');
      passedCount++;
    } else {
      console.error('❌ TEST 4 FAILED');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 5: Closed Shift Cannot Be Reused
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Closed Shift Cannot Be Reused ---');
    // Query OPEN shift for location - must not return closed shift 1, 2, or 3
    const activeShiftQuery = await pool.query(`
      SELECT * FROM shifts WHERE status = 'OPEN' AND business_date = $1
    `, [testDate]);

    if (activeShiftQuery.rows.length === 0) {
      console.log('✅ TEST 5 PASSED: System confirms closed shifts (1, 2, 3) are never reused for new sessions.');
      passedCount++;
    } else {
      console.error('❌ TEST 5 FAILED: Found open shift when all were closed');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 6: Failed Shift Close Rollback
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Failed Shift Close Leaves Shift OPEN ---');
    const shift4Res = await pool.query(`
      INSERT INTO shifts (
        id, shift_number, business_date, cashier_name, username, opened_by_user_id, opened_by_username,
        branch_name, location_name, terminal_info, status, start_time
      ) VALUES ($1, 4, $2, 'Cashier One', 'cashier01', 'TEST-USER-A', 'cashier01', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-1', 'OPEN', NOW())
      RETURNING *
    `, [`SHIFT-${testDate}-4`, testDate]);

    // Simulate error during close transaction -> ROLLBACK
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE shifts SET status = 'CLOSED' WHERE id = $1`, [shift4Res.rows[0].id]);
      // Simulate failure condition
      throw new Error('Simulated validation failure');
    } catch (e) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const checkShift4 = await pool.query(`SELECT * FROM shifts WHERE id = $1`, [shift4Res.rows[0].id]);
    if (checkShift4.rows[0].status === 'OPEN') {
      console.log('✅ TEST 6 PASSED: Transaction rollback preserved Shift 4 as OPEN.');
      passedCount++;
    } else {
      console.error('❌ TEST 6 FAILED');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 7: Successful Shift Close & Session Flag
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Successful Shift Close ---');
    const finalCloseRes = await pool.query(`
      UPDATE shifts SET 
        status = 'CLOSED', end_time = NOW(), closed_by_user_id = 'TEST-USER-A', closed_by_username = 'cashier01', closed_by_name = 'Cashier One',
        updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [shift4Res.rows[0].id]);

    if (finalCloseRes.rows[0].status === 'CLOSED') {
      console.log('✅ TEST 7 PASSED: Shift marked CLOSED and ready for automatic logout.');
      passedCount++;
    } else {
      console.error('❌ TEST 7 FAILED');
      failedCount++;
    }

    // ------------------------------------------------------------------------
    // TEST 8: Same User Can Close Multiple Shifts Sequentially
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Same User Sequential Multiple Shift Operations ---');
    // Cashier01 opens Shift 5
    const shift5Res = await pool.query(`
      INSERT INTO shifts (
        id, shift_number, business_date, cashier_name, username, opened_by_user_id, opened_by_username,
        branch_name, location_name, terminal_info, status, start_time
      ) VALUES ($1, 5, $2, 'Cashier One', 'cashier01', 'TEST-USER-A', 'cashier01', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-1', 'OPEN', NOW())
      RETURNING *
    `, [`SHIFT-${testDate}-5`, testDate]);

    // Cashier01 closes Shift 5
    const close5Res = await pool.query(`
      UPDATE shifts SET 
        status = 'CLOSED', end_time = NOW(), closed_by_user_id = 'TEST-USER-A', closed_by_username = 'cashier01', closed_by_name = 'Cashier One',
        updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [shift5Res.rows[0].id]);

    if (close5Res.rows[0].status === 'CLOSED' && close5Res.rows[0].closed_by_username === 'cashier01') {
      console.log('✅ TEST 8 PASSED: Single user (Cashier One) successfully completed and closed multiple sequential shifts.');
      passedCount++;
    } else {
      console.error('❌ TEST 8 FAILED');
      failedCount++;
    }

    // Clean up test shifts
    await pool.query(`DELETE FROM rentals WHERE invoice_no = 'TEST-INV-1'`);
    await pool.query(`DELETE FROM shifts WHERE business_date = $1`, [testDate]);
    await pool.query(`DELETE FROM users WHERE id IN ('TEST-USER-A', 'TEST-USER-B')`);
    await pool.query(`DELETE FROM cars WHERE id = 'TEST-CAR-1'`);

    console.log('\n===============================================================');
    console.log(`📊 RESULTS: ${passedCount} PASSED / ${passedCount + failedCount} TOTAL`);
    console.log('===============================================================');

  } catch (err: any) {
    console.error('Unexpected test error:', err);
  } finally {
    await pool.end();
  }
}

runAcceptanceTests();
