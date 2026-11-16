import { Component, signal, OnInit, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pos',
  imports: [CommonModule, FormsModule],
  host: { class: 'flex-1 flex flex-col overflow-hidden' },
  template: `
      <!-- Statistics & Filters -->
      <section class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-8">
          <div class="flex gap-2 items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-bold text-slate-600">AVAILABLE: <span class="text-slate-900">{{ availableCount() }}</span></span>
          </div>
          <div class="flex gap-2 items-center">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span class="text-xs font-bold text-slate-600">RENTED: <span class="text-slate-900">{{ rentedCount() }}</span></span>
          </div>
          <div class="h-4 w-px bg-slate-300"></div>
          <span class="text-xs font-bold text-slate-600">FLEET TOTAL: <span class="text-slate-900">{{ cars().length }}</span></span>
          <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-indigo-100">
            <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> PostgreSQL Live Fleet
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="loadData()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200" title="Refresh Live Data">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <button (click)="filter.set('ALL')" [class]="filter() === 'ALL' ? 'px-4 py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-sm' : 'px-4 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100'">ALL TYPES</button>
          <button (click)="filter.set('SINGLE')" [class]="filter() === 'SINGLE' ? 'px-4 py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-sm' : 'px-4 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100'">SINGLE SEATER</button>
          <button (click)="filter.set('DOUBLE')" [class]="filter() === 'DOUBLE' ? 'px-4 py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-sm' : 'px-4 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100'">DOUBLE SEATER</button>
        </div>
      </section>

      <!-- Main Workspace -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Grid of Cars -->
        <div class="flex-1 p-4 flex flex-col gap-6 bg-slate-100 overflow-y-auto">
           
           <div *ngIf="loading()" class="p-12 text-center text-slate-400">
             <div class="inline-flex items-center gap-2">
               <div class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               Loading live fleet from PostgreSQL...
             </div>
           </div>

           <div *ngIf="!loading() && (filter() === 'ALL' || filter() === 'SINGLE')">
              <h3 class="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>SINGLE SEATER FLEET</span>
                <span class="text-xs text-slate-400 font-normal">{{ displayedCars('SINGLE').length }} vehicles</span>
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                 <ng-container *ngFor="let car of displayedCars('SINGLE')">
                    <div class="bg-white rounded-lg p-2 flex flex-col items-center justify-center shadow-sm relative cursor-pointer border-2 transition-all hover:scale-105 min-h-[96px]"
                         [ngClass]="car.status === 'Available' ? (selectedCar()?.id === car.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-300' : 'border-green-200 hover:border-indigo-400') : (selectedCar()?.id === car.id ? 'border-red-500 shadow-md ring-2 ring-red-300' : 'border-red-400 bg-red-50')"
                         (click)="handleCarClick(car)">
                       
                       <div class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full" [ngClass]="car.status === 'Available' ? 'bg-green-500' : 'bg-red-500'"></div>
                       <div *ngIf="car.status === 'Rented'" class="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">RENTED</div>
                       
                       <span class="text-[10px] font-bold mt-1" [ngClass]="car.status === 'Available' ? 'text-slate-400' : 'text-red-400'">{{ car.carNo }}</span>
                       
                       <div class="text-xl my-0.5">🚗</div>
                       
                       <span class="text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-800">SINGLE</span>
                       
                       <span *ngIf="car.status === 'Available'" class="text-[10px] mt-1 font-bold text-green-600">READY</span>
                       <span *ngIf="car.status === 'Rented'" class="text-[10px] mt-1 font-mono text-red-600 font-bold">{{ getRentalDuration(car.id) }}</span>
                    </div>
                 </ng-container>
              </div>
           </div>

           <div *ngIf="!loading() && (filter() === 'ALL' || filter() === 'DOUBLE')">
              <h3 class="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 mt-4 flex items-center justify-between">
                <span>DOUBLE SEATER FLEET</span>
                <span class="text-xs text-slate-400 font-normal">{{ displayedCars('DOUBLE').length }} vehicles</span>
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                 <ng-container *ngFor="let car of displayedCars('DOUBLE')">
                    <div class="bg-white rounded-lg p-2 flex flex-col items-center justify-center shadow-sm relative cursor-pointer border-2 transition-all hover:scale-105 min-h-[96px]"
                         [ngClass]="car.status === 'Available' ? (selectedCar()?.id === car.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-300' : 'border-green-200 hover:border-indigo-400') : (selectedCar()?.id === car.id ? 'border-red-500 shadow-md ring-2 ring-red-300' : 'border-red-400 bg-red-50')"
                         (click)="handleCarClick(car)">
                       
                       <div class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full" [ngClass]="car.status === 'Available' ? 'bg-green-500' : 'bg-red-500'"></div>
                       <div *ngIf="car.status === 'Rented'" class="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">RENTED</div>
                       
                       <span class="text-[10px] font-bold mt-1" [ngClass]="car.status === 'Available' ? 'text-slate-400' : 'text-red-400'">{{ car.carNo }}</span>
                       
                       <div class="text-xl my-0.5">🏎️</div>
                       
                       <span class="text-[9px] font-bold px-1 rounded bg-indigo-50 text-indigo-700">DOUBLE</span>
                       
                       <span *ngIf="car.status === 'Available'" class="text-[10px] mt-1 font-bold text-green-600">READY</span>
                       <span *ngIf="car.status === 'Rented'" class="text-[10px] mt-1 font-mono text-red-600 font-bold">{{ getRentalDuration(car.id) }}</span>
                    </div>
                 </ng-container>
              </div>
           </div>
           
        </div>

        <!-- Start Rental Modal Popup -->
        <div *ngIf="isStartModalOpen && selectedCar()?.status === 'Available'" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
              <div class="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
                 <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   New Rental Session (Save to PostgreSQL)
                 </h2>
                 <button (click)="closeModal()" class="text-white hover:bg-indigo-700 rounded p-1 transition">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <div class="p-6 space-y-4 overflow-y-auto">
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">CAR NO</label>
                    <input type="text" [value]="selectedCar()?.carNo + ' (' + selectedCar()?.model + ')'" readonly class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono font-bold">
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">CURR. TIME</label>
                    <input type="text" [value]="currentTime | date:'HH:mm:ss'" readonly class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono font-bold">
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">Rate Tier / Duration</label>
                  <select [(ngModel)]="selectedDuration" (change)="onDurationChange()" class="border border-slate-300 rounded px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option [value]="15">15 Minutes (Standard)</option>
                    <option [value]="30">30 Minutes (Extended)</option>
                    <option [value]="60">60 Minutes (Full Hour)</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">Customer Name</label>
                  <input type="text" [(ngModel)]="customerName" placeholder="Full name (Walk-in Customer)" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">Mobile Number</label>
                  <input type="text" [(ngModel)]="mobileNo" placeholder="Mobile Phone" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">Rental Deposit (KWD)</label>
                  <input type="number" [(ngModel)]="depositAmount" class="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-indigo-600">
                </div>
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                <button (click)="onRentalStart()" [disabled]="processing()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  START RENTAL IN DATABASE
                  <svg *ngIf="!processing()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </button>
                <p class="text-center text-[10px] text-slate-400 italic">Grace Period: 10 Mins Applicable</p>
              </div>
           </div>
        </div>

        <!-- Close Rental Modal Popup -->
        <div *ngIf="isCloseModalOpen && selectedCar()?.status === 'Rented'" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
              <div class="bg-red-500 p-4 flex items-center justify-between text-white shrink-0">
                 <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   Close Rental Session (Update PostgreSQL)
                 </h2>
                 <button (click)="closeModal()" class="text-white hover:bg-red-600 rounded p-1 transition">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <div class="p-6 space-y-4 overflow-y-auto">
                 <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Customer / Car Ref</div>
                    <div class="font-bold text-sm text-slate-800">{{ getActiveRental(selectedCar()?.id)?.customer_name || getActiveRental(selectedCar()?.id)?.customerName || 'Walk-in Customer' }} (Car No: {{ selectedCar()?.carNo }})</div>
                 </div>
                 
                 <div class="grid grid-cols-2 gap-3">
                   <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Started</div>
                      <div class="font-bold text-sm text-slate-800">{{ getRentalStartTime(selectedCar()?.id) | date:'HH:mm' }}</div>
                   </div>
                   <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Elapsed Duration</div>
                      <div class="font-bold text-sm text-red-600 font-mono">{{ getRentalDuration(selectedCar()?.id) }}</div>
                   </div>
                 </div>

                 <div class="bg-red-50 rounded-lg p-3 border border-red-100 flex justify-between items-center">
                    <span class="text-xs font-bold text-red-700">Calculated Charge</span>
                    <span class="font-black text-red-600 text-lg">KD {{ calculateRate() | number:'1.3-3' }}</span>
                 </div>

                 <div class="flex flex-col gap-1">
                   <label class="text-[10px] font-bold text-slate-500 uppercase">Discount (KD)</label>
                   <input type="number" [(ngModel)]="discount" class="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                 </div>

                 <div class="flex flex-col gap-1">
                   <label class="text-[10px] font-bold text-slate-500 uppercase">Payment Method</label>
                   <div class="flex bg-slate-100 rounded p-1 border border-slate-200">
                     <button (click)="paymentMethod = 'CASH'" [class]="paymentMethod === 'CASH' ? 'flex-1 bg-white shadow-sm text-indigo-600 rounded py-1.5 text-xs font-bold' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5'">CASH</button>
                     <button (click)="paymentMethod = 'KNET'" [class]="paymentMethod === 'KNET' ? 'flex-1 bg-white shadow-sm text-indigo-600 rounded py-1.5 text-xs font-bold' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5'">KNET</button>
                   </div>
                 </div>

                 <div class="bg-slate-50 rounded-lg p-3 border border-slate-200 flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-600">Final Charge</span>
                    <span class="font-black text-slate-800 text-md">KD {{ finalCharge() | number:'1.3-3' }}</span>
                 </div>

                 <div class="bg-green-50 rounded-lg p-4 flex justify-between items-center border border-green-200 shadow-inner">
                    <span class="font-bold text-green-700 text-sm">Return to Customer</span>
                    <span class="font-black text-green-600 text-2xl">KD {{ finalChangeToReturn() | number:'1.3-3' }}</span>
                 </div>
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
                <button (click)="closeModal()" class="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-100 transition text-sm shadow-sm">
                  CANCEL
                </button>
                <button (click)="onRentalClose()" [disabled]="processing()" class="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-md text-sm flex items-center justify-center gap-2">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  CONFIRM & CLOSE
                </button>
              </div>
           </div>
        </div>

      </div>
  `
})
export class PosComponent implements OnInit {
  private api = inject(ApiService);
  
