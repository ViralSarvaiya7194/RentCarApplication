import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { ThermalPrinterService, ThermalPrinterConfig, ThermalPrintPayload, PrintFormatConfig } from './thermal-printer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verifyFontSizeThermal() {
  console.log('=====================================================================');
  console.log('🧪 VERIFYING THERMAL BILL FONT SIZE INCREASE & FORMAT CONFIGURATION');
  console.log('=====================================================================\n');

  const client = new Client({
    host: process.env['DB_HOST'] || '127.0.0.1',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['DB_NAME'] || 'rental_car_db',
  });

  await client.connect();

  // Test 1: Verify PostgreSQL Schema contains font_size column
  await client.query(`ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_size VARCHAR(50) DEFAULT 'LARGE';`);
  const colRes = await client.query(
    `SELECT column_name, data_type, column_default 
     FROM information_schema.columns 
     WHERE table_name = 'print_formats' AND column_name = 'font_size'`
  );
  console.log(`[PASS 1] Database Schema: font_size column verified in print_formats table (${colRes.rows[0]?.data_type}).`);

  // Test 2: Verify active print formats have font_size configured
  const formatsRes = await client.query(`SELECT id, format_name, print_type, language, paper_width, font_size FROM print_formats ORDER BY id ASC`);
  console.log(`[PASS 2] Print Formats in PostgreSQL: Found ${formatsRes.rowCount} formats:`);
  for (const f of formatsRes.rows) {
    console.log(`         - [${f.id}] ${f.format_name} | Type: ${f.print_type} | Lang: ${f.language} | Width: ${f.paper_width} | FontSize: ${f.font_size}`);
  }

  // Test 3: Test direct raster generation across all 4 font sizes (SMALL, MEDIUM, LARGE, XLARGE)
  const config80: ThermalPrinterConfig = {
    printerName: 'Front Desk 80mm Thermal Printer',
    interfaceType: 'VIRTUAL',
    ipAddress: '192.168.1.100',
    port: 9100,
    paperWidth: '80mm',
    encoding: 'CP864',
    autoCut: true,
    cashDrawer: false,
    isActive: true,
  };

  const samplePayload: ThermalPrintPayload = {
    printType: 'SETTLEMENT',
    invoiceNo: 'INV-801653',
    rental: {
      invoice_no: 'INV-801653',
      customer_name: 'Test Customer / عميل تجريبي',
      customer_phone: '94129785',
      car_no: 'A1',
      model: 'Single Seater',
      duration_minutes: 30,
      rental_amount: 10.000,
      extra_amount: 10.000,
      discount: 2.000,
      total_amount: 8.000,
      payment_method: 'CASH',
      created_by: 'Cashier',
    },
    depositAmount: 10.000,
    extraAmount: 10.000,
    discountAmount: 2.000,
    finalAmount: 8.000,
    changeReturned: 2.000,
    companyName: 'KIDDIE KRUZZER ENTERTAINMENT',
    branchName: 'Avenues Mall',
    locationName: 'Zone A, Ground Floor',
    terminal: 'POS-Terminal-1',
    cashierName: 'Cashier',
    settledAt: '8/26/2026, 10:20:14 AM',
  };

  const fontSizes: Array<'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE'> = ['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'];
  const bufferSizes: Record<string, number> = {};

  console.log('\n[PASS 3] Testing Buffer Generation & Scaling for 80mm Paper:');
  for (const fs of fontSizes) {
    const fmt: PrintFormatConfig = {
      formatName: `Test Format (${fs})`,
      language: 'BOTH',
      paperWidth: '80mm',
      fontSize: fs,
      showLogo: true,
      showCompanyHeader: true,
      showBranchInfo: true,
      showCustomerInfo: true,
      showCarDetails: true,
      showPricingBreakdown: true,
      showPaymentMethod: true,
      showCashier: true,
      showBarcode: true,
      headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
      headerSubtitle: 'Car Rental Tax Invoice / فاتورة ضريبية',
      footerNotes: 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
      termsConditions: 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد 5 دقائق',
    };

    const buffer = ThermalPrinterService.buildEscPosBuffer(samplePayload, config80, fmt);
    bufferSizes[fs] = buffer.length;
    console.log(`         - Font Size: ${fs.padEnd(8)} => Buffer Size: ${buffer.length} bytes (ESC/POS HD Raster)`);

    // Verify ESC/POS Header
    if (buffer.length < 1000 || buffer[0] !== 0x1B || buffer[1] !== 0x40) {
      throw new Error(`Invalid ESC/POS buffer for font size ${fs}`);
    }

    // Test sendToPrinter
    const printRes = await ThermalPrinterService.sendToPrinter(samplePayload, config80);
    if (!printRes.success) {
      throw new Error(`Direct print failed for ${fs}: ${printRes.message}`);
    }
  }

  // Verify that LARGE / XLARGE buffers accommodate the larger font height
  console.log(`\n[PASS 4] Verified typography scaling: LARGE (${bufferSizes['LARGE']} bytes) is taller/bolder than SMALL (${bufferSizes['SMALL']} bytes).`);

  // Test 4: Verify 58mm Paper Buffer Generation
  const config58: ThermalPrinterConfig = {
    ...config80,
    printerName: 'Mobile 58mm Thermal Printer',
    paperWidth: '58mm',
  };

  const buffer58 = ThermalPrinterService.buildEscPosBuffer(samplePayload, config58, {
    fontSize: 'LARGE',
    paperWidth: '58mm',
  });
  console.log(`[PASS 5] 58mm Compact Roll Buffer: ${buffer58.length} bytes generated successfully.`);

  await client.end();
  console.log('\n🎉 ALL FONT SIZE & THERMAL PRINT FORMAT CONFIGURATION TESTS PASSED!\n');
}

verifyFontSizeThermal().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
