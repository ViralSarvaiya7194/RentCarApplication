const fs = require('fs');
const path = require('path');

const posPath = path.resolve(__dirname, '../src/app/pos.ts');
let content = fs.readFileSync(posPath, 'utf8');

// 1. Remove top header Change Car button
const topBtnRegex = /\s*<button \(click\)="openCarSwapModal\(\)"[\s\S]*?<\/button>/;
if (topBtnRegex.test(content)) {
  content = content.replace(topBtnRegex, '');
  console.log('1. Removed top header Change Car button');
} else {
  console.error('1. Could not match top header button');
}

// 2. Remove Change Car button from single seater card
const singleCardRegex = /<div class="w-full flex items-center justify-between gap-1">\s*<span class="text-\[8\.5px\] font-bold text-red-600 uppercase tracking-wide">\s*\{\{ 'POS\.RENTED' \| translate \}\}\s*<\/span>\s*<button[\s\S]*?openCarSwapModal\(car, \$event\)[\s\S]*?<\/button>\s*<\/div>/;
if (singleCardRegex.test(content)) {
  content = content.replace(singleCardRegex, `<span class="text-[8.5px] font-bold text-red-600 uppercase tracking-wide">\n                                {{ 'POS.RENTED' | translate }}\n                              </span>`);
  console.log('2. Removed Change Car button from single seater card');
} else {
  console.error('2. Could not match single seater card button');
}

// 3. Remove Change Car button from double seater card
if (singleCardRegex.test(content)) {
  content = content.replace(singleCardRegex, `<span class="text-[8.5px] font-bold text-red-600 uppercase tracking-wide">\n                                {{ 'POS.RENTED' | translate }}\n                              </span>`);
  console.log('3. Removed Change Car button from double seater card');
} else {
  console.error('3. Could not match double seater card button');
}

// 4. Remove Change Car button from settlement modal header
const headerBtnRegex = /\s*<button \s*type="button" \s*\(click\)="openCarSwapModal\(selectedCar\(\), \$event\)"[\s\S]*?<\/button>/;
if (headerBtnRegex.test(content)) {
  content = content.replace(headerBtnRegex, '');
  console.log('4. Removed Change Car button from settlement modal header');
} else {
  console.error('4. Could not match settlement header button');
}

// 5. Remove Change Car button from settlement modal footer
const footerBtnRegex = /\s*<button type="button" \(click\)="openCarSwapModal\(selectedCar\(\), \$event\)"[\s\S]*?<\/button>/;
if (footerBtnRegex.test(content)) {
  content = content.replace(footerBtnRegex, '');
  console.log('5. Removed Change Car button from settlement modal footer');
} else {
  console.error('5. Could not match settlement footer button');
}

// Also revert settlement footer flex gap to gap-3
content = content.replace('flex gap-2.5 shrink-0', 'flex gap-3 shrink-0');

// 6. Remove Car Swap Modal markup
const modalRegex = /\s*<!-- Car Swap Modal Popup \(Requirement 8 - Change Car Option\) -->[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<\/div>\s*`\s*\n\}\))/;
if (modalRegex.test(content)) {
  content = content.replace(modalRegex, '\n');
  console.log('6. Removed Car Swap Modal template');
} else {
  console.error('6. Could not match modal template');
}

// 7. Remove Car Swap signals
const signalsRegex = /\s*\/\/ Car Swap State \(Requirement 8 - Change Car Option\)[\s\S]*?swapModelFilter = signal<string>\('ALL'\); \/\/ ALL, SINGLE, DOUBLE\s*/;
if (signalsRegex.test(content)) {
  content = content.replace(signalsRegex, '\n\n  ');
  console.log('7. Removed Car Swap state signals');
} else {
  console.error('7. Could not match state signals');
}

// 8. Remove Car Swap computeds and helpers (selectedTargetCar, availableCarsForSwap, filteredReplacementCars, selectReplacementCar, onSwitchRentedCarSelection)
const computedsRegex = /\s*selectedTargetCar = computed\(\(\) => \{[\s\S]*?onSwitchRentedCarSelection\(carId: string\) \{[\s\S]*?\}\s*\}\s*/;
if (computedsRegex.test(content)) {
  content = content.replace(computedsRegex, '\n\n  ');
  console.log('8. Removed Car Swap computeds and selection helpers');
} else {
  console.error('8. Could not match computeds and helpers');
}

// 9. Remove openCarSwapModal, closeCarSwapModal, confirmCarSwap
const methodsRegex = /\s*\/\*\*[\s\S]*?Car Swap Implementation \(Requirement 8\)[\s\S]*?confirmCarSwap\(\) \{[\s\S]*?alert\(`Error changing car: \$\{msg\}`\);\s*\}\s*\}\);\s*\}\s*/;
if (methodsRegex.test(content)) {
  content = content.replace(methodsRegex, '\n\n  ');
  console.log('9. Removed Car Swap methods');
} else {
  console.error('9. Could not match Car Swap methods');
}

fs.writeFileSync(posPath, content, 'utf8');
console.log('Successfully updated pos.ts');
