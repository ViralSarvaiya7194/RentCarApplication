const fs = require('fs');
const content = fs.readFileSync('src/app/pos.ts', 'utf8');
const lines = content.split(/\r?\n/);
console.log('Lines 98-106:');
for (let i = 97; i < 106; i++) {
  console.log(`${i+1}: ${JSON.stringify(lines[i])}`);
}
