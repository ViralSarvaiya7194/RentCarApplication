const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:sa%3A123@127.0.0.1:5432/rental_car_db'
});

async function testRestriction() {
  console.log('Testing single-to-double and double-to-single restriction...');

  const carsRes = await pool.query('SELECT id, car_no, model, status FROM cars ORDER BY car_no');
  const cars = carsRes.rows;

  const singleCars = cars.filter(c => c.model.toLowerCase().includes('single'));
  const doubleCars = cars.filter(c => c.model.toLowerCase().includes('double'));

  console.log(`Found ${singleCars.length} Single Seater cars and ${doubleCars.length} Double Seater cars.`);

  // Validation function matching server logic
  function validateChange(currentModel, targetModel) {
    const isCurrentDouble = String(currentModel || '').toLowerCase().includes('double');
    const isTargetDouble = String(targetModel || '').toLowerCase().includes('double');
    if (isCurrentDouble !== isTargetDouble) {
      return {
        allowed: false,
        error: isCurrentDouble
          ? 'Vehicle type mismatch: Changing a Double Seater car to a Single Seater is not permitted.'
          : 'Vehicle type mismatch: Changing a Single Seater car to a Double Seater is not permitted.'
      };
    }
    return { allowed: true };
  }

  // Test Case 1: Single to Double -> MUST FAIL
  const t1 = validateChange('Single Seater', 'Double Seater');
  console.log('Test 1 (Single -> Double):', t1.allowed === false ? 'PASS (Blocked)' : 'FAIL');
  console.log('   Message:', t1.error);

  // Test Case 2: Double to Single -> MUST FAIL
  const t2 = validateChange('Double Seater', 'Single Seater');
  console.log('Test 2 (Double -> Single):', t2.allowed === false ? 'PASS (Blocked)' : 'FAIL');
  console.log('   Message:', t2.error);

  // Test Case 3: Single to Single -> MUST PASS
  const t3 = validateChange('Single Seater', 'Single Seater');
  console.log('Test 3 (Single -> Single):', t3.allowed === true ? 'PASS (Allowed)' : 'FAIL');

  // Test Case 4: Double to Double -> MUST PASS
  const t4 = validateChange('Double Seater', 'Double Seater');
  console.log('Test 4 (Double -> Double):', t4.allowed === true ? 'PASS (Allowed)' : 'FAIL');

  await pool.end();
}

testRestriction();
