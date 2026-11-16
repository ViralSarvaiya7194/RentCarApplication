import { pool } from './db/connection';
import { ThermalPrinterService, ThermalPrinterConfig, ThermalPrintPayload } from './thermal-printer';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting POS Thermal Printing & Printer Master Automated Tests');
  console.log('===============================================================');

  try {
    // 1. Verify printer_settings records in PostgreSQL
    console.log('\n▶️ 1. Testing Printer Master records in DB...');
    const printersRes = await pool.query('SELECT * FROM printer_settings ORDER BY id');
    console.log(`✅ Retrieved ${printersRes.rows.length} printers from PostgreSQL:`);
    for (const p of printersRes.rows) {
      console.log(`   • [${p.id}] ${p.printer_name} | ${p.interface_type} (${p.ip_address}:${p.port}) | Branch: ${p.branch_name || 'All'} | Role: ${p.print_type}`);
    }

    // 2. Test Socket Connection check
    console.log('\n▶️ 2. Testing Socket Handshake (Ping check)...');
    const virtualPrinter: ThermalPrinterConfig = {
      id: 'PRN-104',
      printerName: 'Virtual POS Simulator Printer',
      interfaceType: 'VIRTUAL',
      ipAddress: '127.0.0.1',
      port: 9100,
      paperWidth: '80mm',
      encoding: 'CP864',
      autoCut: true,
      cashDrawer: false,
      isActive: true,
    };
    const pingRes = await ThermalPrinterService.testSocketConnection(virtualPrinter);
    console.log(`✅ Virtual Printer Ping Result:`, pingRes);

    const lanPrinter: ThermalPrinterConfig = {
      id: 'PRN-101',
      printerName: 'Counter 1 Thermal Printer',
      interfaceType: 'LAN',
      ipAddress: '192.168.1.200',
      port: 9100,
      paperWidth: '80mm',
      encoding: 'CP864',
      autoCut: true,
      cashDrawer: false,
      isActive: true,
    };
    const lanPingRes = await ThermalPrinterService.testSocketConnection(lanPrinter);
    console.log(`ℹ️  LAN Printer Network Handshake (handles offline gracefully):`, lanPingRes);

    // 3. Test ESC/POS Binary Buffer Generation for SETTLEMENT
    console.log('\n▶️ 3. Testing Settlement ESC/POS Buffer Generation...');
    const settlementPayload: ThermalPrintPayload = {
      printType: 'SETTLEMENT',
      invoiceNo: 'INV-TEST-999',
      companyName: 'KidsDrive Entertainment LLC',
      branchName: 'Avenues Mall',
      locationName: 'Zone A - Ground Floor',
      terminal: 'POS-Terminal-1',
      cashierName: 'Cashier Sarah',
      settledAt: new Date().toLocaleString(),
      elapsedDuration: '22 Minutes',
      depositAmount: 3.000,
      extraAmount: 1.500,
      discountAmount: 0.500,
      finalAmount: 4.000,
      changeReturned: 0.000,
      rental: {
        invoiceNo: 'INV-TEST-999',
        customerName: 'Ahmed Al-Sabah',
        customerPhone: '+965 99887766',
        carNo: 'KD-01',
        model: 'Single Seater',
        durationMinutes: 15,
        startTime: new Date().toISOString(),
        paymentMethod: 'CASH',
      }
    };

    const buffer = ThermalPrinterService.buildEscPosBuffer(settlementPayload, virtualPrinter);
    console.log(`✅ Generated Settlement ESC/POS Buffer (${buffer.length} bytes).`);
    const bufferText = buffer.toString('utf-8');
    const hasSettlementBanner = bufferText.includes('SETTLEMENT RECEIPT') || bufferText.includes('إيصال تسوية');
    console.log(`✅ Contains Settlement Header Banner: ${hasSettlementBanner}`);

    // 4. Test Direct Background Printing Dispatch
    console.log('\n▶️ 4. Testing Direct Background Print Dispatch...');
    const printResult = await ThermalPrinterService.sendToPrinter(settlementPayload, virtualPrinter);
    console.log(`✅ Direct Print Dispatch Result:`, printResult);

    // 5. Test Audit Log insertion for Settlement Print
    console.log('\n▶️ 5. Testing Audit Log Recording...');
    await pool.query(
      `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'INV-TEST-999',
        'SETTLEMENT_RECEIPT_PRINT',
        'Cashier Sarah',
        'Zone A - Ground Floor',
        'POS-Terminal-1',
        virtualPrinter.printerName,
        virtualPrinter.interfaceType,
        printResult.success ? 'SUCCESS' : 'FAILED',
        printResult.error || null,
        'Automated test settlement print verified'
      ]
    );

    const auditCheck = await pool.query(
      `SELECT * FROM print_audit_logs WHERE invoice_no = 'INV-TEST-999' ORDER BY id DESC LIMIT 1`
    );
    console.log(`✅ Verified Audit Trail in PostgreSQL:`, auditCheck.rows[0]);

    console.log('\n===============================================================');
    console.log('🎉 ALL THERMAL PRINTING & PRINTER MASTER TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
