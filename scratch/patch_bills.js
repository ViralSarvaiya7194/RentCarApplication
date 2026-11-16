const fs = require('fs');

let content = fs.readFileSync('src/app/bills.ts', 'utf8');

// 1. Vehicle column
const oldVehicle = `                <!-- Vehicle -->
                <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">
                  {{ item.car_no || item.carNo }} <span class="text-slate-400 font-normal">({{ item.model }})</span>
                </td>`;

const newVehicle = `                <!-- Vehicle -->
                <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span>#{{ item.car_no || item.carNo }}</span>
                    <span class="text-slate-400 font-normal">({{ item.model }})</span>
                    <span *ngIf="item.color || getCarColor(item.car_no || item.carNo)" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
                      <span class="w-2 h-2 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(item.color || getCarColor(item.car_no || item.carNo))"></span>
                      <span>{{ item.color || getCarColor(item.car_no || item.carNo) }}</span>
                    </span>
                  </div>
                  <div *ngIf="item.swapped_from_car_no" class="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                    <span>🔄</span>
                    <span>Changed from #{{ item.swapped_from_car_no }}</span>
                  </div>
                </td>`;

if (content.includes(oldVehicle)) {
  content = content.replace(oldVehicle, newVehicle);
  console.log('Successfully updated Vehicle column in bills.ts');
} else {
  console.log('ERROR: Could not find oldVehicle');
}

// 2. Actions column: Add Change Car button
const oldActionsStart = `                    <!-- Cancel Bill Button -->
                    <button 
                      *ngIf="item.status !== 'CANCELLED' && perm.can('BILLS_CANCEL', 'CANCEL')"`;

const newActionsStart = `                    <!-- Change Car Button (For Active Rentals) -->
                    <button 
                      *ngIf="item.status === 'ACTIVE'"
                      (click)="openChangeCarModal(item)" 
                      class="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      [title]="'POS.CHANGE_CAR' | translate">
                      <span class="text-xs">🔄</span>
                      <span>{{ 'POS.CHANGE_CAR' | translate }}</span>
                    </button>

                    <!-- Cancel Bill Button -->
                    <button 
                      *ngIf="item.status !== 'CANCELLED' && perm.can('BILLS_CANCEL', 'CANCEL')"`;

if (content.includes(oldActionsStart)) {
  content = content.replace(oldActionsStart, newActionsStart);
  console.log('Successfully added Change Car action button in bills.ts');
} else {
  console.log('ERROR: Could not find oldActionsStart');
}

// 3. Add Change Car modal before final closing </div>
const oldModalEndMarker = `      <!-- ======================================================== -->
      <!-- MODAL 4: AUDIT LOG VIEWER MODAL                          -->
      <!-- ======================================================== -->`;

