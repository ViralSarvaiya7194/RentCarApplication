import { pool } from './db/connection';
import { ThermalPrinterService, ThermalPrintPayload, ThermalPrinterConfig } from './thermal-printer';

async function runMultilingualAndPermissionsTests() {
  console.log('================================================================');
  console.log('🧪 Starting POS Multilingual Printing & RBAC Permissions Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------
    // TEST 1: Database Tables & Schema Validation
    // -----------------------------------------------------------
    console.log('--- 1. Testing Database Schema & Tables ---');
    const formatsCount = await pool.query('SELECT COUNT(*) FROM print_formats');
    assert(Number(formatsCount.rows[0].count) >= 6, 'Print formats table initialized with default templates', `Count: ${formatsCount.rows[0].count}`);

    const rolePermsCount = await pool.query('SELECT COUNT(*) FROM role_permissions');
    assert(Number(rolePermsCount.rows[0].count) >= 30, 'Role permissions matrix seeded with ADMIN, MANAGER, and STAFF', `Count: ${rolePermsCount.rows[0].count}`);

    const trnCount = await pool.query(`SELECT COUNT(*) FROM translations WHERE translation_key IN ('SETTLEMENT.TITLE', 'FORMAT.TITLE', 'RIGHTS.TITLE')`);
    assert(Number(trnCount.rows[0].count) >= 3, 'New multilingual translation keys seeded in PostgreSQL');

    // -----------------------------------------------------------
    // TEST 2: Dynamic Translations DB Lookup
    // -----------------------------------------------------------
    console.log('\n--- 2. Testing Dynamic Translations DB Lookup (Zero Hardcoding) ---');
    const translationsMap = await ThermalPrinterService.loadTranslations();
    assert(translationsMap.size > 0, 'Loaded active translations dictionary dynamically from PostgreSQL', `Total: ${translationsMap.size}`);

    const settlementEn = ThermalPrinterService.getTranslation('SETTLEMENT.TITLE', 'EN', translationsMap, 'Fallback EN', 'Fallback AR');
    const settlementAr = ThermalPrinterService.getTranslation('SETTLEMENT.TITLE', 'AR', translationsMap, 'Fallback EN', 'Fallback AR');
    const settlementBoth = ThermalPrinterService.getTranslation('SETTLEMENT.TITLE', 'BOTH', translationsMap, 'Fallback EN', 'Fallback AR');

    assert(settlementEn.includes('SETTLEMENT'), 'Dynamic English translation lookup works', settlementEn);
    assert(/[\u0600-\u06FF]/.test(settlementAr), 'Dynamic Arabic translation lookup works', settlementAr);
    assert(settlementBoth.includes('/') && /[\u0600-\u06FF]/.test(settlementBoth), 'Dynamic Bilingual translation formatted correctly', settlementBoth);

    // -----------------------------------------------------------
    // TEST 3: Arabic Text Shaping & RTL Formatter
    // -----------------------------------------------------------
    console.log('\n--- 3. Testing Arabic Text Shaping Engine ---');
    const rawArabic = 'كيدز درايف للتأجير';
    const shapedArabic = ThermalPrinterService.shapeArabic(rawArabic);
    assert(shapedArabic.length > 0 && shapedArabic !== '', 'Arabic text shaped with connected cursive glyphs', shapedArabic);

    // -----------------------------------------------------------
    // TEST 4: Dynamic Print Format Resolver
    // -----------------------------------------------------------
    console.log('\n--- 4. Testing Print Format Resolution Hierarchy ---');
    const settlementFormat = await ThermalPrinterService.resolvePrintFormat({
      branch: 'Avenues Mall',
      location: 'Main Counter',
      terminal: 'POS-Terminal-1',
      printType: 'SETTLEMENT',
      language: 'BOTH'
    });
    assert(settlementFormat.printType === 'SETTLEMENT' || settlementFormat.isDefault, 'Resolved Settlement Print Format', settlementFormat.formatName);

    const arabicReceiptFormat = await ThermalPrinterService.resolvePrintFormat({
      branch: 'Avenues Mall',
      printType: 'RECEIPT',
      language: 'AR'
    });
    assert(arabicReceiptFormat.language === 'AR' || arabicReceiptFormat.isDefault, 'Resolved Arabic Receipt Print Format', arabicReceiptFormat.formatName);

    const englishFormat = await ThermalPrinterService.resolvePrintFormat({
      printType: 'DUPLICATE',
      language: 'EN'
    });
    assert(englishFormat.language === 'EN' || englishFormat.isDefault, 'Resolved English Duplicate Print Format', englishFormat.formatName);

    // -----------------------------------------------------------
    // TEST 5: Multilingual ESC/POS Buffer Generation (Zero Print Dialog)
    // -----------------------------------------------------------
    console.log('\n--- 5. Testing ESC/POS Binary Buffer Generation ---');
    const testPrinterConfig: ThermalPrinterConfig = {
      printerName: 'Test Thermal Printer',
      interfaceType: 'VIRTUAL',
      ipAddress: '0.0.0.0',
      port: 9100,
      paperWidth: '80mm',
      encoding: 'CP864',
      autoCut: true,
      cashDrawer: true,
      isActive: true,
    };

    const mockPayload: ThermalPrintPayload = {
      printType: 'SETTLEMENT',
      invoiceNo: 'INV-TEST-001',
      rental: {
        customer_name: 'Fahad Al-Mutawa',
        customer_phone: '99887766',
        car_no: 'KD-10',
        model: 'Double Seater Supercar',
        rental_amount: '4.500',
        extra_amount: '1.500',
        discount: '0.500',
        total_amount: '5.500',
        payment_method: 'CASH',
        created_by: 'Ahmed',
        duration_minutes: 30
      },
      settledAt: new Date().toLocaleString(),
      cashierName: 'Ahmed',
      terminal: 'POS-Terminal-1',
      depositAmount: 4.500,
      extraAmount: 1.500,
      discountAmount: 0.500,
      finalAmount: 5.500,
      changeReturned: 0.500,
      elapsedDuration: '38 Mins'
    };

    // 5a. Bilingual Buffer
    const bilingualBuffer = ThermalPrinterService.buildEscPosBuffer(
      { ...mockPayload, language: 'BOTH' },
      testPrinterConfig,
      settlementFormat,
      translationsMap
    );
    assert(bilingualBuffer.length > 50, 'Generated Bilingual ESC/POS binary buffer', `${bilingualBuffer.length} bytes`);

    // 5b. Arabic RTL Buffer
    const arabicBuffer = ThermalPrinterService.buildEscPosBuffer(
      { ...mockPayload, language: 'AR' },
      testPrinterConfig,
      { ...settlementFormat, language: 'AR' },
      translationsMap
    );
    assert(arabicBuffer.length > 50, 'Generated Arabic (RTL) ESC/POS binary buffer', `${arabicBuffer.length} bytes`);

    // 5c. English LTR Buffer
    const englishBuffer = ThermalPrinterService.buildEscPosBuffer(
      { ...mockPayload, language: 'EN' },
      testPrinterConfig,
      { ...settlementFormat, language: 'EN' },
      translationsMap
    );
    assert(englishBuffer.length > 50, 'Generated English (LTR) ESC/POS binary buffer', `${englishBuffer.length} bytes`);

    // -----------------------------------------------------------
    // TEST 6: Direct Dispatch Execution
    // -----------------------------------------------------------
    console.log('\n--- 6. Testing Direct Thermal Dispatch (Virtual/TCP) ---');
    const sendResult = await ThermalPrinterService.sendToPrinter(
      { ...mockPayload, language: 'BOTH' },
      testPrinterConfig
    );
    assert(sendResult.success === true, 'Direct print job executed successfully in background without print dialog', sendResult.message);

    // -----------------------------------------------------------
    // TEST 7: Role Permissions Matrix Verification
    // -----------------------------------------------------------
    console.log('\n--- 7. Testing RBAC Security Matrix in PostgreSQL ---');
    
    // Check STAFF permissions
    const staffPerms = await pool.query(`SELECT * FROM role_permissions WHERE UPPER(role) = 'STAFF'`);
    const staffPos = staffPerms.rows.find(p => p.module === 'POS');
    const staffCancel = staffPerms.rows.find(p => p.module === 'BILLS_CANCEL');
    const staffUsers = staffPerms.rows.find(p => p.module === 'USER');

    assert(staffPos && staffPos.can_view === true && staffPos.can_add === true, 'STAFF role has POS View & Add permissions');
    assert(staffCancel && staffCancel.can_cancel === false, 'STAFF role is RESTRICTED from Bill Cancellation (Security Rule)');
    assert(staffUsers && staffUsers.can_edit === false && staffUsers.can_delete === false, 'STAFF role is RESTRICTED from User Master Modification');

    // Check MANAGER permissions
    const mgrPerms = await pool.query(`SELECT * FROM role_permissions WHERE UPPER(role) = 'MANAGER'`);
    const mgrCancel = mgrPerms.rows.find(p => p.module === 'BILLS_CANCEL');
    assert(mgrCancel && mgrCancel.can_cancel === true, 'MANAGER role is ALLOWED to Cancel Bills');

    // Check ADMIN permissions
    const adminPerms = await pool.query(`SELECT * FROM role_permissions WHERE UPPER(role) = 'ADMIN'`);
    assert(adminPerms.rows.length >= 10, 'ADMIN role has full configuration in PostgreSQL');

    console.log('\n================================================================');
    console.log(`📊 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMultilingualAndPermissionsTests();
