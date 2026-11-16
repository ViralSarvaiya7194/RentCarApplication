const fs = require('fs');
const content = fs.readFileSync('src/app/pos.ts', 'utf8');
const lines = content.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('isCarSwapModalOpen()')) {
    console.log('isCarSwapModalOpen at line ' + (i+1));
    for (let j = i; j < Math.min(lines.length, i + 90); j++) {
      if (lines[j].includes('<!-- Receipt Modal') || lines[j].includes('export class PosComponent')) {
        console.log('End at line ' + (j+1));
        break;
      }
      console.log(`  ${j+1}: ${lines[j]}`);
    }
  }
}