const changeCarModalTemplate = `      <!-- ======================================================== -->
      <!-- MODAL 5: CHANGE CAR MODAL (Bills Screen)                 -->
      <!-- ======================================================== -->
      <div *ngIf="isChangeCarModalOpen && changeCarRental" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[92vh]">
          
          <!-- Modal Header -->
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg shadow-inner">
                🔄
              </div>
              <div>
                <h3 class="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <span>{{ 'POS.CHANGE_CAR_TITLE' | translate }}</span>
                  <span class="bg-indigo-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                    Active Rental
                  </span>
                </h3>
                <p class="text-xs text-indigo-100 font-medium">Reassign car assignment for Invoice #{{ changeCarRental.invoice_no || changeCarRental.invoiceNo }}</p>
              </div>
            </div>
            <button type="button" (click)="closeChangeCarModal()" class="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
            
            <!-- SECTION 1: Currently Assigned Car Display -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>{{ 'POS.CURRENT_CAR' | translate }}</span>
                </label>
                <span class="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                  Invoice #{{ changeCarRental.invoice_no || changeCarRental.invoiceNo }}
                </span>
              </div>

              <div class="bg-white border-2 border-red-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-2xs">
                    <span class="text-[9px] uppercase font-bold text-red-400 leading-none">Car</span>
                    <span class="text-lg leading-tight font-black">#{{ changeCarRental.car_no || changeCarRental.carNo }}</span>
                  </div>
                  
                  <div class="space-y-0.5">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-bold text-slate-800">{{ changeCarRental.model }}</span>
                      
                      <!-- Colour Badge -->
                      <span *ngIf="getCarColor(changeCarRental.car_no || changeCarRental.carNo)" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <span class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(getCarColor(changeCarRental.car_no || changeCarRental.carNo))"></span>
                        <span>{{ getCarColor(changeCarRental.car_no || changeCarRental.carNo) }}</span>
                      </span>

                      <!-- Status Badge -->
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        <span>{{ 'POS.RENTED' | translate }} (In Use)</span>
                      </span>
                    </div>

                    <!-- Customer & Duration -->
                    <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                      <span class="flex items-center gap-1">
                        <span>👤</span>
                        <span class="font-medium text-slate-700">{{ changeCarRental.customer_name || changeCarRental.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
                      </span>
                      <span>•</span>
                      <span class="font-mono text-slate-600">
                        Started: {{ (changeCarRental.start_time || changeCarRental.startTime) | date:'HH:mm:ss' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Transition Preview Banner -->
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

            <!-- SECTION 2: List of Available Replacement Cars -->
            <div class="space-y-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <label class="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{{ 'POS.AVAILABLE_CARS' | translate }}</span>
                  </label>
                  <span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    {{ filteredChangeCars().length }} {{ 'POS.READY' | translate }}
                  </span>
                </div>

                <div class="flex items-center gap-1">
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
                </div>
              </div>

              <!-- Search Bar -->
              <div class="relative">
                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  [(ngModel)]="changeCarSearch"
                  placeholder="Search available replacement cars by number, model, or colour..."
                  class="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs">
              </div>

              <!-- Empty Available State -->
              <div *ngIf="availableCarsForChange().length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2.5">
                <span class="text-xl">⚠️</span>
                <div>
                  <p>No other replacement cars are currently available in the fleet.</p>
                  <p class="font-normal text-amber-700 text-[11px] mt-0.5">All fleet cars are either in active rentals or under maintenance.</p>
                </div>
              </div>

              <!-- Available Cars Interactive Cards Grid -->
              <div *ngIf="filteredChangeCars().length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1">
                <div 
                  *ngFor="let c of filteredChangeCars()" 
                  (click)="changeCarTargetId.set(c.id)"
                  class="p-2.5 rounded-xl border-2 transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 shadow-2xs select-none hover:shadow-sm"
                  [ngClass]="changeCarTargetId() === c.id 
                    ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-300 shadow-md scale-[1.01]' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'">
                  
                  <div class="flex items-start justify-between gap-1 leading-none">
                    <div>
                      <span class="text-sm font-black font-mono tracking-tight text-slate-800">
                        #{{ c.carNo || c.car_no }}
                      </span>
                      <span class="text-[10px] font-bold text-slate-500 block mt-0.5">
                        {{ c.model }}
                      </span>
                    </div>

                    <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition"
                         [ngClass]="changeCarTargetId() === c.id ? 'bg-indigo-600 text-white shadow-xs' : 'border border-slate-300 text-transparent'">
                      ✓
                    </div>
                  </div>

                  <div class="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                    <div class="flex items-center gap-1 font-semibold text-slate-600 truncate">
                      <span *ngIf="c.color" class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(c.color)"></span>
                      <span class="truncate">{{ c.color || 'Standard' }}</span>
                    </div>

                    <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                      {{ 'POS.READY' | translate }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Quick Dropdown Alternative -->
              <div class="pt-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Or select by dropdown:</label>
                <select 
                  [ngModel]="changeCarTargetId()" 
                  (ngModelChange)="changeCarTargetId.set($event)"
                  class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs">
                  <option value="">-- Choose New Available Car --</option>
                  <option *ngFor="let c of availableCarsForChange()" [value]="c.id">
                    Car #{{ c.carNo || c.car_no }} • {{ c.model }} {{ c.color ? ' • ' + c.color : '' }} (Available)
                  </option>
                </select>
              </div>
            </div>

            <!-- SECTION 3: Reason -->
            <div class="space-y-1.5 bg-slate-100/70 p-3 rounded-xl border border-slate-200">
              <label class="text-[10px] font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                <span>{{ 'POS.CHANGE_REASON' | translate }} (Optional)</span>
                <span class="text-slate-400 font-normal">Logged into audit trail</span>
              </label>
              <input 
                type="text" 
                [(ngModel)]="changeCarReason" 
                placeholder="e.g. Customer preferred blue color, child wanted another car, low battery..." 
                class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs" />
            </div>

          </div>

          <!-- Modal Action Buttons: Cancel and Confirm -->
          <div class="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
            <button 
              type="button" 
              (click)="closeChangeCarModal()" 
              class="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            
            <button 
              type="button"
              (click)="confirmChangeCar()" 
              [disabled]="!changeCarTargetId() || changeCarProcessing() || availableCarsForChange().length === 0" 
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md transition">
              <span *ngIf="changeCarProcessing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span *ngIf="!changeCarProcessing()">🔄</span>
              <span>{{ 'POS.CONFIRM_CAR_CHANGE' | translate }}</span>
            </button>
          </div>

        </div>
      </div>

` + oldModalEndMarker;

