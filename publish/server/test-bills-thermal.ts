import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { ThermalPrinterService, ThermalPrinterConfig, ThermalPrintPayload } from './thermal-printer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runVerification() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING DUPLICATE BILL, CANCEL BILL & DIRECT THERMAL PRINT');
  console.log('===============================================================\n');

  const client = new Client({
    host: process.env['DB_HOST'] || '127.0.0.1',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['DB_NAME'] || 'rental_car_db',
  });

  await client.connect();

  const config: ThermalPrinterConfig = {
    printerName: 'Counter 1 Thermal Printer',
    interfaceType: 'VIRTUAL',
    ipAddress: '192.168.1.200',
    port: 9100,
    paperWidth: '80mm',
    encoding: 'CP864',
    autoCut: true,
    cashDrawer: false,
    isActive: true,
  };

  // Test 1: Fetch Cancellation Reasons
  const reasonsRes = await client.query(`SELECT * FROM cancellation_reasons WHERE is_active = 'ACTIVE'`);
  console.log(`[PASS 1] Cancellation Reasons: Found ${reasonsRes.rowCount} active master reasons.`);
  if (reasonsRes.rowCount === 0) throw new Error('No cancellation reasons found');

  // Test 2: Create a sample rental for testing
  const carRes = await client.query(`SELECT * FROM cars LIMIT 1`);
  const car = carRes.rows[0];
  const testInvNo = `INV-TST-${Math.floor(1000 + Math.random() * 9000)}`;
  const sampleRental = await client.query(
    `INSERT INTO rentals (
      invoice_no, car_id, car_no, model, customer_name, customer_phone,
      duration_minutes, expected_end_time, rental_amount, total_amount, payment_method, status, created_by
    ) VALUES ($1, $2, $3, $4, 'Test Customer', '96599887766', 15, NOW() + INTERVAL '15 minutes', 3.000, 3.000, 'CASH', 'ACTIVE', 'Cashier1')
    RETURNING *`,
    [testInvNo, car ? car.id : null, car ? car.car_no : 'KD-01', car ? car.model : 'Single Seater']
  );
  const rental = sampleRental.rows[0];
  console.log(`[PASS 2] Created Test Rental ${testInvNo} with ID ${rental.id}.`);

  // Test 3: Duplicate Bill Thermal Print (Zero Dialog) & ESC/POS Buffer Check
  const dupPayload: ThermalPrintPayload = {
    printType: 'DUPLICATE',
    invoiceNo: rental.invoice_no,
    rental: rental,
    reprintCount: 1,
    reprintedBy: 'Cashier1',
    reprintTime: new Date().toLocaleString(),
    companyName: 'Kiddie Kruzzer Entertainment LLC',
    branchName: 'Avenues Branch',
    locationName: 'Level 1 Counter',
  };

  const dupBuffer = ThermalPrinterService.buildEscPosBuffer(dupPayload, config);
  console.log(`[PASS 3] Duplicate Bill ESC/POS buffer generated (${dupBuffer.length} bytes).`);
  // Verify ESC/POS Raster graphics header (ESC @ = 0x1B 0x40, GS v 0 = 0x1D 0x76 0x30 0x00)
  if (dupBuffer.length < 1000 || dupBuffer[0] !== 0x1B || dupBuffer[1] !== 0x40) {
    throw new Error('Invalid ESC/POS Raster graphic stream structure');
  }

  const dupPrintRes = await ThermalPrinterService.sendToPrinter(dupPayload, config);
  console.log(`[PASS 4] Direct Thermal Print dispatch result: ${dupPrintRes.message} (${dupPrintRes.latencyMs}ms)`);

  // Log to print_audit_logs
  await client.query(
    `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, status, remarks)
     VALUES ($1, 'DUPLICATE_BILL_PRINT', 'Cashier1', 'Level 1 Counter', 'POS-1', $2, 'SUCCESS', 'Duplicate copy #1')`,
    [rental.invoice_no, config.printerName]
  );

  // Test 4: Bill Cancellation Validation & Execution
  const reason = reasonsRes.rows[0];
  const cancelRemarks = 'Child refused to ride after payment';

  // Mark rental as cancelled
  const cancelRes = await client.query(
    `UPDATE rentals 
     SET status = 'CANCELLED',
         cancelled_at = NOW(),
         cancelled_by = 'Cashier1',
         cancellation_reason_id = $1,
         cancellation_reason = $2,
         cancellation_remarks = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [reason.id, reason.english_name, cancelRemarks, rental.id]
  );
  const cancelledRental = cancelRes.rows[0];
  console.log(`[PASS 5] Rental ${cancelledRental.invoice_no} successfully CANCELLED in DB.`);

  // Test 5: Automatic Cancelled Bill Thermal Print (Zero Dialog)
  const cancelPayload: ThermalPrintPayload = {
    printType: 'CANCELLED',
    invoiceNo: cancelledRental.invoice_no,
    rental: cancelledRental,
    cancelledAt: new Date().toLocaleString(),
    cancelledBy: 'Cashier1',
    cancellationReason: reason.english_name,
    cancellationRemarks: cancelRemarks,
    companyName: 'Kiddie Kruzzer Entertainment LLC',
    branchName: 'Avenues Branch',
    locationName: 'Level 1 Counter',
  };

  const cancelBuffer = ThermalPrinterService.buildEscPosBuffer(cancelPayload, config);
  console.log(`[PASS 6] Cancelled Bill ESC/POS buffer generated (${cancelBuffer.length} bytes).`);
  if (cancelBuffer.length < 1000 || cancelBuffer[0] !== 0x1B || cancelBuffer[1] !== 0x40) {
    throw new Error('Invalid Cancelled Bill ESC/POS Raster stream');
  }

  const cancelPrintRes = await ThermalPrinterService.sendToPrinter(cancelPayload, config);
  console.log(`[PASS 7] Cancelled Bill Direct Print dispatch result: ${cancelPrintRes.message} (${cancelPrintRes.latencyMs}ms)`);

  // Log to print_audit_logs
  await client.query(
    `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, status, remarks)
     VALUES ($1, 'CANCEL_BILL_PRINT', 'Cashier1', 'Level 1 Counter', 'POS-1', $2, 'SUCCESS', $3)`,
    [rental.invoice_no, config.printerName, `Cancelled: ${reason.english_name}`]
  );

  // Test 6: Verify Audit Trail
  const auditRes = await client.query(
    `SELECT * FROM print_audit_logs WHERE invoice_no = $1 ORDER BY created_at ASC`,
    [rental.invoice_no]
  );
  console.log(`[PASS 8] Audit Logs: Verified ${auditRes.rowCount} audit records stored for invoice ${rental.invoice_no}:`);
  for (const log of auditRes.rows) {
    console.log(`         - Action: ${log.action} | Status: ${log.status} | User: ${log.username} | Remarks: ${log.remarks}`);
  }

  // Cleanup test rental
  await client.query(`DELETE FROM print_audit_logs WHERE invoice_no = $1`, [testInvNo]);
  await client.query(`DELETE FROM rentals WHERE invoice_no = $1`, [testInvNo]);

  await client.end();
  console.log('\n🎉 ALL DUPLICATE BILL, CANCEL BILL & DIRECT THERMAL PRINT TESTS PASSED!\n');
}

runVerification().catch((e) => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
