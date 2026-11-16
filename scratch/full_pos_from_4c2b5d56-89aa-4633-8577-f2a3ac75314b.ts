import { Component, signal, OnInit, inject } from '@angular/core';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  host: { class: 'flex-1 flex flex-col overflow-hidden' },
  template: `
      <!-- Statistics & Filters -->
      <section class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
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

        <!-- Start Rental Modal Popup -->
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
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.RATE_TIER' | translate }}</label>
                  <select [(ngModel)]="selectedDuration" (change)="onDurationChange()" class="border border-slate-300 rounded px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option [value]="15">{{ 'POS.DURATION_15' | translate }}</option>
                    <option [value]="30">{{ 'POS.DURATION_30' | translate }}</option>
                    <option [value]="60">{{ 'POS.DURATION_60' | translate }}</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.CUSTOMER_NAME' | translate }}</label>
                  <input type="text" [(ngModel)]="customerName" [placeholder]="'POS.CUSTOMER_NAME_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.MOBILE_NO' | translate }}</label>
                  <input type="text" [(ngModel)]="mobileNo" [placeholder]="'POS.MOBILE_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.RENTAL_DEPOSIT' | translate }}</label>
                  <input type="number" [(ngModel)]="depositAmount" class="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-indigo-600">
                </div>
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                <button (click)="onRentalStart()" [disabled]="processing()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ 'POS.START_RENTAL_BTN' | translate }}
                  <svg *ngIf="!processing()" class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </button>
                <p class="text-center text-[10px] text-slate-400 italic">{{ 'POS.GRACE_PERIOD_NOTE' | translate }}</p>
              </div>
           </div>
        </div>

        <!-- Close Rental Modal Popup -->
        <div *ngIf="isCloseModalOpen && selectedCar()?.status === 'Rented'" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
              <div class="bg-red-500 p-4 flex items-center justify-between text-white shrink-0">
                 <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                 </h2>
                 <button (click)="closeModal()" class="text-white hover:bg-red-600 rounded p-1 transition cursor-pointer">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <div class="p-6 space-y-4 overflow-y-auto">
                 <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{{ 'POS.CUSTOMER_REF' | translate }}</div>
                    <div class="font-bold text-sm text-slate-800">{{ getActiveRental(selectedCar()?.id)?.customer_name || getActiveRental(selectedCar()?.id)?.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }} ({{ 'POS.CAR_NO' | translate }}: {{ selectedCar()?.carNo }})</div>
                 </div>
                 
                 <div class="grid grid-cols-2 gap-3">
                   <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{{ 'POS.STARTED_AT' | translate }}</div>
                      <div class="font-bold text-sm text-slate-800">{{ getRentalStartTime(selectedCar()?.id) | date:'HH:mm' }}</div>
                   </div>
                   <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{{ 'POS.ELAPSED_DURATION' | translate }}</div>
                      <div class="font-bold text-sm text-red-600 font-mono">{{ getRentalDuration(selectedCar()?.id) }}</div>
                   </div>
                 </div>

                 <div class="bg-red-50 rounded-lg p-3 border border-red-100 flex justify-between items-center">
                    <span class="text-xs font-bold text-red-700">{{ 'POS.CALCULATED_CHARGE' | translate }}</span>
                    <span class="font-black text-red-600 text-lg">{{ 'COMMON.KWD' | translate }} {{ calculateRate() | number:'1.3-3' }}</span>
                 </div>

                 <div class="flex flex-col gap-1">
                   <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.DISCOUNT' | translate }}</label>
                   <input type="number" [(ngModel)]="discount" class="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                 </div>

                 <div class="flex flex-col gap-1">
                   <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.PAYMENT_METHOD' | translate }}</label>
                   <div class="flex bg-slate-100 rounded p-1 border border-slate-200">
                     <button (click)="paymentMethod = 'CASH'" [class]="paymentMethod === 'CASH' ? 'flex-1 bg-white shadow-sm text-indigo-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.CASH' | translate }}</button>
                     <button (click)="paymentMethod = 'KNET'" [class]="paymentMethod === 'KNET' ? 'flex-1 bg-white shadow-sm text-indigo-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.KNET' | translate }}</button>
                   </div>
                 </div>

                 <div class="bg-slate-50 rounded-lg p-3 border border-slate-200 flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-600">{{ 'POS.FINAL_CHARGE' | translate }}</span>
                    <span class="font-black text-slate-800 text-md">{{ 'COMMON.KWD' | translate }} {{ finalCharge() | number:'1.3-3' }}</span>
                 </div>

                 <div class="bg-green-50 rounded-lg p-4 flex justify-between items-center border border-green-200 shadow-inner">
                    <span class="font-bold text-green-700 text-sm">{{ 'POS.RETURN_TO_CUSTOMER' | translate }}</span>
                    <span class="font-black text-green-600 text-2xl">{{ 'COMMON.KWD' | translate }} {{ finalChangeToReturn() | number:'1.3-3' }}</span>
                 </div>
              </div>

              <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
                <button (click)="closeModal()" class="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-100 transition text-sm shadow-sm cursor-pointer">
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
                    <h2 class="text-base font-bold tracking-tight">KIDS DRIVE</h2>
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
                 </div>

                 <!-- Receipt Financials -->
                 <div class="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5 text-xs">
                    <div class="flex justify-between">
                       <span class="text-slate-500">{{ 'RECEIPT.SUBTOTAL' | translate }}:</span>
                       <span class="font-mono font-bold">{{ (lastClosedRental.rental_amount || lastClosedRental.rentalAmount || '0.000') }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div *ngIf="lastClosedRental.discount" class="flex justify-between text-green-600">
                       <span>{{ 'RECEIPT.DISCOUNT' | translate }}:</span>
                       <span class="font-mono font-bold">-{{ lastClosedRental.discount }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div class="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                       <span>{{ 'RECEIPT.TOTAL_PAID' | translate }}:</span>
                       <span class="font-mono text-indigo-600">{{ (lastClosedRental.total_amount || lastClosedRental.totalAmount || '0.000') }} {{ 'COMMON.KWD' | translate }}</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-500">
                       <span>{{ 'POS.PAYMENT_METHOD' | translate }}:</span>
                       <span class="font-bold">{{ lastClosedRental.payment_method || lastClosedRental.paymentMethod || 'CASH' }}</span>
                    </div>
                 </div>

                 <!-- Receipt Footer -->
                 <div class="text-center pt-2">
                    <p class="text-xs font-semibold text-slate-700">{{ 'RECEIPT.THANK_YOU' | translate }}</p>
                    <p class="text-[10px] text-slate-400 mt-1">KidsDrive Entertainment LLC</p>
                 </div>
              </div>

              <!-- Modal Buttons -->
              <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                 <button (click)="closeReceiptModal()" class="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                    {{ 'COMMON.CLOSE' | translate }}
                 </button>
                 <button (click)="printReceipt()" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    {{ 'RECEIPT.PRINT_BTN' | translate }}
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
  isReceiptModalOpen = false;
  lastClosedRental: any = null;

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

  closeReceiptModal() {
    this.isReceiptModalOpen = false;
    this.lastClosedRental = null;
  }

  printReceipt() {
    window.print();
  }

  onRentalStart() {
    const car = this.selectedCar();
    if (!car) return;

    this.processing.set(true);

    const defaultCustomer = this.translateService.translate('POS.WALK_IN_CUSTOMER');
    const payload = {
      carId: car.id,
      carNo: car.carNo,
      model: car.model,
      customerName: this.customerName || defaultCustomer,
      customerPhone: this.mobileNo || '',
      durationMinutes: Number(this.selectedDuration) || 15,
      rentalAmount: this.depositAmount,
      totalAmount: this.depositAmount,
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

    const payload = {
      actualEndTime: new Date().toISOString(),
      extraAmount: Math.max(0, this.calculateRate() - Number(r?.rental_amount || 0)),
      totalAmount: this.finalCharge(),
      status: 'COMPLETED'
    };

    this.api.closeRental(rentalId, payload).subscribe({
      next: (closedRental) => {
        this.processing.set(false);
        this.closeModal();
        this.loadData();
        // Show receipt
        this.lastClosedRental = {
          ...r,
          ...closedRental,
          carNo: car.carNo,
          model: car.model,
          total_amount: this.finalCharge(),
          payment_method: this.paymentMethod,
          discount: this.discount
        };
        this.isReceiptModalOpen = true;
      },
      error: (err) => {
        console.error('Error closing rental in PostgreSQL:', err);
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
        this.processing.set(false);
      }
    });
  }
}
