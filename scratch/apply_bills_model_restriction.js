const fs = require('fs');
const path = require('path');

const billsPath = path.resolve(__dirname, '../src/app/bills.ts');
let content = fs.readFileSync(billsPath, 'utf8');

// 1. Add Vehicle Type Restriction Notice Banner before Section 2
const oldTransitionBanner = `            <!-- Transition Preview Banner -->
            <div *ngIf="selectedChangeTargetCar()" class="bg-indigo-50/90 border border-indigo-200 rounded-xl px-4 py-2 flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-2xs">
              <div class="flex items-center gap-2 font-bold text-slate-700 flex-wrap">
                <span class="text-slate-500 font-medium">Reassigning:</span>
                <span class="font-mono text-red-600 bg-red-100 px-2 py-0.5 rounded font-black">Car #{{ changeCarRental.car_no || changeCarRental.carNo }}</span>
                <span class="text-indigo-600 font-black">➔</span>
                <span class="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">Car #{{ selectedChangeTargetCar()?.carNo }} ({{ selectedChangeTargetCar()?.model }})</span>
              </div>
              <span *ngIf="selectedChangeTargetCar()?.color" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                <span class="w-2.5 h-2.5 rounded-full border border-black/20" [style.backgroundColor]="getCarColorCode(selectedChangeTargetCar()?.color)"></span>
                <span>{{ selectedChangeTargetCar()?.color }}</span>
              </span>
            </div>`;

const newTransitionBanner = `            <!-- Transition Preview Banner -->
            <div *ngIf="selectedChangeTargetCar()" class="bg-indigo-50/90 border border-indigo-200 rounded-xl px-4 py-2 flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-2xs">
              <div class="flex items-center gap-2 font-bold text-slate-700 flex-wrap">
                <span class="text-slate-500 font-medium">Reassigning:</span>
                <span class="font-mono text-red-600 bg-red-100 px-2 py-0.5 rounded font-black">Car #{{ changeCarRental.car_no || changeCarRental.carNo }}</span>
                <span class="text-indigo-600 font-black">➔</span>
                <span class="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">Car #{{ selectedChangeTargetCar()?.carNo }} ({{ selectedChangeTargetCar()?.model }})</span>
              </div>
              <span *ngIf="selectedChangeTargetCar()?.color" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                <span class="w-2.5 h-2.5 rounded-full border border-black/20" [style.backgroundColor]="getCarColorCode(selectedChangeTargetCar()?.color)"></span>
                <span>{{ selectedChangeTargetCar()?.color }}</span>
              </span>
            </div>

            <!-- Vehicle Type Restriction Notice Banner -->
            <div class="bg-indigo-50/90 border border-indigo-200 text-indigo-900 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div class="flex items-center gap-2">
                <span class="text-base shrink-0">🔒</span>
                <div>
                  <span class="font-bold">Vehicle Type Restriction:</span>
                  <span class="text-indigo-700 ml-1">
                    {{ isCurrentCarDouble() ? 'Double Seater cars can only be replaced with another Double Seater.' : 'Single Seater cars can only be replaced with another Single Seater.' }}
                  </span>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white shrink-0 tracking-wider">
                {{ isCurrentCarDouble() ? 'Double Only' : 'Single Only' }}
              </span>
            </div>`;

if (content.includes(oldTransitionBanner)) {
  content = content.replace(oldTransitionBanner, newTransitionBanner);
  console.log('1. Added Restriction Notice Banner');
} else {
  console.error('1. Could not find oldTransitionBanner');
}

// 2. Replace the filter tabs in Section 2 with locked indicator
const oldFilterTabs = `                <div class="flex items-center gap-1">
                  <button 
                    type="button" 
                    (click)="changeCarFilter.set('ALL')"
                    [class]="changeCarFilter() === 'ALL' ? 'px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md shadow-xs' : 'px-2.5 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100'">
                    All
                  </button>
                  <button 
                    type="button" 
                    (click)="changeCarFilter.set('SINGLE')"
                    [class]="changeCarFilter() === 'SINGLE' ? 'px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md shadow-xs' : 'px-2.5 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100'">
                    Single
                  </button>
                  <button 
                    type="button" 
                    (click)="changeCarFilter.set('DOUBLE')"
                    [class]="changeCarFilter() === 'DOUBLE' ? 'px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md shadow-xs' : 'px-2.5 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100'">
                    Double
                  </button>
                </div>`;

const newFilterTabs = `                <div class="flex items-center gap-1">
                  <span class="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-800 rounded-md border border-indigo-200 flex items-center gap-1 shadow-2xs">
                    <span>🔒</span>
                    <span>{{ isCurrentCarDouble() ? 'Double Seater Fleet' : 'Single Seater Fleet' }}</span>
                  </span>
                </div>`;

