const fs = require('fs');
const content = fs.readFileSync('src/app/pos.ts', 'utf8');
const lines = content.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('openCarSwapModal(car, $event)')) {
    console.log('openCarSwapModal around line ' + (i+1));
    for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 6); j++) {
      console.log(`  ${j+1}: ${JSON.stringify(lines[j])}`);
    }
  }
  if (lines[i].includes('POS.CLOSE_RENTAL_TITLE')) {
    console.log('POS.CLOSE_RENTAL_TITLE around line ' + (i+1));
    for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 6); j++) {
      console.log(`  ${j+1}: ${JSON.stringify(lines[j])}`);
    }
  }
}