  cars = signal<any[]>([]);
  models = signal<any[]>([]);
  rentals = signal<any[]>([]);
  rates = signal<any[]>([]);
  
  filter = signal<string>('ALL'); // ALL, SINGLE, DOUBLE
  loading = signal(false);
  processing = signal(false);

  availableCount = signal(0);
  rentedCount = signal(0);
  selectedCar = signal<any>(null);
  currentTime = new Date();
  
  // Form State
  customerName = '';
  mobileNo = '';
  selectedDuration = 15;
  depositAmount = 3.000;

  paymentMethod = 'CASH';
  discount = 0;

  isCloseModalOpen = false;
  isStartModalOpen = false;

  constructor() {
    setInterval(() => this.currentTime = new Date(), 1000);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    
    // Load Cars, Models, Rates, and Rentals in parallel from PostgreSQL
    this.api.getCars().subscribe({
      next: (cars) => {
        this.cars.set(cars || []);
        this.updateStats();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching cars from PostgreSQL:', err);
        this.loading.set(false);
      }
    });

    this.api.getCarModels().subscribe({
      next: (models) => this.models.set(models || [])
    });

    this.api.getRates().subscribe({
      next: (rates) => this.rates.set(rates || [])
    });

    this.api.getRentals().subscribe({
      next: (rentals) => this.rentals.set(rentals || [])
    });
  }