if (content.includes(oldModalEndMarker)) {
  content = content.replace(oldModalEndMarker, changeCarModalTemplate);
  console.log('Successfully added Change Car modal template to bills.ts');
} else {
  console.log('ERROR: Could not find oldModalEndMarker');
}

// 4. Update BillsComponent class properties and methods
const oldPropsMarker = `  rentals = signal<any[]>([]);
  cancellationReasons = signal<any[]>([]);
  auditLogs = signal<any[]>([]);
  loading = signal(false);`;

const newPropsContent = `  rentals = signal<any[]>([]);
  cars = signal<any[]>([]);
  cancellationReasons = signal<any[]>([]);
  auditLogs = signal<any[]>([]);
  loading = signal(false);

  // Change Car State
  isChangeCarModalOpen = false;
  changeCarRental: any = null;
  changeCarTargetId = signal<string>('');
  changeCarReason = '';
  changeCarProcessing = signal(false);
  changeCarSearch = signal<string>('');
  changeCarFilter = signal<string>('ALL');

  getCarColorCode(color?: string): string {
    if (!color) return '#94a3b8';
    const c = color.trim().toLowerCase();
    const map: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      yellow: '#eab308',
      green: '#10b981',
      white: '#f8fafc',
      black: '#1e293b',
      orange: '#f97316',
      silver: '#94a3b8',
      purple: '#a855f7',
      pink: '#ec4899',
      gold: '#d97706',
      gray: '#64748b',
      grey: '#64748b'
    };
    return map[c] || '#6366f1';
  }

  getCarColor(carNo: string): string {
    if (!carNo) return '';
    const found = this.cars().find(c => String(c.carNo || c.car_no) === String(carNo));
    return found?.color || '';
  }

  availableCarsForChange = computed(() => {
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
  });

  filteredChangeCars = computed(() => {
    let list = this.availableCarsForChange();
    const q = this.changeCarSearch().toLowerCase().trim();
    const mf = this.changeCarFilter();

    if (mf === 'SINGLE') {
      list = list.filter(c => (c.model || '').toLowerCase().includes('single'));
    } else if (mf === 'DOUBLE') {
      list = list.filter(c => (c.model || '').toLowerCase().includes('double'));
    }

    if (q) {
      list = list.filter(c => 
        (c.carNo && String(c.carNo).toLowerCase().includes(q)) ||
        (c.model && String(c.model).toLowerCase().includes(q)) ||
        (c.color && String(c.color).toLowerCase().includes(q))
      );
    }
    return list;
  });

  selectedChangeTargetCar = computed(() => {
    const id = this.changeCarTargetId();
    if (!id) return null;
    return this.cars().find(c => String(c.id) === String(id)) || null;
  });`;

