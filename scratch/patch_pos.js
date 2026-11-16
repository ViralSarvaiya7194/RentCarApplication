const fs = require('fs');

let content = fs.readFileSync('src/app/pos.ts', 'utf8');

// 1. Single seater card top row
const singleSeaterOld = `<div class="w-full flex items-center justify-between leading-none">
                         <span class="text-[13px] font-black font-mono tracking-tight" [ngClass]="!isCarRented(car) ? 'text-slate-800' : 'text-red-700'">
                           #{{ car.carNo }}
                         </span>`;

const singleSeaterNew = `<div class="w-full flex items-center justify-between leading-none">
                         <div class="flex items-center gap-1 min-w-0">
                           <span class="text-[13px] font-black font-mono tracking-tight" [ngClass]="!isCarRented(car) ? 'text-slate-800' : 'text-red-700'">
                             #{{ car.carNo }}
                           </span>
                           <span *ngIf="car.color" class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(car.color)" [title]="car.color"></span>
                         </div>`;

if (content.includes(singleSeaterOld)) {
  content = content.replace(singleSeaterOld, singleSeaterNew);
  console.log('Patched single seater top row');
} else {
  console.log('WARNING: Could not find single seater top row');
}

// 2. Single seater change car button
const singleSeaterBtnOld = `<button 
                                type="button" 
                                (click)="openCarSwapModal(car, $event)" 
                                title="Change Car"
                                class="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-bold rounded flex items-center gap-0.5 cursor-pointer shadow-2xs transition">
                                <span>🔄</span>
                                <span>{{ 'POS.CHANGE_CAR' | translate }}</span>
                              </button>`;

const singleSeaterBtnNew = `<button 
                                type="button" 
                                (click)="openCarSwapModal(car, $event)" 
                                title="Change Car"
                                class="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[8.5px] font-extrabold rounded flex items-center gap-1 cursor-pointer shadow-xs transition hover:scale-105 active:scale-95 shrink-0">
                                <span class="text-[9px]">🔄</span>
                                <span>{{ 'POS.CHANGE_CAR' | translate }}</span>
                              </button>`;

if (content.includes(singleSeaterBtnOld)) {
  content = content.replace(singleSeaterBtnOld, singleSeaterBtnNew);
  console.log('Patched single seater button');
} else {
  console.log('WARNING: Could not find single seater button');
}

// 3. Double seater card top row (now second occurrence)
if (content.includes(singleSeaterOld)) {
  content = content.replace(singleSeaterOld, singleSeaterNew);
  console.log('Patched double seater top row');
} else {
  console.log('WARNING: Could not find double seater top row');
}

// 4. Double seater change car button (now second occurrence)
if (content.includes(singleSeaterBtnOld)) {
  content = content.replace(singleSeaterBtnOld, singleSeaterBtnNew);
  console.log('Patched double seater button');
} else {
  console.log('WARNING: Could not find double seater button');
}

// 5. Start rental modal car display
const startModalCarOld = `<div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">{{ 'POS.CAR_NO' | translate }}</label>
                    <input type="text" [value]="selectedCar()?.carNo + ' (' + selectedCar()?.model + ')'" readonly class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono font-bold">
                  </div>`;

const startModalCarNew = `<div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">{{ 'POS.CAR_NO' | translate }}</label>
                    <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                      <span *ngIf="selectedCar()?.color" class="w-3 h-3 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(selectedCar()?.color)"></span>
                      <span class="text-xs font-mono font-bold text-slate-800">#{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }} <span *ngIf="selectedCar()?.color">({{ selectedCar()?.color }})</span></span>
                      <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Available</span>
                    </div>
                  </div>`;

if (content.includes(startModalCarOld)) {
  content = content.replace(startModalCarOld, startModalCarNew);
  console.log('Patched start modal car display');
} else {
  console.log('WARNING: Could not find start modal car display');
}

// 6. Close rental modal header car display
const closeHeaderOld = `<h2 class="text-sm font-bold uppercase tracking-wider">
                        {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                      </h2>
                      <p class="text-[11px] text-white/80 font-mono">{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }}</p>`;

const closeHeaderNew = `<h2 class="text-sm font-bold uppercase tracking-wider">
                        {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                      </h2>
                      <p class="text-[11px] text-white/90 font-mono flex items-center gap-1.5 mt-0.5">
                        <span *ngIf="selectedCar()?.color" class="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" [style.backgroundColor]="getCarColorCode(selectedCar()?.color)"></span>
                        <span>Car #{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }} <span *ngIf="selectedCar()?.color">({{ selectedCar()?.color }})</span></span>
                        <span class="bg-red-800/80 px-1.5 py-0.5 rounded text-[9px] font-bold">Rented</span>
                      </p>`;

if (content.includes(closeHeaderOld)) {
  content = content.replace(closeHeaderOld, closeHeaderNew);
  console.log('Patched close rental modal header');
} else {
  console.log('WARNING: Could not find close rental modal header');
}

fs.writeFileSync('src/app/pos.ts', content, 'utf8');
console.log('pos.ts step 1 patch applied successfully.');