  updateStats() {
    const all = this.cars();
    this.availableCount.set(all.filter(c => c.status === 'Available').length);
    this.rentedCount.set(all.filter(c => c.status === 'Rented').length);
  }

  displayedCars(type: string) {
    return this.cars().filter(c => {
      const isSingle = (c.model || '').toLowerCase().includes('single');
      if (type === 'SINGLE') return isSingle;
      if (type === 'DOUBLE') return !isSingle;
      return true;
    });
  }

  getActiveRental(carId: string) {
    if (!carId) return null;
    return this.rentals().find(r => (r.car_id === carId || r.carId === carId) && r.status === 'ACTIVE');
  }

  getRentalStartTime(carId: string) {
    const r = this.getActiveRental(carId);
    return r ? (r.start_time || r.startTime) : new Date();
  }

  getRentalDuration(carId: string) {
    const r = this.getActiveRental(carId);
    if (!r) return '00:00';
    const start = new Date(r.start_time || r.startTime).getTime();
    const diff = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const hrs = Math.floor(diff / 60).toString().padStart(2, '0');
    const mins = (diff % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  }

  onDurationChange() {
    const isSingle = (this.selectedCar()?.model || '').toLowerCase().includes('single');
    if (this.selectedDuration == 15) this.depositAmount = isSingle ? 3.000 : 4.500;
    else if (this.selectedDuration == 30) this.depositAmount = isSingle ? 5.000 : 7.000;
    else this.depositAmount = isSingle ? 8.000 : 12.000;
  }

  calculateRate() {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car.id);
    if (!r) return Number(this.depositAmount || 0);

    const start = new Date(r.start_time || r.startTime).getTime();
    const diff = Math.max(1, Math.floor((this.currentTime.getTime() - start) / 60000));
    
    // Base amount from rental or rate calculation
    const baseAmt = Number(r.rental_amount || r.rentalAmount || (car.model.includes('Single') ? 3.000 : 4.500));
    const plannedDuration = Number(r.duration_minutes || r.durationMinutes || 15);
    
    if (diff <= plannedDuration + 10) {
      return baseAmt;
    } else {
      const extraMinutes = diff - plannedDuration;
      const extraIntervals = Math.ceil(extraMinutes / 15);
      const extraRate = car.model.includes('Single') ? 1.500 : 2.500;
      return baseAmt + (extraIntervals * extraRate);
    }
  }

