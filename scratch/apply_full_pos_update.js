const fs = require('fs');

let content = fs.readFileSync('src/app/pos.ts', 'utf8');

// 1. Update Single Seater and Double Seater Change Car buttons
const oldBtn = `<button 
                                type="button" 
                                (click)="openCarSwapModal(car, $event)" 
                                title="Change Car"
                                class="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-bold rounded flex items-center gap-0.5 cursor-pointer shadow-2xs transition">
                                <span>🔄</span>
                                <span>{{ 'POS.CHANGE_CAR' | translate }}</span>
                              </button>`;

const newBtn = `<button 
                                type="button" 
                                (click)="openCarSwapModal(car, $event)" 
                                title="Change Car"
                                class="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[8.5px] font-extrabold rounded flex items-center gap-1 cursor-pointer shadow-xs transition hover:scale-105 active:scale-95 shrink-0">
                                <span class="text-[9px]">🔄</span>
                                <span>{{ 'POS.CHANGE_CAR' | translate }}</span>
                              </button>`;

content = content.replaceAll(oldBtn, newBtn);

// 2. Update Close Rental Header to show car details (Car #, Model, Colour, Status)
const oldCloseHeader = `<h2 class="text-sm font-bold uppercase tracking-wider">
                        {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                      </h2>
                      <p class="text-[11px] text-white/80 font-mono">{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }}</p>`;

const newCloseHeader = `<h2 class="text-sm font-bold uppercase tracking-wider">
                        {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                      </h2>
                      <p class="text-[11px] text-white/90 font-mono flex items-center gap-1.5 mt-0.5">
                        <span *ngIf="selectedCar()?.color" class="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" [style.backgroundColor]="getCarColorCode(selectedCar()?.color)"></span>
                        <span>Car #{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }} <span *ngIf="selectedCar()?.color">({{ selectedCar()?.color }})</span></span>
                        <span class="bg-red-800/80 px-1.5 py-0.5 rounded text-[9px] font-bold">Rented</span>
                      </p>`;

content = content.replace(oldCloseHeader, newCloseHeader);

// 3. Redesign Change Car Modal
const oldModalStart = `        <!-- Car Swap Modal Popup (Requirement 8) -->
        <div *ngIf="isCarSwapModalOpen() && selectedCar()" class="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">`;

const oldModalEnd = `           </div>
        </div>

      </div>
  \``;

