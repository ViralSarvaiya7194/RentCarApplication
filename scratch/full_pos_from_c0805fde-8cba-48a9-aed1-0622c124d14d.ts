import { Component, signal, OnInit, inject } from '@angular/core';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService, ThermalPaperWidth } from './print.service';
import { PermissionService } from './permission.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  host: { class: 'flex-1 flex flex-col overflow-hidden' },
  template: `
      <!-- Statistics & Filters -->
      <section class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 relative">
        
        <!-- Floating Direct Print Toast Notification Banner -->
        <div *ngIf="printToast()" class="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
             [ngClass]="printToast()?.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20' : (printToast()?.type === 'warning' ? 'bg-amber-600 text-white border-amber-500 shadow-amber-600/20' : 'bg-red-600 text-white border-red-500 shadow-red-600/20')">
          <span>{{ printToast()?.message }}</span>
          <button (click)="printToast.set(null)" class="text-white/80 hover:text-white ml-2 text-sm font-bold cursor-pointer">&times;</button>
        </div>

        <div class="flex items-center gap-8">
          <div class="flex gap-2 items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-bold text-slate-600">{{ 'POS.AVAILABLE' | translate }} <span class="text-slate-900">{{ availableCount() }}</span></span>
          </div>
          <div class="flex gap-2 items-center">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span class="text-xs font-bold text-slate-600">{{ 'POS.RENTED' | translate }} <span class="text-slate-900">{{ rentedCount() }}</span></span>
          </div>
          <div class="h-4 w-px bg-slate-300"></div>
          <span class="text-xs font-bold text-slate-600">{{ 'POS.FLEET_TOTAL' | translate }} <span class="text-slate-900">{{ cars().length }}</span></span>
          <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-indigo-100">
            <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> {{ 'POS.LIVE_FLEET' | translate }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="loadData()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <button (click)="filter.set('ALL')" [class]="filter() === 'ALL' ? 'px-4 py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-sm cursor-pointer' : 'px-4 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 cursor-pointer'">{{ 'POS.ALL_TYPES' | translate }}</button>
          <button (click)="filter.set('SINGLE')" [class]="filter() === 'SINGLE' ? 'px-4 py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-sm cursor-pointer' : 'px-4 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 cursor-pointer'">{{ 'POS.SINGLE_SEATER_BTN' | translate }}</button>
          <button (click)="filter.set('DOUBLE')" [class]="filter() === 'DOUBLE' ? 'px-4 py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-sm cursor-pointer' : 'px-4 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 cursor-pointer'">{{ 'POS.DOUBLE_SEATER_BTN' | translate }}</button>
        </div>
      </section>

      <!-- Main Workspace -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Grid of Cars -->
        <div class="flex-1 p-4 flex flex-col gap-6 bg-slate-100 overflow-y-auto">
           
           <div *ngIf="loading()" class="p-12 text-center text-slate-400">
             <div class="inline-flex items-center gap-2">
               <div class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               {{ 'POS.LOADING_FLEET' | translate }}
             </div>
           </div>

           <div *ngIf="!loading() && (filter() === 'ALL' || filter() === 'SINGLE')">
              <h3 class="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>{{ 'POS.SINGLE_FLEET_TITLE' | translate }}</span>
                <span class="text-xs text-slate-400 font-normal">{{ 'COMMON.VEHICLES' | translate:{count: displayedCars('SINGLE').length} }}</span>
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                 <ng-container *ngFor="let car of displayedCars('SINGLE')">
                    <div class="bg-white rounded-lg p-2 flex flex-col items-center justify-center shadow-sm relative cursor-pointer border-2 transition-all hover:scale-105 min-h-[96px]"
                         [ngClass]="car.status === 'Available' ? (selectedCar()?.id === car.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-300' : 'border-green-200 hover:border-indigo-400') : (selectedCar()?.id === car.id ? 'border-red-500 shadow-md ring-2 ring-red-300' : 'border-red-400 bg-red-50')"
                         (click)="handleCarClick(car)">
                       
                       <div class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full" [ngClass]="car.status === 'Available' ? 'bg-green-500' : 'bg-red-500'"></div>
                       <div *ngIf="car.status === 'Rented'" class="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">{{ 'POS.RENTED_BADGE' | translate }}</div>
                       
                       <span class="text-[10px] font-bold mt-1" [ngClass]="car.status === 'Available' ? 'text-slate-400' : 'text-red-400'">{{ car.carNo }}</span>
                       
                       <div class="text-xl my-0.5">🚗</div>
                       
                       <span class="text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-800">{{ 'POS.SINGLE_BADGE' | translate }}</span>
                       
                       <span *ngIf="car.status === 'Available'" class="text-[10px] mt-1 font-bold text-green-600">{{ 'POS.READY' | translate }}</span>
                       <span *ngIf="car.status === 'Rented'" class="text-[10px] mt-1 font-mono text-red-600 font-bold">{{ getRentalDuration(car.id) }}</span>
                    </div>
                 </ng-container>
              </div>
           </div>

           <div *ngIf="!loading() && (filter() === 'ALL' || filter() === 'DOUBLE')">
              <h3 class="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 mt-4 flex items-center justify-between">
                <span>{{ 'POS.DOUBLE_FLEET_TITLE' | translate }}</span>
                <span class="text-xs text-slate-400 font-normal">{{ 'COMMON.VEHICLES' | translate:{count: displayedCars('DOUBLE').length} }}</span>
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                 <ng-container *ngFor="let car of displayedCars('DOUBLE')">
                    <div class="bg-white rounded-lg p-2 flex flex-col items-center justify-center shadow-sm relative cursor-pointer border-2 transition-all hover:scale-105 min-h-[96px]"
                         [ngClass]="car.status === 'Available' ? (selectedCar()?.id === car.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-300' : 'border-green-200 hover:border-indigo-400') : (selectedCar()?.id === car.id ? 'border-red-500 shadow-md ring-2 ring-red-300' : 'border-red-400 bg-red-50')"
                         (click)="handleCarClick(car)">
                       
                       <div class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full" [ngClass]="car.status === 'Available' ? 'bg-green-500' : 'bg-red-500'"></div>
                       <div *ngIf="car.status === 'Rented'" class="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">{{ 'POS.RENTED_BADGE' | translate }}</div>
                       
                       <span class="text-[10px] font-bold mt-1" [ngClass]="car.status === 'Available' ? 'text-slate-400' : 'text-red-400'">{{ car.carNo }}</span>
                       
                       <div class="text-xl my-0.5">🏎️</div>
                       
                       <span class="text-[9px] font-bold px-1 rounded bg-indigo-50 text-indigo-700">{{ 'POS.DOUBLE_BADGE' | translate }}</span>
                       
                       <span *ngIf="car.status === 'Available'" class="text-[10px] mt-1 font-bold text-green-600">{{ 'POS.READY' | translate }}</span>
                       <span *ngIf="car.status === 'Rented'" class="text-[10px] mt-1 font-mono text-red-600 font-bold">{{ getRentalDuration(car.id) }}</span>
                    </div>
                 </ng-container>
              </div>
           </div>
           
        </div>

        <!-- Start Rental Modal Popup (Tier Removed, Default 10 KD Deposit, Editable to 0 KD) -->
        <div *ngIf="isStartModalOpen && selectedCar()?.status === 'Available'" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
              <div class="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
                 <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   {{ 'POS.NEW_RENTAL_TITLE' | translate }}
                 </h2>
                 <button (click)="closeModal()" class="text-white hover:bg-indigo-700 rounded p-1 transition cursor-pointer">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <div class="p-6 space-y-4 overflow-y-auto">
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">{{ 'POS.CAR_NO' | translate }}</label>
                    <input type="text" [value]="selectedCar()?.carNo + ' (' + selectedCar()?.model + ')'" readonly class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono font-bold">
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">{{ 'POS.CURR_TIME' | translate }}</label>
                    <input type="text" [value]="currentTime | date:'HH:mm:ss'" readonly class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono font-bold">
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.CUSTOMER_NAME' | translate }}</label>
                  <input type="text" [(ngModel)]="customerName" [placeholder]="'POS.CUSTOMER_NAME_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.MOBILE_NO' | translate }}</label>
                  <input type="text" [(ngModel)]="mobileNo" [placeholder]="'POS.MOBILE_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <!-- Upfront Deposit with Quick Selector -->
                <div class="flex flex-col gap-1.5 bg-indigo-50/60 p-3.5 rounded-lg border border-indigo-100">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">{{ 'POS.RENTAL_DEPOSIT' | translate }} ({{ 'COMMON.KWD' | translate }})</label>
                    <span class="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">{{ 'POS.DEFAULT_10KD' | translate }}</span>
                  </div>
                  <div class="relative">
                    <input type="number" step="0.5" min="0" [(ngModel)]="depositAmount" class="w-full bg-white border border-indigo-300 rounded px-3 py-2 text-base font-black text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <span class="absolute right-3 top-2.5 text-xs font-bold text-slate-400 font-mono">{{ 'COMMON.KWD' | translate }}</span>
                  </div>
                  
                  <!-- Quick Deposit Preset Chips -->
                  <div class="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span class="text-[10px] text-slate-500 font-medium">{{ 'COMMON.QUICK_SELECT' | translate }}:</span>
                    <button type="button" (click)="depositAmount = 0" [class]="depositAmount === 0 ? 'px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded cursor-pointer shadow-xs' : 'px-2 py-0.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer'">0 KD</button>
                    <button type="button" (click)="depositAmount = 5" [class]="depositAmount === 5 ? 'px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded cursor-pointer shadow-xs' : 'px-2 py-0.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer'">5 KD</button>
                    <button type="button" (click)="depositAmount = 10" [class]="depositAmount === 10 ? 'px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded cursor-pointer shadow-xs' : 'px-2 py-0.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer'">10 KD</button>
                    <button type="button" (click)="depositAmount = 15" [class]="depositAmount === 15 ? 'px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded cursor-pointer shadow-xs' : 'px-2 py-0.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer'">15 KD</button>
                    <button type="button" (click)="depositAmount = 20" [class]="depositAmount === 20 ? 'px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded cursor-pointer shadow-xs' : 'px-2 py-0.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer'">20 KD</button>
                  </div>
                </div>

                <!-- Pricing Information Banner -->
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div class="font-bold text-slate-700 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    {{ 'POS.PRICING_POLICY_TITLE' | translate }}
                  </div>
                  <div class="text-[10px] text-slate-500 leading-relaxed">
                    • {{ 'POS.GRACE_PERIOD_TEXT' | translate:{minutes: gracePeriodMinutes()} }}<br>
                    • {{ 'POS.FIRST_HOUR_TEXT' | translate }}<br>
                    • {{ 'POS.EXTRA_HOURS_TEXT' | translate }}
                  </div>
                </div>
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 shrink-0">
                <button (click)="onRentalStart()" [disabled]="processing()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ 'POS.START_RENTAL_BTN' | translate }}
                  <svg *ngIf="!processing()" class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </button>
              </div>
           </div>
        </div>

        <!-- Close Rental & Settlement Modal Popup -->
        <div *ngIf="isCloseModalOpen && selectedCar()?.status === 'Rented'" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
              <!-- Modal Header -->
              <div class="bg-red-600 p-4 flex items-center justify-between text-white shrink-0">
                 <div class="flex items-center gap-2">
                   <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black">🏁</div>
                   <div>
                     <h2 class="text-sm font-bold uppercase tracking-wider">
                       {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                     </h2>
                     <p class="text-[11px] text-white/80 font-mono">{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }}</p>
                   </div>
                 </div>
                 <button (click)="closeModal()" class="text-white/80 hover:text-white hover:bg-red-700 rounded p-1 transition cursor-pointer">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <div class="p-5 space-y-4 overflow-y-auto">
                 
                 <!-- Customer Info Strip -->
                 <div class="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{{ 'POS.CUSTOMER_NAME' | translate }}</span>
                      <span class="font-bold text-slate-800">{{ getActiveRental(selectedCar()?.id)?.customer_name || getActiveRental(selectedCar()?.id)?.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
                    </div>
                    <div class="text-right" *ngIf="getActiveRental(selectedCar()?.id)?.customer_phone || getActiveRental(selectedCar()?.id)?.customerPhone">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{{ 'POS.MOBILE_NO' | translate }}</span>
                      <span class="font-mono font-medium text-slate-700">{{ getActiveRental(selectedCar()?.id)?.customer_phone || getActiveRental(selectedCar()?.id)?.customerPhone }}</span>
                    </div>
                 </div>
                 
                 <!-- 1. Total Time & Duration Section -->
                 <div class="bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100 space-y-2">
                   <div class="flex items-center justify-between">
                     <span class="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                       <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                       {{ 'POS.TOTAL_TIME' | translate }}
                     </span>
                     <span class="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                       {{ getRentalDuration(selectedCar()?.id) }}
                     </span>
                   </div>
                   
                   <div class="grid grid-cols-3 gap-2 pt-1 text-center">
                     <div class="bg-white p-2 rounded-lg border border-indigo-100">
                       <span class="text-[9px] font-bold text-slate-400 uppercase block">{{ 'POS.STARTED_AT' | translate }}</span>
                       <span class="font-mono font-bold text-xs text-slate-800">{{ getRentalStartTime(selectedCar()?.id) | date:'HH:mm:ss' }}</span>
                     </div>
                     <div class="bg-white p-2 rounded-lg border border-indigo-100">
                       <span class="text-[9px] font-bold text-slate-400 uppercase block">{{ 'POS.SETTLE_TIME' | translate }}</span>
                       <span class="font-mono font-bold text-xs text-slate-800">{{ currentTime | date:'HH:mm:ss' }}</span>
                     </div>
                     <div class="bg-white p-2 rounded-lg border border-indigo-100">
                       <span class="text-[9px] font-bold text-indigo-600 uppercase block">{{ 'POS.ELAPSED_DURATION' | translate }}</span>
                       <span class="font-bold text-xs text-indigo-700">{{ getFormattedTotalDuration(selectedCar()?.id) }}</span>
                     </div>
                   </div>
                 </div>

                 <!-- 2. Rate & Charges Breakdown Card -->
                 <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                   <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                     <span class="font-bold text-slate-700">{{ 'POS.CALCULATED_CHARGE' | translate }}</span>
                     <span class="font-mono font-black text-slate-900 text-sm">{{ 'COMMON.KWD' | translate }} {{ calculateRate() | number:'1.3-3' }}</span>
                   </div>

                   <!-- Detailed Pricing Rule Breakdown -->
                   <div class="space-y-1 text-xs pt-1">
                     <div class="flex justify-between text-slate-500 text-[11px]">
                       <span>• {{ 'POS.FIRST_HOUR_BASE' | translate }}:</span>
                       <span class="font-mono font-bold" [ngClass]="getRateBreakdown().isWithinGrace ? 'text-emerald-600' : 'text-slate-700'">
                         {{ getRateBreakdown().isWithinGrace ? ('POS.GRACE_PERIOD_FREE' | translate) : '1.000 KD' }}
                       </span>
                     </div>
                     <div *ngIf="getRateBreakdown().extraHours > 0" class="flex justify-between text-slate-500 text-[11px]">
                       <span>• {{ 'POS.EXTRA_HOURS_CHARGE' | translate }} ({{ getRateBreakdown().extraHours }}h @ 0.500 KD/h):</span>
                       <span class="font-mono font-bold text-slate-800">+ {{ getRateBreakdown().extra | number:'1.3-3' }} KD</span>
                     </div>
                     <div class="flex justify-between text-slate-500 text-[11px]">
                       <span>• {{ 'POS.INITIAL_DEPOSIT_PAID' | translate }}:</span>
                       <span class="font-mono font-bold text-indigo-600">{{ getDepositPaid() | number:'1.3-3' }} KD</span>
                     </div>
                   </div>
                 </div>

                 <!-- 3. Discount Type & Value Selection -->
                 <div class="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2">
                   <div class="flex items-center justify-between">
                     <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'POS.DISCOUNT_TYPE_LABEL' | translate }}</label>
                     <span *ngIf="calculateEffectiveDiscount() > 0" class="text-[11px] font-bold text-emerald-600">
                       - {{ calculateEffectiveDiscount() | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}
                     </span>
                   </div>

                   <!-- Discount Type Switcher -->
                   <div class="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                     <button type="button" (click)="discountType.set('FIXED')" [class]="discountType() === 'FIXED' ? 'flex-1 bg-white shadow-xs text-indigo-600 rounded py-1 text-xs font-bold cursor-pointer transition' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1 cursor-pointer transition'">
                       {{ 'POS.DISCOUNT_FIXED' | translate }} (KD)
                     </button>
                     <button type="button" (click)="discountType.set('PERCENTAGE')" [class]="discountType() === 'PERCENTAGE' ? 'flex-1 bg-white shadow-xs text-indigo-600 rounded py-1 text-xs font-bold cursor-pointer transition' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1 cursor-pointer transition'">
                       {{ 'POS.DISCOUNT_PERCENT' | translate }} (%)
                     </button>
                   </div>

                   <!-- Quick Preset Chips -->
                   <div *ngIf="discountType() === 'PERCENTAGE'" class="flex items-center gap-1.5 flex-wrap pt-0.5">
                     <span class="text-[9px] text-slate-400 font-bold uppercase">{{ 'COMMON.PRESET' | translate }}:</span>
                     <button type="button" (click)="discountValue = 0" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">0%</button>
                     <button type="button" (click)="discountValue = 10" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">10%</button>
                     <button type="button" (click)="discountValue = 20" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">20%</button>
                     <button type="button" (click)="discountValue = 50" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">50%</button>
                     <button type="button" (click)="discountValue = 100" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">100%</button>
                   </div>

                   <div *ngIf="discountType() === 'FIXED'" class="flex items-center gap-1.5 flex-wrap pt-0.5">
                     <span class="text-[9px] text-slate-400 font-bold uppercase">{{ 'COMMON.PRESET' | translate }}:</span>
                     <button type="button" (click)="discountValue = 0" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">0 KD</button>
                     <button type="button" (click)="discountValue = 0.5" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">0.500 KD</button>
                     <button type="button" (click)="discountValue = 1" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">1.000 KD</button>
                     <button type="button" (click)="discountValue = 2" class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">2.000 KD</button>
                   </div>

                   <div class="relative">
                     <input type="number" step="0.1" min="0" [(ngModel)]="discountValue" [placeholder]="discountType() === 'PERCENTAGE' ? 'Enter discount percentage (e.g. 10)' : 'Enter discount amount (e.g. 0.500)'" class="w-full border border-slate-300 rounded px-3 py-1.5 text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                     <span class="absolute right-3 top-2 text-xs font-bold text-slate-400">
                       {{ discountType() === 'PERCENTAGE' ? '%' : 'KD' }}
                     </span>
                   </div>
                 </div>

                 <!-- 4. Payment Method -->
                 <div class="flex flex-col gap-1">
                   <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.PAYMENT_METHOD' | translate }}</label>
                   <div class="flex bg-slate-100 rounded p-1 border border-slate-200">
                     <button (click)="paymentMethod = 'CASH'" [class]="paymentMethod === 'CASH' ? 'flex-1 bg-white shadow-xs text-indigo-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.CASH' | translate }}</button>
                     <button (click)="paymentMethod = 'KNET'" [class]="paymentMethod === 'KNET' ? 'flex-1 bg-white shadow-xs text-indigo-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.KNET' | translate }}</button>
                   </div>
                 </div>

                 <!-- 5. Remarks / Information Notes Option -->
                 <div class="flex flex-col gap-1">
                   <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.REMARKS' | translate }}</label>
                   <textarea rows="2" [(ngModel)]="settlementRemarks" [placeholder]="'POS.REMARKS_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
                 </div>

                 <!-- 6. Final Financial Settlement Summary Box -->
                 <div class="space-y-2 pt-1">
                   <!-- Final Net Charge Strip -->
                   <div class="bg-slate-100 rounded-lg p-2.5 border border-slate-200 flex justify-between items-center">
                     <span class="text-xs font-bold text-slate-700">{{ 'POS.FINAL_CHARGE' | translate }}</span>
                     <span class="font-mono font-black text-slate-900 text-base">{{ 'COMMON.KWD' | translate }} {{ finalCharge() | number:'1.3-3' }}</span>
                   </div>

                   <!-- Settlement Action Box: Refund vs Collect -->
                   <div *ngIf="isRefundToCustomer()" class="bg-emerald-50 rounded-xl p-4 flex justify-between items-center border-2 border-emerald-300 shadow-xs">
                     <div>
                       <span class="font-bold text-emerald-800 text-sm block">{{ 'POS.RETURN_TO_CUSTOMER' | translate }}</span>
                       <span class="text-[10px] text-emerald-600 font-medium">{{ 'POS.DEPOSIT_REFUND_NOTE' | translate }}</span>
                     </div>
                     <span class="font-black text-emerald-600 text-2xl font-mono">{{ 'COMMON.KWD' | translate }} {{ finalChangeToReturn() | number:'1.3-3' }}</span>
                   </div>

                   <div *ngIf="!isRefundToCustomer()" class="bg-amber-50 rounded-xl p-4 flex justify-between items-center border-2 border-amber-300 shadow-xs">
                     <div>
                       <span class="font-bold text-amber-800 text-sm block">{{ 'POS.AMOUNT_DUE' | translate }}</span>
                       <span class="text-[10px] text-amber-600 font-medium">{{ 'POS.COLLECT_REMAINDER_NOTE' | translate }}</span>
                     </div>
                     <span class="font-black text-amber-600 text-2xl font-mono">{{ 'COMMON.KWD' | translate }} {{ finalAmountDue() | number:'1.3-3' }}</span>
                   </div>
                 </div>

              </div>

              <!-- Modal Action Buttons -->
              <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
                <button (click)="closeModal()" class="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-100 transition text-sm shadow-xs cursor-pointer">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
                <button (click)="onRentalClose()" [disabled]="processing()" class="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ 'POS.CONFIRM_CLOSE_BTN' | translate }}
                </button>
              </div>
           </div>
        </div>

        <!-- Receipt Modal Popup -->
        <div *ngIf="isReceiptModalOpen && lastClosedRental" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
              <div id="printable-receipt" class="p-6 bg-white flex flex-col gap-4 text-slate-800">
                 <!-- Receipt Header -->
                 <div class="text-center border-b border-dashed border-slate-300 pb-4">
                    <div class="w-10 h-10 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center mx-auto mb-2 text-lg">K</div>
                    <h2 class="text-base font-bold tracking-tight">Kiddie Kruzzer</h2>
                    <p class="text-xs text-slate-500 font-medium">{{ 'RECEIPT.TITLE' | translate }}</p>
                 </div>

                 <!-- Receipt Meta -->
                 <div class="space-y-1.5 text-xs">
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'RECEIPT.INVOICE_NO' | translate }}:</span>
                       <span class="font-mono font-bold">{{ lastClosedRental.invoice_no || lastClosedRental.invoiceNo || 'INV-000000' }}</span>
                    </div>
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'RECEIPT.DATE' | translate }}:</span>
                       <span class="font-mono">{{ currentTime | date:'yyyy-MM-dd HH:mm' }}</span>
                    </div>
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'POS.CUSTOMER_NAME' | translate }}:</span>
                       <span class="font-bold">{{ lastClosedRental.customer_name || lastClosedRental.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
                    </div>
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'RECEIPT.CAR' | translate }}:</span>
                       <span class="font-bold">{{ lastClosedRental.car_no || lastClosedRental.carNo }} ({{ lastClosedRental.model }})</span>
                    </div>
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'POS.TOTAL_TIME' | translate }}:</span>
                       <span class="font-mono font-bold">{{ lastClosedRental.elapsedDuration || lastClosedRental.elapsed_duration || getRentalDuration(lastClosedRental.car_id || lastClosedRental.carId) }}</span>
                    </div>
                 </div>

                 <!-- Receipt Financials -->
                 <div class="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5 text-xs">
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'POS.DEPOSIT_AMOUNT' | translate }}:</span>
                       <span class="font-mono font-bold">{{ (lastClosedRental.depositAmount || lastClosedRental.deposit_amount || lastClosedRental.rental_amount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'POS.CALCULATED_CHARGE' | translate }}:</span>
                       <span class="font-mono font-bold">{{ (lastClosedRental.rental_amount || lastClosedRental.rentalAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div *ngIf="lastClosedRental.discount" class="flex justify-between text-green-600">
                       <span>{{ 'RECEIPT.DISCOUNT' | translate }} <span *ngIf="lastClosedRental.discountType">({{ lastClosedRental.discountType }})</span>:</span>
                       <span class="font-mono font-bold">-{{ lastClosedRental.discount | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div class="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                       <span>{{ 'RECEIPT.TOTAL_PAID' | translate }}:</span>
                       <span class="font-mono text-indigo-600">{{ (lastClosedRental.total_amount || lastClosedRental.totalAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div *ngIf="lastClosedRental.changeReturned !== undefined && lastClosedRental.changeReturned > 0" class="flex justify-between text-emerald-700 font-bold">
                       <span>{{ 'POS.RETURN_TO_CUSTOMER' | translate }}:</span>
                       <span class="font-mono">{{ lastClosedRental.changeReturned | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-500">
                       <span>{{ 'POS.PAYMENT_METHOD' | translate }}:</span>
                       <span class="font-bold">{{ lastClosedRental.payment_method || lastClosedRental.paymentMethod || 'CASH' }}</span>
                    </div>
                    <div *ngIf="lastClosedRental.settlement_remarks || lastClosedRental.settlementRemarks" class="pt-1 text-[11px] text-slate-600 border-t border-slate-100">
                       <span class="font-bold">{{ 'POS.REMARKS' | translate }}:</span>
                       <span>{{ lastClosedRental.settlement_remarks || lastClosedRental.settlementRemarks }}</span>
                    </div>
                 </div>

                 <!-- Receipt Footer -->
                 <div class="text-center pt-2">
                    <p class="text-xs font-semibold text-slate-700">{{ 'RECEIPT.THANK_YOU' | translate }}</p>
                    <p class="text-[10px] text-slate-400 mt-1">Kiddie Kruzzer Entertainment LLC</p>
                 </div>
              </div>

              <!-- Modal Buttons -->
              <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2">
                 <button (click)="closeReceiptModal()" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                    {{ 'COMMON.CLOSE' | translate }}
                 </button>
                 <button (click)="printReceiptStandard()" class="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    {{ 'PRINT.PRINT_A4' | translate }}
                 </button>
                 <button (click)="printReceiptThermal('80mm')" class="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    {{ 'PRINT.THERMAL_PRINT' | translate }} (80mm)
                 </button>
              </div>
           </div>
        </div>

      </div>
  `
})
export class PosComponent implements OnInit {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);
  private printService = inject(PrintService);
  public perm = inject(PermissionService);
  
  cars = signal<any[]>([]);
  models = signal<any[]>([]);
  rentals = signal<any[]>([]);
  rates = signal<any[]>([]);
  gracePeriodMinutes = signal<number>(10);
  
  filter = signal<string>('ALL'); // ALL, SINGLE, DOUBLE
  loading = signal(false);
  processing = signal(false);

  availableCount = signal(0);
  rentedCount = signal(0);
  selectedCar = signal<any>(null);
  currentTime = new Date();
  
  // Start Rental Form State
  customerName = '';
  mobileNo = '';
  depositAmount = 10.000; // Requirement 1: Default deposit value is 10 KD (Cashier can set to 0 KD or custom)

  // Settlement Form State
  paymentMethod = 'CASH';
  discountType = signal<'FIXED' | 'PERCENTAGE'>('FIXED'); // Requirement 8: Discount Type selection
  discountValue = 0;
  settlementRemarks = ''; // Requirement 7: Remarks option to enter any information

  printToast = signal<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  isCloseModalOpen = false;
  isStartModalOpen = false;
  isReceiptModalOpen = false;
  lastClosedRental: any = null;

  showPrintToast(type: 'success' | 'warning' | 'error', message: string, durationMs = 4500) {
    this.printToast.set({ type, message });
    setTimeout(() => {
      this.printToast.set(null);
    }, durationMs);
  }

  constructor() {
    setInterval(() => this.currentTime = new Date(), 1000);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    
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

    this.api.getGracePeriods().subscribe({
      next: (gps) => {
        if (gps && gps.length > 0) {
          const activeGp = gps.find(g => g.status === 'ACTIVE' || g.status === 'Available');
          if (activeGp && activeGp.minutes !== undefined) {
            this.gracePeriodMinutes.set(Number(activeGp.minutes));
          }
        }
      }
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

  /**
   * Returns live timer formatted as HH:mm:ss
   */
  getRentalDuration(carId: string) {
    const r = this.getActiveRental(carId);
    if (!r) return '00:00:00';
    const start = new Date(r.start_time || r.startTime).getTime();
    const diffSec = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 1000));
    const hrs = Math.floor(diffSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (diffSec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  /**
   * Returns human-readable elapsed duration (e.g. 1 hr 25 mins or 45 mins)
   */
  getFormattedTotalDuration(carId: string) {
    const r = this.getActiveRental(carId);
    if (!r) return '0 min';
    const start = new Date(r.start_time || r.startTime).getTime();
    const diffMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    }
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }

  /**
   * Requirement 4 & 5: Pricing Calculation
   * - Within grace period: 0.000 KD
   * - Crossed grace period (1st hour): 1.000 KD
   * - Every 1 hour after 1st hour crossed (and after grace period): 0.500 KD (500 fils)
   */
  calculateRate(): number {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car.id);
    if (!r) return 0;

    const start = new Date(r.start_time || r.startTime).getTime();
    const elapsedMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const grace = Number(this.gracePeriodMinutes() || 10);

    // Rule 1: Within initial grace period -> 0 KD
    if (elapsedMins <= grace) {
      return 0.000;
    }

    // Rule 2: First hour (up to 60 minutes + grace period) -> 1.000 KD
    if (elapsedMins <= 60 + grace) {
      return 1.000;
    }

    // Rule 3: After first hour crossed + grace period -> 1.000 KD + 0.500 KD for every additional hour
    const extraMins = elapsedMins - 60 - grace;
    const extraHours = Math.floor(extraMins / 60) + 1; // Ceil of additional hours
    return 1.000 + (extraHours * 0.500);
  }

  /**
   * Detailed rate breakdown for UI display
   */
  getRateBreakdown(): { base: number; extra: number; extraHours: number; isWithinGrace: boolean; graceMins: number } {
    const car = this.selectedCar();
    if (!car) return { base: 0, extra: 0, extraHours: 0, isWithinGrace: false, graceMins: 10 };
    const r = this.getActiveRental(car.id);
    if (!r) return { base: 0, extra: 0, extraHours: 0, isWithinGrace: false, graceMins: 10 };

    const start = new Date(r.start_time || r.startTime).getTime();
    const elapsedMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const grace = Number(this.gracePeriodMinutes() || 10);

    if (elapsedMins <= grace) {
      return { base: 0, extra: 0, extraHours: 0, isWithinGrace: true, graceMins: grace };
    }

    if (elapsedMins <= 60 + grace) {
      return { base: 1.000, extra: 0, extraHours: 0, isWithinGrace: false, graceMins: grace };
    }

    const extraMins = elapsedMins - 60 - grace;
    const extraHours = Math.floor(extraMins / 60) + 1;
    return { base: 1.000, extra: extraHours * 0.500, extraHours, isWithinGrace: false, graceMins: grace };
  }

  /**
   * Requirement 8: Calculate effective discount based on chosen Discount Type
   */
  calculateEffectiveDiscount(): number {
    const rate = this.calculateRate();
    const val = Number(this.discountValue || 0);
    if (val <= 0 || rate <= 0) return 0;

    if (this.discountType() === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, val));
      return Math.min(rate, (rate * pct) / 100);
    } else {
      return Math.min(rate, Math.max(0, val));
    }
  }

  finalCharge(): number {
    return Math.max(0, this.calculateRate() - this.calculateEffectiveDiscount());
  }

  getDepositPaid(): number {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car.id);
    return Number(r?.rental_amount ?? r?.rentalAmount ?? this.depositAmount ?? 0);
  }

  isRefundToCustomer(): boolean {
    return this.getDepositPaid() >= this.finalCharge();
  }

  finalChangeToReturn(): number {
    const deposit = this.getDepositPaid();
    const charge = this.finalCharge();
    return Math.max(0, deposit - charge);
  }

  finalAmountDue(): number {
    const deposit = this.getDepositPaid();
    const charge = this.finalCharge();
    return Math.max(0, charge - deposit);
  }

  handleCarClick(car: any) {
    this.selectedCar.set(car);
    
    if (car.status === 'Rented') {
       this.isCloseModalOpen = true;
       this.isStartModalOpen = false;
       this.discountType.set('FIXED');
       this.discountValue = 0;
       this.settlementRemarks = '';
       this.paymentMethod = 'CASH';
    } else {
       this.isCloseModalOpen = false;
       this.isStartModalOpen = true;
       this.customerName = '';
       this.mobileNo = '';
       this.depositAmount = 10.000; // Requirement 1: Default deposit value is 10 KD
    }
  }

  closeModal() {
    this.isCloseModalOpen = false;
    this.isStartModalOpen = false;
    this.selectedCar.set(null);
  }

  closeReceiptModal() {
    this.isReceiptModalOpen = false;
    this.lastClosedRental = null;
  }

  printReceiptStandard() {
    if (this.lastClosedRental) {
      this.printService.printRentalReceipt(this.lastClosedRental, false);
    }
  }

  printReceiptThermal(width: ThermalPaperWidth = '80mm') {
    if (this.lastClosedRental) {
      this.printService.printRentalReceipt(this.lastClosedRental, true, width);
    }
  }

  onRentalStart() {
    const car = this.selectedCar();
    if (!car) return;

    this.processing.set(true);

    const defaultCustomer = this.translateService.translate('POS.WALK_IN_CUSTOMER');
    const deposit = Math.max(0, Number(this.depositAmount) || 0); // Requirement 2: Can be 0 KD or custom

    const payload = {
      carId: car.id,
      carNo: car.carNo,
      model: car.model,
      customerName: this.customerName || defaultCustomer,
      customerPhone: this.mobileNo || '',
      durationMinutes: 60, // Standard base duration
      rentalAmount: deposit,
      totalAmount: deposit,
      paymentMethod: this.paymentMethod,
      createdBy: 'Cashier'
    };

    this.api.createRental(payload).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error creating rental in PostgreSQL:', err);
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
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

    const calcCharge = this.calculateRate();
    const effectiveDiscount = this.calculateEffectiveDiscount();
    const charge = this.finalCharge();
    const depositAmt = this.getDepositPaid();
    const changeToReturn = this.finalChangeToReturn();
    const extraAmt = this.getRateBreakdown().extra;
    const elapsed = this.getRentalDuration(car.id);

    const payload = {
      actualEndTime: new Date().toISOString(),
      extraAmount: extraAmt,
      discount: effectiveDiscount,
      discountType: this.discountType(),
      discountValue: this.discountValue,
      settlementRemarks: this.settlementRemarks || undefined,
      remarks: this.settlementRemarks || undefined,
      totalAmount: charge,
      paymentMethod: this.paymentMethod,
      username: 'Cashier',
      terminal: 'POS-Terminal-1',
      location: localStorage.getItem('currentLocation') || 'Zone A - Ground Floor',
      branch: localStorage.getItem('currentBranch') || 'Avenues Mall',
      elapsedDuration: elapsed,
      depositAmount: depositAmt,
      changeReturned: changeToReturn,
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH',
    };

    this.api.settleRental(rentalId, payload).subscribe({
      next: (res) => {
        this.processing.set(false);
        this.closeModal();
        this.loadData();

        const closedRental = res.rental || res;
        this.lastClosedRental = {
          ...r,
          ...closedRental,
          carNo: car.carNo,
          model: car.model,
          rental_amount: calcCharge,
          total_amount: charge,
          depositAmount: depositAmt,
          payment_method: this.paymentMethod,
          discount: effectiveDiscount,
          discountType: this.discountType(),
          settlement_remarks: this.settlementRemarks,
          elapsedDuration: elapsed,
          changeReturned: changeToReturn,
        };

        // Direct Thermal Print Feedback (Non-blocking & Zero Browser Dialog)
        if (res.printStatus?.success) {
          this.showPrintToast(
            'success',
            `✅ ${this.translateService.translate('SETTLEMENT.PRINT_SUCCESS')} (${res.printStatus.latencyMs}ms)`
          );
        } else {
          this.showPrintToast(
            'warning',
            `⚠️ ${this.translateService.translate('SETTLEMENT.PRINT_WARNING')}: ${res.printStatus?.message || res.printStatus?.error || 'Offline'}`,
            6000
          );
        }
      },
      error: (err) => {
        console.error('Error closing rental in PostgreSQL:', err);
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
        this.processing.set(false);
      }
    });
  }
}