if (content.includes(oldPropsMarker)) {
  content = content.replace(oldPropsMarker, newPropsContent);
  console.log('Successfully added Change Car properties to BillsComponent');
} else {
  console.log('ERROR: Could not find oldPropsMarker in bills.ts');
}

// 5. Add loadCars call to ngOnInit
const oldNgInit = `  ngOnInit() {
    this.loadRentals();`;

const newNgInit = `  ngOnInit() {
    this.loadRentals();
    this.loadCars();`;

if (content.includes(oldNgInit)) {
  content = content.replace(oldNgInit, newNgInit);
  console.log('Successfully hooked loadCars into ngOnInit');
} else {
  console.log('ERROR: Could not find oldNgInit');
}

// 6. Add methods to BillsComponent
const oldEndClassMarker = `  closeAuditModal() {
    this.isAuditModalOpen = false;
  }
}`;

const newMethodsContent = `  closeAuditModal() {
    this.isAuditModalOpen = false;
  }

  loadCars() {
    this.api.getCars().subscribe({
      next: (cars) => this.cars.set(cars || []),
      error: (err) => console.error('Failed to load cars in BillsComponent:', err)
    });
  }

  openChangeCarModal(rental: any) {
    this.changeCarRental = rental;
    this.changeCarSearch.set('');
    this.changeCarFilter.set('ALL');
    this.changeCarReason = '';
    this.isChangeCarModalOpen = true;

    // Refresh cars fleet
    this.api.getCars().subscribe({
      next: (cars) => {
        this.cars.set(cars || []);
        const avail = this.availableCarsForChange();
        if (avail && avail.length > 0) {
          this.changeCarTargetId.set(String(avail[0].id));
        } else {
          this.changeCarTargetId.set('');
        }
      }
    });
  }

  closeChangeCarModal() {
    this.isChangeCarModalOpen = false;
    this.changeCarRental = null;
    this.changeCarTargetId.set('');
    this.changeCarReason = '';
  }

  confirmChangeCar() {
    const rental = this.changeCarRental;
    const newCarId = this.changeCarTargetId();
    if (!rental || !newCarId) {
      alert('Please select a replacement car.');
      return;
    }

    const curCarId = String(rental.car_id || rental.carId || '');
    const curCarNo = String(rental.car_no || rental.carNo || '');
    if (newCarId === curCarId || newCarId === curCarNo) {
      alert('The selected replacement car cannot be the same as the currently assigned car.');
      return;
    }

    const targetCarObj = this.cars().find(c => String(c.id) === String(newCarId));
    const targetCarNo = targetCarObj?.carNo || targetCarObj?.car_no || '';

    this.changeCarProcessing.set(true);

    this.api.changeCar(rental.id, {
      newCarId,
      newCarNo: targetCarNo,
      carId: curCarId,
      carNo: curCarNo,
      invoiceNo: rental.invoice_no || rental.invoiceNo || '',
      reason: this.changeCarReason || 'Changed from Bills management screen',
      username: this.getCurrentUser(),
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1'
    }).subscribe({
      next: (res: any) => {
        this.changeCarProcessing.set(false);
        this.closeChangeCarModal();
        alert(\`✅ Car successfully changed from #\${curCarNo} to #\${res.newCarNo || targetCarNo}!\`);
        this.loadRentals();
        this.loadCars();
      },
      error: (err: any) => {
        this.changeCarProcessing.set(false);
        const msg = err.error?.error || err.message || 'Failed to change car';
        alert(\`Error changing car: \${msg}\`);
      }
    });
  }
}`;

if (content.includes(oldEndClassMarker)) {
  content = content.replace(oldEndClassMarker, newMethodsContent);
  console.log('Successfully added Change Car methods to BillsComponent');
} else {
  console.log('ERROR: Could not find oldEndClassMarker in bills.ts');
}

fs.writeFileSync('src/app/bills.ts', content, 'utf8');
console.log('bills.ts saved successfully.');