const newModal = `        <!-- Car Swap Modal Popup (Requirement 8 - Change Car Option) -->
        <div *ngIf="isCarSwapModalOpen() && selectedCar()" class="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
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
                    <p class="text-xs text-indigo-100 font-medium">Reassign vehicle smoothly without disrupting elapsed duration or customer deposit</p>
                  </div>
                </div>
                <button type="button" (click)="closeCarSwapModal()" class="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition cursor-pointer" [title]="'COMMON.CANCEL' | translate">
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
                    <span *ngIf="getActiveRental(selectedCar())?.invoice_no" class="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                      Invoice #{{ getActiveRental(selectedCar())?.invoice_no || getActiveRental(selectedCar())?.invoiceNo }}
                    </span>
                  </div>

                  <div class="bg-white border-2 border-red-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-2xs">
                        <span class="text-[9px] uppercase font-bold text-red-400 leading-none">Car</span>
                        <span class="text-lg leading-tight font-black">#{{ selectedCar()?.carNo || selectedCar()?.car_no }}</span>
                      </div>
                      
                      <div class="space-y-0.5">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-bold text-slate-800">{{ selectedCar()?.model }}</span>
                          
                          <!-- Colour Badge -->
                          <span *ngIf="selectedCar()?.color" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(selectedCar()?.color)"></span>
                            <span>{{ selectedCar()?.color }}</span>
                          </span>

                          <!-- Availability Badge -->
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            <span>{{ 'POS.RENTED' | translate }} (In Use)</span>
                          </span>
                        </div>

                        <!-- Customer & Duration -->
                        <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                          <span class="flex items-center gap-1">
                            <span>👤</span>
                            <span class="font-medium text-slate-700">{{ getActiveRental(selectedCar())?.customer_name || getActiveRental(selectedCar())?.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
                          </span>
                          <span>•</span>
                          <span class="flex items-center gap-1 font-mono font-bold text-red-600">
                            <span>⏱️</span>
                            <span>{{ getRentalDuration(selectedCar()?.id) }}</span>
                          </span>
                          <span *ngIf="selectedCar()?.batteryLevel" class="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <span>🔋</span>
                            <span>{{ selectedCar()?.batteryLevel }}%</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Switch active car dropdown if multiple rented -->
                    <div *ngIf="activeRentedCars().length > 1" class="sm:self-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <select 
                        [ngModel]="selectedCar()?.id" 
                        (ngModelChange)="onSwitchRentedCarSelection($event)"
                        class="w-full sm:w-auto text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500">
                        <option *ngFor="let ac of activeRentedCars()" [value]="ac.id">
                          Car #{{ ac.carNo }} ({{ ac.model }}{{ ac.color ? ' • ' + ac.color : '' }})
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Reassignment Transition Preview Banner -->
                <div *ngIf="selectedTargetCar()" class="bg-indigo-50/90 border border-indigo-200 rounded-xl px-4 py-2 flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-2xs">
                  <div class="flex items-center gap-2 font-bold text-slate-700 flex-wrap">
                    <span class="text-slate-500 font-medium">Reassigning:</span>
                    <span class="font-mono text-red-600 bg-red-100 px-2 py-0.5 rounded font-black">Car #{{ selectedCar()?.carNo }}</span>
                    <span class="text-indigo-600 font-black">➔</span>
                    <span class="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">Car #{{ selectedTargetCar()?.carNo }} ({{ selectedTargetCar()?.model }})</span>
                  </div>
                  <span *ngIf="selectedTargetCar()?.color" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    <span class="w-2.5 h-2.5 rounded-full border border-black/20" [style.backgroundColor]="getCarColorCode(selectedTargetCar()?.color)"></span>
                    <span>{{ selectedTargetCar()?.color }}</span>
                  </span>
                </div>

                <!-- SECTION 2: Available Replacement Cars Selection -->
                <div class="space-y-2">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <label class="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{{ 'POS.AVAILABLE_CARS' | translate }}</span>
                      </label>
                      <span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                        {{ filteredReplacementCars().length }} {{ 'POS.READY' | translate }}
                      </span>
                    </div>

                    <!-- Category Filter Chips -->
                    <div class="flex items-center gap-1">
                      <button 
                        type="button" 
                        (click)="swapModelFilter.set('ALL')"
                        [class]="swapModelFilter() === 'ALL' ? 'px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md shadow-xs' : 'px-2.5 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100'">
                        All
                      </button>
                      <button 
                        type="button" 
                        (click)="swapModelFilter.set('SINGLE')"
                        [class]="swapModelFilter() === 'SINGLE' ? 'px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md shadow-xs' : 'px-2.5 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100'">
                        Single
                      </button>
                      <button 
                        type="button" 
                        (click)="swapModelFilter.set('DOUBLE')"
                        [class]="swapModelFilter() === 'DOUBLE' ? 'px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md shadow-xs' : 'px-2.5 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100'">
                        Double
                      </button>
                    </div>
                  </div>

                  <!-- Search Bar for Available Cars -->
                  <div class="relative">
                    <svg class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input 
                      type="text" 
                      [(ngModel)]="swapSearchQuery"
                      placeholder="Search replacement cars by number, model, or colour..."
                      class="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs">
                  </div>

                  <!-- Empty Available State -->
                  <div *ngIf="availableCarsForSwap().length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2.5">
                    <span class="text-xl">⚠️</span>
                    <div>
                      <p>No other replacement cars are currently available in the fleet.</p>
                      <p class="font-normal text-amber-700 text-[11px] mt-0.5">All fleet cars are either in active rentals or under maintenance.</p>
                    </div>
                  </div>

                  <div *ngIf="availableCarsForSwap().length > 0 && filteredReplacementCars().length === 0" class="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 text-center font-medium">
                    No replacement cars match filter "{{ swapSearchQuery() }}".
                  </div>

                  <!-- Available Cars Interactive Cards Grid -->
                  <div *ngIf="filteredReplacementCars().length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1">
                    <div 
                      *ngFor="let c of filteredReplacementCars()" 
                      (click)="selectReplacementCar(c)"
                      class="p-2.5 rounded-xl border-2 transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 shadow-2xs select-none hover:shadow-sm"
                      [ngClass]="swapTargetCarId() === c.id 
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

                        <!-- Checkmark Indicator -->
                        <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition"
                             [ngClass]="swapTargetCarId() === c.id ? 'bg-indigo-600 text-white shadow-xs' : 'border border-slate-300 text-transparent'">
                          ✓
                        </div>
                      </div>

                      <!-- Colour & Availability -->
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
                      [ngModel]="swapTargetCarId()" 
                      (ngModelChange)="swapTargetCarId.set($event)"
                      class="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs">
                      <option value="">-- Choose New Available Car --</option>
                      <option *ngFor="let c of availableCarsForSwap()" [value]="c.id">
                        Car #{{ c.carNo || c.car_no }} • {{ c.model }} {{ c.color ? ' • ' + c.color : '' }} (Available)
                      </option>
                    </select>
                  </div>
                </div>

                <!-- SECTION 3: Reason for Change & Quick Presets -->
                <div class="space-y-1.5 bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                  <label class="text-[10px] font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between">
                    <span>{{ 'POS.CHANGE_REASON' | translate }} (Optional)</span>
                    <span class="text-slate-400 font-normal">Logged into audit trail</span>
                  </label>
                  
                  <input 
                    type="text" 
                    [(ngModel)]="swapReason" 
                    placeholder="e.g. Customer preferred blue color, child wanted another car, low battery..." 
                    class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs" />
                  
                  <!-- Preset tags -->
                  <div class="flex items-center gap-1.5 flex-wrap pt-1">
                    <span class="text-[10px] text-slate-500 font-medium">Quick presets:</span>
                    <button type="button" (click)="swapReason = 'Customer preferred different color'" class="px-2 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded text-slate-700 cursor-pointer transition">Colour preference</button>
                    <button type="button" (click)="swapReason = 'Child requested different model'" class="px-2 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded text-slate-700 cursor-pointer transition">Model preference</button>
                    <button type="button" (click)="swapReason = 'Battery swapped / low speed'" class="px-2 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded text-slate-700 cursor-pointer transition">Battery swap</button>
                    <button type="button" (click)="swapReason = 'Car inspection / maintenance'" class="px-2 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 border border-slate-200 rounded text-slate-700 cursor-pointer transition">Inspection</button>
                  </div>
                </div>

              </div>

              <!-- Modal Action Buttons: Cancel and Confirm -->
              <div class="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
                <button 
                  type="button" 
                  (click)="closeCarSwapModal()" 
                  class="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition cursor-pointer">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
                
                <button 
                  type="button"
                  (click)="confirmCarSwap()" 
                  [disabled]="!swapTargetCarId() || swapProcessing() || availableCarsForSwap().length === 0" 
                  class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md transition">
                  <span *ngIf="swapProcessing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span *ngIf="!swapProcessing()">🔄</span>
                  <span>{{ 'POS.CONFIRM_CAR_CHANGE' | translate }}</span>
                </button>
              </div>

           </div>
        </div>

      </div>
  \``;

const modalStartIndex = content.indexOf(oldModalStart);
const modalEndIndex = content.indexOf(oldModalEnd);

if (modalStartIndex !== -1 && modalEndIndex !== -1) {
  content = content.substring(0, modalStartIndex) + newModal + content.substring(modalEndIndex + oldModalEnd.length);
  console.log('Successfully replaced Change Car modal!');
} else {
  console.log('ERROR: Could not find modal slice indices', modalStartIndex, modalEndIndex);
}

fs.writeFileSync('src/app/pos.ts', content, 'utf8');
console.log('pos.ts step 2 saved.');
