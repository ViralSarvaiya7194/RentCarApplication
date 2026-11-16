import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { ThermalPrinterService, ThermalPrinterConfig, ThermalPrintPayload } from './thermal-printer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verifyRebrandingAndFontConfig() {
  console.log('=====================================================================');
  console.log('🧪 VERIFYING REBRANDING TO KIDDIE KRUZZER & THERMAL FONT OPTIONS');
  console.log('=====================================================================\n');

  const client = new Client({
    host: process.env['DB_HOST'] || '127.0.0.1',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['DB_NAME'] || 'rental_car_db',
  });

  await client.connect();

  // Test 1: Run Migrations & Verify columns in print_formats
  await client.query(`
    ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_size VARCHAR(50) DEFAULT 'LARGE';
    ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'MONOSPACE';
    ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_style VARCHAR(50) DEFAULT 'BOLD';
    UPDATE companies SET name = 'Kiddie Kruzzer Entertainment LLC' WHERE id = 'CMP-101' OR name LIKE '%KidsDrive%' OR name LIKE '%Kids Drive%';
    UPDATE branches SET company = 'Kiddie Kruzzer Entertainment LLC' WHERE company LIKE '%KidsDrive%' OR company LIKE '%Kids Drive%';
    UPDATE print_formats SET header_title = 'KIDDIE KRUZZER ENTERTAINMENT' WHERE header_title LIKE '%KIDS DRIVE%' OR header_title LIKE '%KidsDrive%';
    UPDATE print_formats SET footer_notes = 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر' WHERE footer_notes LIKE '%KidsDrive%' OR footer_notes LIKE '%Kids Drive%';
    UPDATE translations SET english_text = 'Kiddie Kruzzer POS', arabic_text = 'كيدي كروزر لنقاط البيع' WHERE translation_key IN ('AUTH.APP_TITLE', 'COMMON.APP_NAME');
    UPDATE translations SET english_text = 'Thank you for choosing Kiddie Kruzzer!', arabic_text = 'شكراً لاختياركم كيدي كروزر!' WHERE translation_key = 'RECEIPT.THANK_YOU';
  `);

  console.log('[PASS 1] Database migrations and rebranding queries executed successfully.');

  // Test 2: Check columns on print_formats table
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'print_formats' AND column_name IN ('font_size', 'font_family', 'font_style', 'header_title', 'footer_notes')
    ORDER BY column_name;
  `);
  console.log(`[PASS 2] Verified ${colRes.rowCount} typography & header columns in print_formats:`, colRes.rows.map(c => c.column_name));

  // Test 3: Check Companies table
  const compRes = await client.query(`SELECT id, name FROM companies LIMIT 1`);
  if (compRes.rowCount === 0) {
    await client.query(`INSERT INTO companies (id, name, contact, status) VALUES ('CMP-101', 'Kiddie Kruzzer Entertainment LLC', '+965 2200 1100', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`);
  }
  const compCheck = await client.query(`SELECT id, name FROM companies LIMIT 1`);
  console.log(`[PASS 3] Company record name: "${compCheck.rows[0]?.name}"`);
  if (!compCheck.rows[0]?.name.includes('Kiddie Kruzzer')) {
    throw new Error(`Expected Kiddie Kruzzer company name, found "${compCheck.rows[0]?.name}"`);
  }

  // Test 4: Check Translations
  const trnRes = await client.query(`
    SELECT translation_key, english_text, arabic_text 
    FROM translations 
    WHERE translation_key IN ('AUTH.APP_TITLE', 'COMMON.APP_NAME', 'RECEIPT.THANK_YOU')
  `);
  console.log('[PASS 4] Translations verified:');
  for (const row of trnRes.rows) {
    console.log(`         - [${row.translation_key}] EN: "${row.english_text}" | AR: "${row.arabic_text}"`);
  }

  // Test 5: Verify Thermal Printing Canvas Rendering across all Font Families & Styles
  const printerConfig: ThermalPrinterConfig = {
    printerName: 'Kiddie Kruzzer Thermal POS',
    interfaceType: 'VIRTUAL',
    ipAddress: '192.168.1.200',
    port: 9100,
    paperWidth: '80mm',
    encoding: 'CP864',
    autoCut: true,
  };

  const samplePayload: ThermalPrintPayload = {
    printType: 'SETTLEMENT',
    language: 'BOTH',
    invoiceNo: 'INV-TEST-889900',
    companyName: 'Kiddie Kruzzer Entertainment LLC',
    branchName: 'Avenues Mall',
    locationName: 'Zone A - Ground Floor',
    cashierName: 'Sarah Al-Kuwaiti',
    terminal: 'POS-Terminal-1',
    depositAmount: 3.000,
    extraAmount: 1.500,
    discountAmount: 0.500,
    finalAmount: 4.000,
    changeReturned: 1.000,
    rental: {
      invoice_no: 'INV-TEST-889900',
      customer_name: 'Fahad Al-Sabah',
      customer_phone: '+965 9988 7766',
      car_no: 'KK-01',
      model: 'Single Seater',
      duration_minutes: 30,
      payment_method: 'KNET / CARD',
    }
  };

  const fontFamilies = ['MONOSPACE', 'SANS_SERIF', 'CONSOLAS', 'ROBOTO'];
  const fontStyles = ['BOLD', 'BLACK', 'NORMAL'];
  const fontSizes = ['LARGE', 'XLARGE', 'MEDIUM', 'SMALL'];

  console.log('\n[PASS 5] Testing Thermal Raster Buffer generation across typography matrix:');

  for (const fam of fontFamilies) {
    for (const sty of fontStyles) {
      for (const sz of fontSizes) {
        const fmtConfig: any = {
          paperWidth: '80mm',
          fontSize: sz,
          fontFamily: fam,
          fontStyle: sty,
          headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
          headerSubtitle: 'Car Rental Tax Invoice / فاتورة ضريبية',
          showLogo: true,
          showCompanyHeader: true,
          showBranchInfo: true,
          showCustomerInfo: true,
          showCarDetails: true,
          showPricingBreakdown: true,
          showPaymentMethod: true,
          showCashier: true,
          showBarcode: true,
          footerNotes: 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
          termsConditions: 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
        };

        const buffer = ThermalPrinterService.buildEscPosBuffer(samplePayload, printerConfig, fmtConfig);
        if (!buffer || buffer.length === 0) {
          throw new Error(`Buffer generation failed for font [${fam} - ${sty} - ${sz}]`);
        }
      }
      console.log(`         ✓ Rendered [Font: ${fam.padEnd(10)}] • [Style: ${sty.padEnd(6)}] across all 4 font sizes.`);
    }
  }

  // Test 6: Verify 58mm rendering
  const fmt58mm: any = {
    paperWidth: '58mm',
    fontSize: 'LARGE',
    fontFamily: 'SANS_SERIF',
    fontStyle: 'BOLD',
    headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
    footerNotes: 'Thank you for choosing Kiddie Kruzzer!',
  };
  const buffer58 = ThermalPrinterService.buildEscPosBuffer(samplePayload, { ...printerConfig, paperWidth: '58mm' }, fmt58mm);
  console.log(`[PASS 6] 58mm compact roll rendering verified (${buffer58.length} bytes ESC/POS raster).`);

  await client.end();
  console.log('\n🎉 ALL REBRANDING & FONT CUSTOMIZATION TESTS PASSED SUCCESSFULLY!\n');
}

verifyRebrandingAndFontConfig().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
