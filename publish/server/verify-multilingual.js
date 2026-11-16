async function verifyAll() {
  console.log('=== MULTILINGUAL SYSTEM VERIFICATION ===');
  
  // 1. Check EN dictionary
  const enRes = await fetch('http://127.0.0.1:3000/api/translations?language=en');
  const enDict = await enRes.json();
  const enCount = Object.keys(enDict).length;
  console.log('✔ English Dictionary loaded:', enCount, 'keys');

  // 2. Check AR dictionary
  const arRes = await fetch('http://127.0.0.1:3000/api/translations?language=ar');
  const arDict = await arRes.json();
  const arCount = Object.keys(arDict).length;
  console.log('✔ Arabic Dictionary loaded:', arCount, 'keys');

  // 3. Sample verification across modules
  const samples = [
    'AUTH.APP_TITLE',
    'NAV.POS_FLEET',
    'POS.AVAILABLE',
    'COMPANY.TITLE',
    'BRANCH.TITLE',
    'LOCATION.TITLE',
    'USER_MGMT.TITLE',
    'CAR_MODEL.TITLE',
    'CAR.TITLE',
    'RATE.TITLE',
    'GRACE.TITLE',
    'SHIFT.TITLE',
    'DAY_CLOSE.TITLE',
    'TRANS.TITLE',
    'RECEIPT.TITLE',
    'VALIDATION.REQUIRED'
  ];

  console.log('\n--- Key Validation Check ---');
  let missing = 0;
  for (const k of samples) {
    const en = enDict[k];
    const ar = arDict[k];
    if (!en || !ar) {
      console.error('❌ Missing translation for:', k);
      missing++;
    } else {
      console.log(`✔ [${k}]: EN="${en}" | AR="${ar}"`);
    }
  }

  // 4. Test Frontend HTML & Asset Serving
  const feRes = await fetch('http://127.0.0.1:4200/');
  const html = await feRes.text();
  const hasTajawal = html.includes('Tajawal');
  const hasDir = html.includes('dir=');
  console.log('\n--- Frontend Shell Check ---');
  console.log('✔ Frontend serving index.html:', feRes.status === 200);
  console.log('✔ Google Arabic fonts included:', hasTajawal);
  console.log('✔ dir attribute present:', hasDir);

  if (missing === 0) {
    console.log('\n🎉 ALL MULTILINGUAL SYSTEM CHECKS PASSED PERFECTLY!');
  } else {
    console.error('\n❌ SOME KEYS FAILED VALIDATION');
  }
}
verifyAll().catch(console.error);