  finalCharge() {
    return Math.max(0, this.calculateRate() - Number(this.discount || 0));
  }

  finalChangeToReturn() {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car.id);
    const deposit = Number(r?.rental_amount || r?.rentalAmount || this.depositAmount || 0);
    const charge = this.finalCharge();
    return Math.max(0, deposit - charge);
  }

  handleCarClick(car: any) {
    this.selectedCar.set(car);
    
    if (car.status === 'Rented') {
       this.isCloseModalOpen = true;
       this.isStartModalOpen = false;
    } else {
       this.isCloseModalOpen = false;
       this.isStartModalOpen = true;
       this.customerName = '';
       this.mobileNo = '';
       this.selectedDuration = 15;
       this.onDurationChange();
    }
    
    this.discount = 0;
    this.paymentMethod = 'CASH';
  }

  closeModal() {
    this.isCloseModalOpen = false;
    this.isStartModalOpen = false;
    this.selectedCar.set(null);
  }

  onRentalStart() {
    const car = this.selectedCar();
    if (!car) return;

    this.processing.set(true);

    const payload = {
      carId: car.id,
      carNo: car.carNo,
      model: car.model,
      customerName: this.customerName || 'Walk-in Customer',
      customerPhone: this.mobileNo || '',
      durationMinutes: Number(this.selectedDuration) || 15,
      rentalAmount: this.depositAmount,
      totalAmount: this.depositAmount,
      paymentMethod: this.paymentMethod,
      createdBy: 'Cashier'
    };

    this.api.createRental(payload).subscribe({
      next: (created) => {
        this.processing.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error creating rental in PostgreSQL:', err);
        alert('Error creating rental in PostgreSQL: ' + (err.error?.error || err.message));
        this.processing.set(false);
      }
    });
  }

  onRentalClose() {
    const car = this.selectedCar();
    if (!car) return;

    const r = this.getActiveRental(car.id);
    const rentalId = r?.id || car.id;

    this.processing.set(true);

    const payload = {
      actualEndTime: new Date().toISOString(),
      extraAmount: Math.max(0, this.calculateRate() - Number(r?.rental_amount || 0)),
      totalAmount: this.finalCharge(),
      status: 'COMPLETED'
    };

    this.api.closeRental(rentalId, payload).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error closing rental in PostgreSQL:', err);
        alert('Error closing rental in PostgreSQL: ' + (err.error?.error || err.message));
        this.processing.set(false);
      }
    });
  }
}