if (content.includes(oldFilterTabs)) {
  content = content.replace(oldFilterTabs, newFilterTabs);
  console.log('2. Replaced filter tabs with locked vehicle type indicator');
} else {
  console.error('2. Could not find oldFilterTabs');
}

// 3. Update empty state message to reflect vehicle type restriction
const oldEmptyState = `              <!-- Empty Available State -->
              <div *ngIf="availableCarsForChange().length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2.5">
                <span class="text-xl">⚠️</span>
                <div>
                  <p>No other replacement cars are currently available in the fleet.</p>
                  <p class="font-normal text-amber-700 text-[11px] mt-0.5">All fleet cars are either in active rentals or under maintenance.</p>
                </div>
              </div>`;

const newEmptyState = `              <!-- Empty Available State -->
              <div *ngIf="availableCarsForChange().length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2.5">
                <span class="text-xl">⚠️</span>
                <div>
                  <p>No other {{ isCurrentCarDouble() ? 'Double Seater' : 'Single Seater' }} replacement cars are currently available in the fleet.</p>
                  <p class="font-normal text-amber-700 text-[11px] mt-0.5">Changing car is restricted to the same vehicle type (Single ➔ Single, Double ➔ Double).</p>
                </div>
              </div>`;

if (content.includes(oldEmptyState)) {
  content = content.replace(oldEmptyState, newEmptyState);
  console.log('3. Updated empty state message');
} else {
  console.error('3. Could not find oldEmptyState');
}

// 4. Update availableCarsForChange to restrict to same model category and add isCurrentCarDouble()
const oldAvailableComputed = `  availableCarsForChange = computed(() => {
    const cur = this.changeCarRental;
    if (!cur) return [];
    const curCarNo = String(cur.car_no || cur.carNo || '');
    const curCarId = String(cur.car_id || cur.carId || '');
    return this.cars().filter(c => {
      const cId = String(c.id || c.car_id || '');
      const cNo = String(c.carNo || c.car_no || '');
      const isRented = c.status === 'Rented';
      return cId !== curCarId && cNo !== curCarNo && !isRented;
    }).sort((a, b) => {
      const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
    });
  });`;

const newAvailableComputed = `  isCurrentCarDouble(): boolean {
    const cur = this.changeCarRental;
    if (!cur) return false;
    return String(cur.model || '').toLowerCase().includes('double');
  }

  availableCarsForChange = computed(() => {
    const cur = this.changeCarRental;
    if (!cur) return [];
    const curCarNo = String(cur.car_no || cur.carNo || '');
    const curCarId = String(cur.car_id || cur.carId || '');
    const curIsDouble = String(cur.model || '').toLowerCase().includes('double');

    return this.cars().filter(c => {
      const cId = String(c.id || c.car_id || '');
      const cNo = String(c.carNo || c.car_no || '');
      const isRented = c.status === 'Rented';
      const cIsDouble = String(c.model || '').toLowerCase().includes('double');

      // Restrict single to single and double to double
      if (curIsDouble !== cIsDouble) {
        return false;
      }

      return cId !== curCarId && cNo !== curCarNo && !isRented;
    }).sort((a, b) => {
      const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
    });
  });`;

if (content.includes(oldAvailableComputed)) {
  content = content.replace(oldAvailableComputed, newAvailableComputed);
  console.log('4. Updated availableCarsForChange with strict vehicle type restriction and added isCurrentCarDouble');
} else {
  console.error('4. Could not find oldAvailableComputed');
}

// 5. Update confirmChangeCar with validation check
const oldConfirmTarget = `    const targetCarObj = this.cars().find(c => String(c.id) === String(newCarId));
    const targetCarNo = targetCarObj?.carNo || targetCarObj?.car_no || '';

    this.changeCarProcessing.set(true);`;

const newConfirmTarget = `    const targetCarObj = this.cars().find(c => String(c.id) === String(newCarId));
    const targetCarNo = targetCarObj?.carNo || targetCarObj?.car_no || '';

    // Model type restriction check (Single to Double & Double to Single prohibited)
    const curIsDouble = String(rental.model || '').toLowerCase().includes('double');
    const targetIsDouble = String(targetCarObj?.model || '').toLowerCase().includes('double');
    if (curIsDouble !== targetIsDouble) {
      alert(curIsDouble
        ? 'Vehicle Type Restricted: Cannot change a Double Seater car to a Single Seater. Please choose a Double Seater car.'
        : 'Vehicle Type Restricted: Cannot change a Single Seater car to a Double Seater. Please choose a Single Seater car.');
      return;
    }

    this.changeCarProcessing.set(true);`;

if (content.includes(oldConfirmTarget)) {
  content = content.replace(oldConfirmTarget, newConfirmTarget);
  console.log('5. Added model type restriction validation to confirmChangeCar');
} else {
  console.error('5. Could not find oldConfirmTarget');
}

fs.writeFileSync(billsPath, content, 'utf8');
console.log('Successfully updated bills.ts');
