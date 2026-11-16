const fs = require('fs');

let content = fs.readFileSync('src/app/pos.ts', 'utf8');

// 1. Replace the properties section around isCarSwapModalOpen
const oldProps = `  // Car Swap State (Requirement 8)
  isCarSwapModalOpen = signal(false);
  swapTargetCarId = signal<string>('');
  swapReason = '';
  swapProcessing = signal(false);

  availableCarsForSwap = computed(() => {
    const cur = this.selectedCar();
    if (!cur) return [];
    const curId = String(cur.id || cur.car_id || '');
    const curNo = String(cur.carNo || cur.car_no || '');
    return this.cars().filter(c => {
      const cId = String(c.id || c.car_id || '');
      const cNo = String(c.carNo || c.car_no || '');
      const isRented = c.status === 'Rented' || this.isCarRented(c);
      return cId !== curId && cNo !== curNo && !isRented;
    }).sort((a, b) => {
      const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
    });
  });`;

const newProps = `  // Car Swap State (Requirement 8 - Change Car Option)
  isCarSwapModalOpen = signal(false);
  swapTargetCarId = signal<string>('');
  swapReason = '';
  swapProcessing = signal(false);
  swapSearchQuery = signal<string>('');
  swapModelFilter = signal<string>('ALL'); // ALL, SINGLE, DOUBLE

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

  activeRentedCars = computed(() => {
    return this.cars().filter(c => c.status === 'Rented' || this.isCarRented(c));
  });

  selectedTargetCar = computed(() => {
    const targetId = this.swapTargetCarId();
    if (!targetId) return null;
    return this.cars().find(c => String(c.id) === String(targetId)) || null;
  });

  availableCarsForSwap = computed(() => {
    const cur = this.selectedCar();
    if (!cur) return [];
    const curId = String(cur.id || cur.car_id || '');
    const curNo = String(cur.carNo || cur.car_no || '');
    return this.cars().filter(c => {
      const cId = String(c.id || c.car_id || '');
      const cNo = String(c.carNo || c.car_no || '');
      const isRented = c.status === 'Rented' || this.isCarRented(c);
      return cId !== curId && cNo !== curNo && !isRented;
    }).sort((a, b) => {
      const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
    });
  });

  filteredReplacementCars = computed(() => {
    let list = this.availableCarsForSwap();
    const q = this.swapSearchQuery().toLowerCase().trim();
    const mf = this.swapModelFilter();

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

  selectReplacementCar(car: any) {
    if (!car) return;
    this.swapTargetCarId.set(String(car.id));
    this.cdr.markForCheck();
  }

  onSwitchRentedCarSelection(carId: string) {
    const target = this.cars().find(c => String(c.id) === String(carId));
    if (target) {
      this.selectedCar.set(target);
      const available = this.availableCarsForSwap();
      if (available && available.length > 0) {
        this.swapTargetCarId.set(String(available[0].id));
      } else {
        this.swapTargetCarId.set('');
      }
      this.cdr.markForCheck();
    }
  }`;

if (content.includes(oldProps)) {
  content = content.replace(oldProps, newProps);
  console.log('Successfully replaced properties in PosComponent!');
} else {
  console.log('ERROR: Could not find oldProps');
}

// 2. Replace methods
const oldMethodsStart = `  openCarSwapModal(car?: any, event?: Event) {`;
const oldMethodsEnd = `  finalCharge(): number {`;

const newMethods = `  openCarSwapModal(car?: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    let target = car || this.selectedCar();
    if (!target) {
      const rented = this.activeRentedCars();
      if (rented && rented.length > 0) {
        target = rented[0];
      }
    }
    if (!target) {
      alert('There are no active car rentals currently to change.');
      return;
    }
    this.selectedCar.set(target);
    this.isCloseModalOpen.set(false);
    this.isStartModalOpen.set(false);
    this.isCarSwapModalOpen.set(true);

    this.swapSearchQuery.set('');
    this.swapModelFilter.set('ALL');

    // If active rental wasn't in memory yet, fetch it to guarantee complete rental details
    const active = this.getActiveRental(target);
    if (!active) {
      this.api.getRentals('ACTIVE').subscribe({
        next: (rentals) => {
          if (rentals && rentals.length > 0) {
            const norm = rentals.map(r => this.normalizeRental(r));
            this.rentals.set(norm);
            this.syncFleetStatuses();
            this.cdr.markForCheck();
          }
        }
      });
    }

    // Auto-select first available car so the button is immediately active
    const available = this.availableCarsForSwap();
    if (available && available.length > 0) {
      this.swapTargetCarId.set(String(available[0].id));
    } else {
      this.swapTargetCarId.set('');
    }
    this.swapReason = '';
    this.cdr.markForCheck();
  }

  closeCarSwapModal() {
    this.isCarSwapModalOpen.set(false);
    this.swapTargetCarId.set('');
    this.swapReason = '';
    // Re-open settlement modal if car is still rented
    if (this.selectedCar() && (this.selectedCar().status === 'Rented' || this.isCarRented(this.selectedCar()))) {
      this.isCloseModalOpen.set(true);
    }
    this.cdr.markForCheck();
  }

  confirmCarSwap() {
    const car = this.selectedCar();
    const newCarId = this.swapTargetCarId();
    if (!car || !newCarId) {
      alert('Please select a target car to change to.');
      return;
    }

    if (String(car.id) === String(newCarId) || String(car.carNo) === String(newCarId)) {
      alert('The selected replacement car cannot be the same as the currently assigned car.');
      return;
    }

    const r = this.getActiveRental(car);
    const targetCarObj = this.cars().find(c => String(c.id) === String(newCarId));
    const targetCarNo = targetCarObj?.carNo || targetCarObj?.car_no || '';

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const currentUsername = currentUser?.username || currentUser?.name || 'Cashier';

    this.swapProcessing.set(true);
    const carId = car.id || car.car_id || '';
    const carNo = car.carNo || car.car_no || '';
    const rentalId = r?.id || carId || carNo;
    this.api.changeCar(rentalId, {
      newCarId: newCarId,
      newCarNo: targetCarNo,
      carId: carId,
      carNo: carNo,
      invoiceNo: r?.invoice_no || r?.invoiceNo || '',
      reason: this.swapReason || 'Customer requested car change',
      username: currentUsername,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1'
    }).subscribe({
      next: (res) => {
        this.swapProcessing.set(false);
        this.isCarSwapModalOpen.set(false);
        this.isCloseModalOpen.set(false);
        this.selectedCar.set(null);
        this.cdr.markForCheck();
        this.showPrintToast('success', \`✅ Car successfully changed from #\${carNo} to #\${res.newCarNo || targetCarNo}!\`);
        this.loadData();
      },
      error: (err) => {
        this.swapProcessing.set(false);
        this.cdr.markForCheck();
        const msg = err.error?.error || err.message || 'Failed to change car';
        alert(\`Error changing car: \${msg}\`);
      }
    });
  }

  `;

const startIdx = content.indexOf(oldMethodsStart);
const endIdx = content.indexOf(oldMethodsEnd);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newMethods + content.substring(endIdx);
  console.log('Successfully replaced swap methods in PosComponent!');
} else {
  console.log('ERROR: Could not find methods slice indices', startIdx, endIdx);
}

fs.writeFileSync('src/app/pos.ts', content, 'utf8');
console.log('pos.ts complete patch saved successfully.');
