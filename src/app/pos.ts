import { Component, signal, computed, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService, ThermalPaperWidth } from './print.service';
import { PermissionService } from './permission.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  host: { class: 'flex-1 flex flex-col overflow-hidden' },
  template: `
      <!-- Statistics & Filters -->
      <section class="min-h-[3rem] h-auto bg-white border-b border-slate-200 px-3 sm:px-6 py-1.5 sm:py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 relative">
        
        <!-- Floating Direct Print Toast Notification Banner -->
        <div *ngIf="printToast()" class="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[90vw]"
             [ngClass]="printToast()?.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20' : (printToast()?.type === 'warning' ? 'bg-amber-600 text-white border-amber-500 shadow-amber-600/20' : 'bg-red-600 text-white border-red-500 shadow-red-600/20')">
          <span class="truncate">{{ printToast()?.message }}</span>
          <button (click)="printToast.set(null)" class="text-white/80 hover:text-white ml-2 text-sm font-bold cursor-pointer shrink-0">&times;</button>
        </div>

        <div class="flex items-center gap-3 sm:gap-5 lg:gap-8 flex-wrap">
          <div class="flex gap-1.5 sm:gap-2 items-center">
            <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse shrink-0"></div>
            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">{{ 'POS.AVAILABLE' | translate }} <span class="text-slate-900 font-black">{{ availableCount() }}</span></span>
          </div>
          <div class="flex gap-1.5 sm:gap-2 items-center">
            <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full shrink-0"></div>
            <span class="text-xs font-bold text-slate-600 whitespace-nowrap">{{ 'POS.RENTED' | translate }} <span class="text-slate-900 font-black">{{ rentedCount() }}</span></span>
          </div>
          <div class="h-3.5 w-px bg-slate-300 hidden sm:block"></div>
          <span class="text-xs font-bold text-slate-600 whitespace-nowrap">{{ 'POS.FLEET_TOTAL' | translate }} <span class="text-slate-900 font-black">{{ cars().length }}</span></span>
          <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1.5 border border-indigo-100 whitespace-nowrap shrink-0">
            <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> {{ 'POS.LIVE_FLEET' | translate }}
          </span>
          <div class="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-bold shadow-2xs shrink-0">
            <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span class="text-amber-700 text-[10px] sm:text-xs uppercase font-extrabold">{{ 'POS.SALES_DATE' | translate }}:</span>
            <span class="font-mono font-black text-[11px] sm:text-xs text-amber-950">{{ salesDate() }}</span>
            <span *ngIf="currentShift()" class="bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full">
              #{{ currentShift()?.shiftNumber || 1 }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button (click)="loadData()" class="p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer shrink-0" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          <button (click)="filter.set('ALL')" [class]="filter() === 'ALL' ? 'px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-xs cursor-pointer whitespace-nowrap' : 'px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap'">{{ 'POS.ALL_TYPES' | translate }}</button>
          <button (click)="filter.set('SINGLE')" [class]="filter() === 'SINGLE' ? 'px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-xs cursor-pointer whitespace-nowrap' : 'px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap'">{{ 'POS.SINGLE_SEATER_BTN' | translate }}</button>
          <button (click)="filter.set('DOUBLE')" [class]="filter() === 'DOUBLE' ? 'px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 rounded-md shadow-xs cursor-pointer whitespace-nowrap' : 'px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap'">{{ 'POS.DOUBLE_SEATER_BTN' | translate }}</button>
        </div>
      </section>

      <!-- Main Workspace -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Grid of Cars -->
        <div class="flex-1 p-2 sm:p-3 flex flex-col gap-2 sm:gap-3 bg-slate-100 overflow-y-auto">
           
           <div *ngIf="loading()" class="p-8 text-center text-slate-400">
             <div class="inline-flex items-center gap-2">
               <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               <span class="text-xs font-bold">{{ 'POS.LOADING_FLEET' | translate }}</span>
             </div>
           </div>

           <!-- Single Seater Fleet -->
           <div *ngIf="!loading() && (filter() === 'ALL' || filter() === 'SINGLE')">
              <div class="flex items-center justify-between pb-1 border-b border-slate-200 mb-1.5">
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-3.5 bg-indigo-600 rounded-xs"></div>
                  <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">
                    {{ 'POS.SINGLE_FLEET_TITLE' | translate }}
                  </h3>
                </div>
                <span class="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                  {{ displayedCars('SINGLE').length }} {{ 'COMMON.VEHICLES' | translate:{count: displayedCars('SINGLE').length} }}
                </span>
              </div>
              
              <div class="grid grid-cols-[repeat(auto-fill,minmax(92px,108px))] gap-2 sm:gap-2.5">
                 <ng-container *ngFor="let car of displayedCars('SINGLE'); trackBy: trackByCarId">
                    <div class="rounded-xl p-2 flex flex-col justify-between shadow-xs relative cursor-pointer border-2 transition-all duration-150 aspect-square select-none hover:shadow-md"
                         [ngClass]="!isCarRented(car) 
                           ? (selectedCar()?.id === car.id ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-300' : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20') 
                           : (selectedCar()?.id === car.id ? 'bg-red-100 border-red-600 ring-2 ring-red-400' : 'bg-red-50/90 border-red-400 hover:border-red-600')"
                         (click)="handleCarClick(car)">
                       
                       <!-- Top Row: Car # and Model/Ping Dot -->
                       <div class="w-full flex items-center justify-between leading-none">
                         <div class="flex items-center gap-1 min-w-0">
                           <span class="text-[13px] font-black font-mono tracking-tight" [ngClass]="!isCarRented(car) ? 'text-slate-800' : 'text-red-700'">
                             #{{ car.carNo }}
                           </span>
                           <span *ngIf="car.color" class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(car.color)" [title]="car.color"></span>
                         </div>
                         <div class="flex items-center gap-1">
                           <span *ngIf="!isCarRented(car)" class="w-2 h-2 rounded-full bg-emerald-500"></span>
                           <span *ngIf="isCarRented(car)" class="flex h-2 w-2 relative">
                             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                           </span>
                           <span class="text-[8px] font-bold px-1.5 py-0.5 rounded leading-none"
                                 [ngClass]="!isCarRented(car) ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-red-600 text-white font-black'">
                             {{ !isCarRented(car) ? '1S' : ('POS.RENTED_BADGE' | translate) }}
                           </span>
                         </div>
                       </div>
                       
                       <!-- Center Area: Big Icon or Live Duration Box -->
                       <div class="w-full flex-1 flex flex-col items-center justify-center my-0.5">
                         <ng-container *ngIf="!isCarRented(car)">
                           <div class="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                           </div>
                         </ng-container>
                         <ng-container *ngIf="isCarRented(car)">
                           <div class="w-full bg-red-100/90 border border-red-200 rounded-md py-1 px-0.5 text-center shadow-2xs">
                             <span class="text-[11px] font-mono text-red-700 font-black tracking-tight block leading-tight">
                               ⏱️ {{ getRentalDuration(car.id) }}
                             </span>
                           </div>
                         </ng-container>
                       </div>

                       <!-- Bottom Row: State Badge or Seat Indicator -->
                       <div class="w-full flex items-center justify-between border-t border-slate-100 pt-1 leading-none"
                            [ngClass]="isCarRented(car) ? 'border-red-200/60 justify-center' : 'border-slate-100'">
                         <ng-container *ngIf="!isCarRented(car)">
                           <span class="text-[9.5px] font-black text-emerald-600 flex items-center gap-0.5">
                             {{ 'POS.READY' | translate }}
                           </span>
                           <span class="text-[8px] font-semibold text-slate-500">
                             {{ 'POS.SINGLE_BADGE' | translate }}
                           </span>
                         </ng-container>
                         <ng-container *ngIf="isCarRented(car)">
                           <span class="text-[8.5px] font-bold text-red-600 uppercase tracking-wide">
                                {{ 'POS.RENTED' | translate }}
                              </span>
                         </ng-container>
                       </div>
                    </div>
                 </ng-container>
              </div>
           </div>

           <!-- Double Seater Fleet -->
           <div *ngIf="!loading() && (filter() === 'ALL' || filter() === 'DOUBLE')">
              <div class="flex items-center justify-between pb-1 border-b border-slate-200 mb-1.5 mt-2">
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-3.5 bg-indigo-600 rounded-xs"></div>
                  <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">
                    {{ 'POS.DOUBLE_FLEET_TITLE' | translate }}
                  </h3>
                </div>
                <span class="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                  {{ displayedCars('DOUBLE').length }} {{ 'COMMON.VEHICLES' | translate:{count: displayedCars('DOUBLE').length} }}
                </span>
              </div>
              
              <div class="grid grid-cols-[repeat(auto-fill,minmax(92px,108px))] gap-2 sm:gap-2.5">
                 <ng-container *ngFor="let car of displayedCars('DOUBLE'); trackBy: trackByCarId">
                    <div class="rounded-xl p-2 flex flex-col justify-between shadow-xs relative cursor-pointer border-2 transition-all duration-150 aspect-square select-none hover:shadow-md"
                         [ngClass]="!isCarRented(car) 
                           ? (selectedCar()?.id === car.id ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-300' : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20') 
                           : (selectedCar()?.id === car.id ? 'bg-red-100 border-red-600 ring-2 ring-red-400' : 'bg-red-50/90 border-red-400 hover:border-red-600')"
                         (click)="handleCarClick(car)">
                       
                       <!-- Top Row: Car # and Model/Ping Dot -->
                       <div class="w-full flex items-center justify-between leading-none">
                         <div class="flex items-center gap-1 min-w-0">
                           <span class="text-[13px] font-black font-mono tracking-tight" [ngClass]="!isCarRented(car) ? 'text-slate-800' : 'text-red-700'">
                             #{{ car.carNo }}
                           </span>
                           <span *ngIf="car.color" class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(car.color)" [title]="car.color"></span>
                         </div>
                         <div class="flex items-center gap-1">
                           <span *ngIf="!isCarRented(car)" class="w-2 h-2 rounded-full bg-emerald-500"></span>
                           <span *ngIf="isCarRented(car)" class="flex h-2 w-2 relative">
                             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span class="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                           </span>
                           <span class="text-[8px] font-bold px-1.5 py-0.5 rounded leading-none"
                                 [ngClass]="!isCarRented(car) ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-red-600 text-white font-black'">
                             {{ !isCarRented(car) ? '2S' : ('POS.RENTED_BADGE' | translate) }}
                           </span>
                         </div>
                       </div>
                       
                       <!-- Center Area: Big Icon or Live Duration Box -->
                       <div class="w-full flex-1 flex flex-col items-center justify-center my-0.5">
                         <ng-container *ngIf="!isCarRented(car)">
                           <div class="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shadow-2xs">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                           </div>
                         </ng-container>
                         <ng-container *ngIf="isCarRented(car)">
                           <div class="w-full bg-red-100/90 border border-red-200 rounded-md py-1 px-0.5 text-center shadow-2xs">
                             <span class="text-[11px] font-mono text-red-700 font-black tracking-tight block leading-tight">
                               ⏱️ {{ getRentalDuration(car.id) }}
                             </span>
                           </div>
                         </ng-container>
                       </div>

                       <!-- Bottom Row: State Badge or Seat Indicator -->
                       <div class="w-full flex items-center justify-between border-t border-slate-100 pt-1 leading-none"
                            [ngClass]="isCarRented(car) ? 'border-red-200/60 justify-center' : 'border-slate-100'">
                         <ng-container *ngIf="!isCarRented(car)">
                           <span class="text-[9.5px] font-black text-emerald-600 flex items-center gap-0.5">
                             {{ 'POS.READY' | translate }}
                           </span>
                           <span class="text-[8px] font-semibold text-slate-500">
                             {{ 'POS.DOUBLE_BADGE' | translate }}
                           </span>
                         </ng-container>
                         <ng-container *ngIf="isCarRented(car)">
                           <span class="text-[8.5px] font-bold text-red-600 uppercase tracking-wide">
                                {{ 'POS.RENTED' | translate }}
                              </span>
                         </ng-container>
                       </div>
                    </div>
                 </ng-container>
              </div>
           </div>
           
        </div>

        <!-- Start Rental Modal Popup (Tier Removed, Default 10 KD Deposit, Editable to 0 KD) -->
        <div *ngIf="isStartModalOpen() && selectedCar() && !isCarRented(selectedCar())" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div class="bg-indigo-600 p-3.5 sm:p-4 flex items-center justify-between text-white shrink-0">
                 <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                   {{ 'POS.NEW_RENTAL_TITLE' | translate }}
                 </h2>
                 <button (click)="closeModal()" class="text-white hover:bg-indigo-700 rounded p-1 transition cursor-pointer">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              
              <div class="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
                <!-- Active Sales Date & Shift Banner While Punching -->
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs">
                  <div class="flex items-center gap-2">
                    <span class="text-amber-800 font-bold flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      {{ 'POS.SALES_DATE' | translate }}:
                    </span>
                    <span class="font-mono font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded">{{ salesDate() }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 font-bold">
                    <span class="text-slate-500 text-[10px] uppercase">{{ 'SHIFT.ACTIVE_SHIFT' | translate }}:</span>
                    <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      Shift #{{ currentShift()?.shiftNumber || 1 }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">{{ 'POS.CAR_NO' | translate }}</label>
                    <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                      <span *ngIf="selectedCar()?.color" class="w-3 h-3 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(selectedCar()?.color)"></span>
                      <span class="text-xs font-mono font-bold text-slate-800">#{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }} <span *ngIf="selectedCar()?.color">({{ selectedCar()?.color }})</span></span>
                      <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Available</span>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-slate-500">{{ 'POS.CURR_TIME' | translate }}</label>
                    <input type="text" [value]="currentTime | date:'HH:mm:ss'" readonly class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono font-bold">
                  </div>
                </div>

                <!-- 1. Customer Phone FIRST with Automatic Customer Lookup & Selection (Phone First) -->
                <div class="flex flex-col gap-1 relative">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <span>📱 {{ 'POS.MOBILE_NO' | translate }}</span>
                      <span class="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{{ 'POS.AUTO_SEARCH_HINT' | translate }}</span>
                    </label>
                    <button
                      *ngIf="mobileNo || matchedCustomer()"
                      type="button"
                      (click)="clearCustomerSelection()"
                      class="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer">
                      ✕ {{ 'COMMON.CLEAR' | translate }}
                    </button>
                  </div>
                  <div class="relative">
                    <input
                      type="text"
                      [(ngModel)]="mobileNo"
                      (ngModelChange)="onPhoneChange($event)"
                      (focus)="onPhoneFocus()"
                      (blur)="onPhoneBlur()"
                      autocomplete="off"
                      [placeholder]="'POS.MOBILE_PLACEHOLDER' | translate"
                      class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <span *ngIf="customerLookupLoading()" class="absolute right-3 top-2.5 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span *ngIf="!customerLookupLoading() && matchedCustomer()" class="absolute right-2.5 top-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ {{ 'POS.EXISTING_CUSTOMER' | translate }} ({{ matchedCustomer()?.total_visits || 1 }})
                    </span>
                    <span *ngIf="!customerLookupLoading() && !matchedCustomer() && (mobileNo || '').trim().length >= 4" class="absolute right-2.5 top-2 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      + {{ 'POS.NEW_CUSTOMER_BADGE' | translate }}
                    </span>
                  </div>

                  <!-- Customer Suggestions Dropdown (Phone Number First -> Customer Name) -->
                  <div
                    *ngIf="showCustomerDropdown() && filteredCustomerSuggestions().length > 0"
                    class="absolute left-0 right-0 top-full mt-1 bg-white border border-indigo-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    <div class="px-2.5 py-1 bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>{{ 'POS.MOBILE_NO' | translate }} — {{ 'POS.CUSTOMER_NAME' | translate }}</span>
                      <span>{{ 'POS.VISITS' | translate }}</span>
                    </div>
                    <button
                      type="button"
                      *ngFor="let cust of filteredCustomerSuggestions()"
                      (mousedown)="selectCustomer(cust)"
                      class="w-full text-left px-3 py-2 hover:bg-indigo-50 transition flex items-center justify-between gap-2 cursor-pointer">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
                          {{ cust.phone }}
                        </span>
                        <span class="text-xs font-bold text-slate-800 truncate">
                          {{ cust.name }}
                        </span>
                      </div>
                      <span class="text-[10px] font-semibold text-slate-500 shrink-0">
                        {{ cust.total_visits || 1 }} {{ 'POS.VISITS' | translate }}
                      </span>
                    </button>
                  </div>
                </div>

                <!-- 2. Customer Name SECOND (Auto-filled from Phone to prevent junk entries) -->
                <div class="flex flex-col gap-1">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.CUSTOMER_NAME' | translate }}</label>
                    <button
                      *ngIf="matchedCustomer()"
                      type="button"
                      (click)="toggleEditMatchedCustomerName()"
                      class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      {{ isEditingMatchedCustomerName() ? ('COMMON.LOCK' | translate) : ('COMMON.EDIT' | translate) }}
                    </button>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="customerName"
                    [readonly]="!!matchedCustomer() && !isEditingMatchedCustomerName()"
                    [placeholder]="'POS.CUSTOMER_NAME_PLACEHOLDER' | translate"
                    [ngClass]="(!!matchedCustomer() && !isEditingMatchedCustomerName()) ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold cursor-not-allowed' : 'bg-white border-slate-300 text-slate-800'"
                    class="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <span *ngIf="matchedCustomer() && !isEditingMatchedCustomerName()" class="text-[10px] text-emerald-700 font-medium">
                    {{ 'POS.AUTO_FILLED_FROM_PHONE' | translate }}
                  </span>
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
                    • {{ 'POS.FIRST_HOUR_BASE' | translate }}: <span class="font-mono font-bold text-slate-800">{{ getCarBaseRate(selectedCar()) | number:'1.3-3' }} KD</span><br>
                    • {{ 'POS.EXTRA_HOURS_CHARGE' | translate }}: <span class="font-mono font-bold text-slate-800">{{ (getCarBaseRate(selectedCar()) * 0.5) | number:'1.3-3' }} KD</span> / hour
                  </div>
                </div>

                <!-- Customer Bill Copy Toggle (Configuration Based) -->
                <div class="flex items-center justify-between bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 transition hover:bg-indigo-50">
                  <label class="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="giveBillCopyOnPunch" 
                      (change)="onBillCopyToggleChange()" 
                      class="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer">
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🧾</span>
                        <span>{{ 'POS.PRINT_BILL_COPY' | translate }}</span>
                      </span>
                      <span class="text-[10px] text-slate-500">{{ 'POS.PRINT_BILL_COPY_SUBTITLE' | translate }}</span>
                    </div>
                  </label>
                  <button 
                    type="button" 
                    (click)="toggleBillCopyPref()" 
                    class="text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer transition shadow-xs" 
                    [ngClass]="giveBillCopyOnPunch ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'">
                    {{ (giveBillCopyOnPunch ? 'COMMON.YES' : 'COMMON.NO') | translate }}
                  </button>
                </div>
              </div>

              <div class="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 shrink-0">
                <button (click)="onRentalStart()" [disabled]="processing()" class="w-full bg-indigo-600 text-white font-bold py-2.5 sm:py-3 rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ 'POS.START_RENTAL_BTN' | translate }}
                  <svg *ngIf="!processing()" class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </button>
              </div>
           </div>
        </div>

        <!-- Close Rental & Settlement Modal Popup -->
        <div *ngIf="isCloseModalOpen() && selectedCar()" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh]">
              <!-- Modal Header -->
              <div class="bg-red-600 p-3.5 sm:p-4 flex items-center justify-between text-white shrink-0">
                 <div class="flex items-center gap-2">
                   <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black">🏁</div>
                   <div>
                     <h2 class="text-sm font-bold uppercase tracking-wider">
                       {{ 'POS.CLOSE_RENTAL_TITLE' | translate }}
                     </h2>
                     <p class="text-[11px] text-white/80 font-mono">{{ selectedCar()?.carNo }} • {{ selectedCar()?.model }}</p>
                   </div>
                 </div>
                  <div class="flex items-center gap-2">
                    <button (click)="closeModal()" class="text-white/80 hover:text-white hover:bg-red-700 rounded p-1 transition cursor-pointer">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
              </div>
              
              <div class="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0">
                 
                 <!-- Active Sales Date & Shift Strip in Settlement -->
                 <div class="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs mb-3">
                   <span class="text-amber-800 font-bold flex items-center gap-1.5">
                     <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                     {{ 'POS.SALES_DATE' | translate }}: <strong class="font-mono text-amber-950 font-black ml-1">{{ salesDate() }}</strong>
                   </span>
                   <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                     Shift #{{ currentShift()?.shiftNumber || 1 }}
                   </span>
                 </div>

                 <!-- Customer Info Strip (Customer Phone First) -->
                 <div class="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{{ 'POS.MOBILE_NO' | translate }}</span>
                      <span class="font-mono font-bold text-indigo-700">{{ getActiveRental(selectedCar())?.customer_phone || getActiveRental(selectedCar())?.customerPhone || '—' }}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{{ 'POS.CUSTOMER_NAME' | translate }}</span>
                      <span class="font-bold text-slate-800">{{ getActiveRental(selectedCar())?.customer_name || getActiveRental(selectedCar())?.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
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
                       {{ getRentalDuration(selectedCar()) }}
                     </span>
                   </div>
                   
                   <div class="grid grid-cols-3 gap-2 pt-1 text-center">
                     <div class="bg-white p-2 rounded-lg border border-indigo-100">
                       <span class="text-[9px] font-bold text-slate-400 uppercase block">{{ 'POS.STARTED_AT' | translate }}</span>
                       <span class="font-mono font-bold text-xs text-slate-800">{{ getRentalStartTime(selectedCar()) | date:'HH:mm:ss' }}</span>
                     </div>
                     <div class="bg-white p-2 rounded-lg border border-indigo-100">
                       <span class="text-[9px] font-bold text-slate-400 uppercase block">{{ 'POS.SETTLE_TIME' | translate }}</span>
                       <span class="font-mono font-bold text-xs text-slate-800">{{ currentTime | date:'HH:mm:ss' }}</span>
                     </div>
                     <div class="bg-white p-2 rounded-lg border border-indigo-100">
                       <span class="text-[9px] font-bold text-indigo-600 uppercase block">{{ 'POS.ELAPSED_DURATION' | translate }}</span>
                       <span class="font-bold text-xs text-indigo-700">{{ getFormattedTotalDuration(selectedCar()) }}</span>
                     </div>
                   </div>
                 </div>

                 <!-- 2. Rate & Charges Breakdown Card -->
                 <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                   <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                     <span class="font-bold text-slate-700">{{ 'POS.CALCULATED_CHARGE' | translate }}</span>
                     <span class="font-mono font-black text-slate-900 text-sm">{{ 'COMMON.KWD' | translate }} {{ calculateRate() | number:'1.3-3' }}</span>
                   </div>

                    <!-- Detailed Pricing Rule Breakdown (Database Driven) -->
                    <div class="space-y-1 text-xs pt-1">
                      <div class="flex justify-between text-slate-500 text-[11px]">
                        <span>• {{ 'POS.FIRST_HOUR_BASE' | translate }}:</span>
                        <span class="font-mono font-bold" [ngClass]="getRateBreakdown().isWithinGrace ? 'text-emerald-600' : 'text-slate-700'">
                          {{ getRateBreakdown().isWithinGrace ? ('POS.GRACE_PERIOD_FREE' | translate) : ((getRateBreakdown().base | number:'1.3-3') + ' KD') }}
                        </span>
                      </div>
                      <div *ngIf="getRateBreakdown().extraHalfHours > 0" class="flex justify-between text-slate-500 text-[11px]">
                        <span>• {{ 'POS.ADDITIONAL_HALF_HOURS' | translate }} ({{ getRateBreakdown().extraHalfHours }} × 30m @ {{ getRateBreakdown().halfHourRate | number:'1.3-3' }} KD):</span>
                        <span class="font-mono font-bold text-slate-800">+ {{ getRateBreakdown().extra | number:'1.3-3' }} KD</span>
                      </div>
                      <div class="flex justify-between text-slate-500 text-[11px]">
                        <span>• {{ 'POS.INITIAL_DEPOSIT_PAID' | translate }}:</span>
                        <span class="font-mono font-bold text-indigo-600">{{ getDepositPaid() | number:'1.3-3' }} KD</span>
                      </div>
                    </div>
                  </div>
                  <!-- 3. Discount Master Dropdown (Preserve Disability & Add Custom Discount with Reason) -->
                  <div class="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                    <div class="flex items-center justify-between">
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'POS.DISCOUNT_TYPE_LABEL' | translate }}</label>
                      <span *ngIf="calculateEffectiveDiscount() > 0" class="text-[11px] font-bold text-emerald-600">
                        - {{ calculateEffectiveDiscount() | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}
                      </span>
                    </div>

                    <!-- Master Dropdown Selector (DO NOT REMOVE THE DISCOUNT DROPDOWN) -->
                    <div>
                      <select 
                        [(ngModel)]="selectedDiscountMaster" 
                        (ngModelChange)="onDiscountMasterChange($event)"
                        class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                        <option value="NONE">{{ 'POS.NO_DISCOUNT' | translate }} (0%)</option>
                        <option value="DISABILITY_50">♿ {{ 'POS.DISCOUNT_DISABILITY_50' | translate }} (50%)</option>
                        <option value="CUSTOM">🏷️ {{ 'POS.CUSTOM_DISCOUNT' | translate }}</option>
                      </select>
                    </div>

                    <!-- Custom Discount Inputs & Mandatory Reason for Accountability -->
                    <div *ngIf="selectedDiscountMaster === 'CUSTOM'" class="space-y-2 pt-2 border-t border-slate-100">
                      <div class="flex gap-2 items-center">
                        <div class="flex bg-slate-100 rounded p-0.5 border border-slate-200 text-xs">
                          <button type="button" (click)="customDiscountMode.set('PERCENT'); updateSplitAmounts()" [class]="customDiscountMode() === 'PERCENT' ? 'bg-white px-2.5 py-1 rounded font-bold shadow-xs text-indigo-600' : 'px-2.5 py-1 text-slate-600 cursor-pointer'">%</button>
                          <button type="button" (click)="customDiscountMode.set('AMOUNT'); updateSplitAmounts()" [class]="customDiscountMode() === 'AMOUNT' ? 'bg-white px-2.5 py-1 rounded font-bold shadow-xs text-indigo-600' : 'px-2.5 py-1 text-slate-600 cursor-pointer'">KD</button>
                        </div>
                        <input 
                          type="number" 
                          [ngModel]="customDiscountValue()" 
                          (ngModelChange)="customDiscountValue.set($event); updateSplitAmounts()"
                          placeholder="Discount value" 
                          class="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          min="0" />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          [(ngModel)]="discountReason" 
                          placeholder="Reason for discount (Required for audit & monitoring) *" 
                          class="w-full border border-amber-300 bg-amber-50/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium" 
                          required />
                      </div>
                    </div>
                  </div>
                  <!-- 4. Payment Method (Cash, KNET, Split Payment) -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'POS.PAYMENT_METHOD' | translate }}</label>
                    <div class="flex bg-slate-100 rounded p-1 border border-slate-200 gap-1">
                      <button type="button" (click)="onPaymentMethodChange('CASH')" [class]="paymentMethod === 'CASH' ? 'flex-1 bg-white shadow-xs text-indigo-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.CASH' | translate }}</button>
                      <button type="button" (click)="onPaymentMethodChange('KNET')" [class]="paymentMethod === 'KNET' ? 'flex-1 bg-white shadow-xs text-indigo-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.KNET' | translate }}</button>
                      <button type="button" (click)="onPaymentMethodChange('SPLIT')" [class]="paymentMethod === 'SPLIT' ? 'flex-1 bg-white shadow-xs text-emerald-600 rounded py-1.5 text-xs font-bold cursor-pointer' : 'flex-1 text-slate-500 text-xs font-bold hover:text-slate-700 py-1.5 cursor-pointer'">{{ 'POS.SPLIT_PAYMENT' | translate }}</button>
                    </div>

                    <!-- Split Payment breakdown inputs -->
                    <div *ngIf="paymentMethod === 'SPLIT'" class="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5 space-y-2 text-xs mt-1">
                      <div class="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
                        <span>{{ 'POS.SPLIT_BREAKDOWN' | translate }}</span>
                        <span>Total: {{ finalCharge() | number:'1.3-3' }} KD</span>
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class="text-[10px] font-semibold text-slate-600 block mb-0.5">{{ 'POS.CASH' | translate }} (KD)</label>
                          <input 
                            type="number" 
                            step="0.050" 
                            [ngModel]="splitCashAmount()" 
                            (ngModelChange)="onSplitCashChange($event)"
                            class="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-xs focus:ring-1 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label class="text-[10px] font-semibold text-slate-600 block mb-0.5">{{ 'POS.KNET' | translate }} (KD)</label>
                          <input 
                            type="number" 
                            step="0.050" 
                            [ngModel]="splitKnetAmount()" 
                            (ngModelChange)="onSplitKnetChange($event)"
                            class="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-xs focus:ring-1 focus:ring-emerald-500" />
                        </div>
                      </div>
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
                <button type="button" (click)="closeModal()" class="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-100 transition text-sm shadow-xs cursor-pointer">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
                <button type="button" (click)="onRentalClose()" [disabled]="processing()" class="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {{ 'POS.CONFIRM_CLOSE_BTN' | translate }}
                </button>
              </div>
           </div>
        </div>

        <!-- Receipt Modal Popup -->
        <div *ngIf="isReceiptModalOpen() && lastClosedRental()" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
              <div id="printable-receipt" class="p-6 bg-white flex flex-col gap-4 text-slate-800">
                 <!-- Receipt Header -->
                 <div class="text-center border-b border-dashed border-slate-300 pb-4">
                    <div class="w-10 h-10 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center mx-auto mb-2 text-lg">K</div>
                    <h2 class="text-base font-bold tracking-tight">Kiddie Kruzzer</h2>
                    <p class="text-xs text-slate-500 font-medium">{{ 'RECEIPT.TITLE' | translate }}</p>
                 </div>

                  <!-- Receipt Meta (Time Details: Start Time, End Time, Total Usage Duration) -->
                  <div class="space-y-1.5 text-xs">
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'RECEIPT.INVOICE_NO' | translate }}:</span>
                        <span class="font-mono font-bold">{{ lastClosedRental()?.invoice_no || lastClosedRental()?.invoiceNo || 'INV-000000' }}</span>
                     </div>
                     <div class="flex justify-between" *ngIf="lastClosedRental()?.customer_phone || lastClosedRental()?.customerPhone">
                        <span class="text-slate-500">{{ 'POS.MOBILE_NO' | translate }}:</span>
                        <span class="font-mono font-bold">{{ lastClosedRental()?.customer_phone || lastClosedRental()?.customerPhone }}</span>
                     </div>
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'POS.CUSTOMER_NAME' | translate }}:</span>
                        <span class="font-bold">{{ lastClosedRental()?.customer_name || lastClosedRental()?.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
                     </div>
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'RECEIPT.CAR' | translate }}:</span>
                        <span class="font-bold">{{ lastClosedRental()?.car_no || lastClosedRental()?.carNo }} ({{ lastClosedRental()?.model }})</span>
                     </div>
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'POS.START_TIME' | translate }}:</span>
                        <span class="font-mono font-bold">{{ (lastClosedRental()?.start_time || lastClosedRental()?.startTime) | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                     </div>
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'POS.END_TIME' | translate }}:</span>
                        <span class="font-mono font-bold">{{ (lastClosedRental()?.actual_end_time || lastClosedRental()?.actualEndTime || currentTime) | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                     </div>
                     <div class="flex justify-between bg-indigo-50/70 p-1.5 rounded border border-indigo-100">
                        <span class="text-indigo-900 font-bold">{{ 'POS.TOTAL_USAGE_DURATION' | translate }}:</span>
                        <span class="font-mono font-black text-indigo-700">{{ lastClosedRental()?.elapsedDuration || lastClosedRental()?.elapsed_duration || getRentalDuration(lastClosedRental()?.car_id || lastClosedRental()?.carId) }}</span>
                     </div>
                  </div>
                  <!-- Receipt Financials (With Split Payment Breakdown & Discount Reason) -->
                  <div class="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5 text-xs">
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'POS.DEPOSIT_AMOUNT' | translate }}:</span>
                        <span class="font-mono font-bold">{{ (lastClosedRental()?.depositAmount || lastClosedRental()?.deposit_amount || lastClosedRental()?.rental_amount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                     </div>
                     <div class="flex justify-between">
                        <span class="text-slate-500">{{ 'POS.CALCULATED_CHARGE' | translate }}:</span>
                        <span class="font-mono font-bold">{{ (lastClosedRental()?.rental_amount || lastClosedRental()?.rentalAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                     </div>
                     <div *ngIf="lastClosedRental()?.discount" class="flex justify-between text-green-600">
                        <span>{{ 'RECEIPT.DISCOUNT' | translate }} <span *ngIf="lastClosedRental()?.discountType">({{ lastClosedRental()?.discountType }})</span>:</span>
                        <span class="font-mono font-bold">-{{ lastClosedRental()?.discount | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                     </div>
                     <div *ngIf="lastClosedRental()?.discount_reason || lastClosedRental()?.discountReason" class="text-[10px] text-emerald-700 italic pl-2">
                        Reason: {{ lastClosedRental()?.discount_reason || lastClosedRental()?.discountReason }}
                     </div>
                     <div class="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                        <span>{{ 'RECEIPT.TOTAL_PAID' | translate }}:</span>
                        <span class="font-mono text-indigo-600">{{ (lastClosedRental()?.total_amount || lastClosedRental()?.totalAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                     </div>
                     <div *ngIf="lastClosedRental()?.changeReturned !== undefined && lastClosedRental()?.changeReturned > 0" class="flex justify-between text-emerald-700 font-bold">
                        <span>{{ 'POS.RETURN_TO_CUSTOMER' | translate }}:</span>
                        <span class="font-mono">{{ lastClosedRental()?.changeReturned | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
                     </div>
                     <div class="flex justify-between text-[11px] text-slate-500">
                        <span>{{ 'POS.PAYMENT_METHOD' | translate }}:</span>
                        <span class="font-bold">{{ lastClosedRental()?.payment_method || lastClosedRental()?.paymentMethod || 'CASH' }}</span>
                     </div>
                     <!-- Split Payment Breakdown Display -->
                     <div *ngIf="lastClosedRental()?.payment_method === 'SPLIT' || (lastClosedRental()?.cash_amount > 0 && lastClosedRental()?.knet_amount > 0)" class="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5 text-[10px]">
                        <div class="flex justify-between text-slate-600">
                           <span>• {{ 'POS.CASH' | translate }}:</span>
                           <span class="font-mono font-bold">{{ (lastClosedRental()?.cash_amount || 0) | number:'1.3-3' }} KD</span>
                        </div>
                        <div class="flex justify-between text-slate-600">
                           <span>• {{ 'POS.KNET' | translate }}:</span>
                           <span class="font-mono font-bold">{{ (lastClosedRental()?.knet_amount || 0) | number:'1.3-3' }} KD</span>
                        </div>
                     </div>
                     <div *ngIf="lastClosedRental()?.settlement_remarks || lastClosedRental()?.settlementRemarks" class="pt-1 text-[11px] text-slate-600 border-t border-slate-100">
                        <span class="font-bold">{{ 'POS.REMARKS' | translate }}:</span>
                        <span>{{ lastClosedRental()?.settlement_remarks || lastClosedRental()?.settlementRemarks }}</span>
                     </div>
                  </div>

                  <!-- Receipt Footer: Rate Tariff (Requirement 9) -->
                  <div class="pt-2 text-center space-y-2">
                     <div class="bg-slate-50 border border-slate-200 rounded p-2 text-left font-mono text-[9px] text-slate-600 leading-tight">
                        <div class="font-bold text-[10px] text-slate-800 text-center mb-1">Rate Tariff</div>
                        <div class="flex justify-between"><span>First Hour – Single Car:</span><span class="font-bold">KWD 1.000</span></div>
                        <div class="flex justify-between"><span>First Hour – Double Car:</span><span class="font-bold">KWD 2.000</span></div>
                        <div class="flex justify-between"><span>Additional Half-Hour – Single:</span><span class="font-bold">KWD 0.500</span></div>
                        <div class="flex justify-between"><span>Additional Half-Hour – Double:</span><span class="font-bold">KWD 1.000</span></div>
                     </div>
                     <p class="text-xs font-semibold text-slate-700">{{ 'RECEIPT.THANK_YOU' | translate }}</p>
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
export class PosComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);
  private printService = inject(PrintService);
  public perm = inject(PermissionService);
  private cdr = inject(ChangeDetectorRef);
  
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
  giveBillCopyOnPunch = true; // Configuration based: Whether to give/print bill copy to customer while punching

  // Customer Master & Phone Auto-Lookup State
  customers = signal<any[]>([]);
  filteredCustomerSuggestions = signal<any[]>([]);
  matchedCustomer = signal<any | null>(null);
  isEditingMatchedCustomerName = signal<boolean>(false);
  showCustomerDropdown = signal<boolean>(false);
  customerLookupLoading = signal<boolean>(false);
  private phoneSearchTimeout: any = null;

  // Settlement Form State (Requirements 6, 8, 10)
  paymentMethod: 'CASH' | 'KNET' | 'SPLIT' = 'CASH';
  splitCashAmount = signal<number>(0);
  splitKnetAmount = signal<number>(0);

  selectedDiscountMaster: 'NONE' | 'DISABILITY_50' | 'CUSTOM' = 'NONE';
  customDiscountMode = signal<'PERCENT' | 'AMOUNT'>('PERCENT');
  customDiscountValue = signal<number>(0);
  discountReason = '';
  settlementRemarks = '';

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

  printToast = signal<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  salesDate = signal<string>(localStorage.getItem('salesDate') || '');
  currentShift = signal<any>(null);

  isCloseModalOpen = signal(false);
  isStartModalOpen = signal(false);
  isReceiptModalOpen = signal(false);
  lastClosedRental = signal<any>(null);
  private pollIntervalId: any = null;

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
    this.initBillCopyConfig();
    this.loadSalesDateAndShift();
    this.loadData();
    // Continuous live background sync (every 6s) - ensures 100% accurate fleet in production
    this.pollIntervalId = setInterval(() => {
      if (!this.isStartModalOpen() && !this.isCloseModalOpen()) {
        this.loadData(true);
      }
    }, 6000);
  }

  loadSalesDateAndShift() {
    this.api.getSalesDate().subscribe({
      next: (res) => {
        if (res?.salesDate) {
          this.salesDate.set(res.salesDate);
          localStorage.setItem('salesDate', res.salesDate);
        }
      },
      error: () => {}
    });

    const rawUser = localStorage.getItem('currentUser');
    let u: any = null;
    if (rawUser) { try { u = JSON.parse(rawUser); } catch(e) {} }

    this.api.getCurrentShift({
      userId: u?.id,
      username: u?.username,
      cashier: u?.employeeName || u?.username,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1',
    }).subscribe({
      next: (s) => {
        if (s) {
          this.currentShift.set(s);
          if (s.businessDate) {
            this.salesDate.set(s.businessDate);
            localStorage.setItem('salesDate', s.businessDate);
          }
        }
      },
      error: () => {}
    });
  }

  ngOnDestroy() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  initBillCopyConfig() {
    const saved = localStorage.getItem('kiddie_give_bill_copy');
    if (saved !== null) {
      this.giveBillCopyOnPunch = saved === 'true';
    } else {
      // Query default printer config from server to initialize default toggle
      this.api.getPrinters().subscribe({
        next: (printers) => {
          if (printers && printers.length > 0) {
            const defPrinter = printers.find((p: any) => p.is_default || p.isDefault) || printers[0];
            if (defPrinter && defPrinter.print_on_start !== undefined) {
              this.giveBillCopyOnPunch = Boolean(defPrinter.print_on_start);
            }
          }
        },
        error: () => {}
      });
    }
  }

  toggleBillCopyPref() {
    this.giveBillCopyOnPunch = !this.giveBillCopyOnPunch;
    this.onBillCopyToggleChange();
  }

  onBillCopyToggleChange() {
    localStorage.setItem('kiddie_give_bill_copy', String(this.giveBillCopyOnPunch));
  }

  trackByCarId(_index: number, car: any): string {
    return car?.id || car?.carNo || _index;
  }

  normalizeRental(r: any): any {
    if (!r) return null;
    const carId = String(r.carId || r.car_id || '');
    const carNo = String(r.carNo || r.car_no || '');
    const customerName = r.customerName || r.customer_name || 'Walk-in Customer';
    const customerPhone = r.customerPhone || r.customer_phone || '';
    const startTime = r.startTime || r.start_time || new Date().toISOString();
    const depositAmount = Number(r.depositAmount ?? r.deposit_amount ?? r.rentalAmount ?? r.rental_amount ?? 10);
    const rentalAmount = Number(r.rentalAmount ?? r.rental_amount ?? depositAmount);
    const totalAmount = Number(r.totalAmount ?? r.total_amount ?? depositAmount);

    return {
      ...r,
      carId,
      car_id: carId,
      carNo,
      car_no: carNo,
      customerName,
      customer_name: customerName,
      customerPhone,
      customer_phone: customerPhone,
      startTime,
      start_time: startTime,
      depositAmount,
      deposit_amount: depositAmount,
      rentalAmount,
      rental_amount: rentalAmount,
      totalAmount,
      total_amount: totalAmount,
      status: r.status || 'ACTIVE'
    };
  }

  loadData(silent = false) {
    if (!silent && this.cars().length === 0) {
      this.loading.set(true);
    }

    forkJoin({
      cars: this.api.getCars(),
      rentals: this.api.getRentals('ACTIVE')
    }).subscribe({
      next: ({ cars, rentals }) => {
        const normalizedRentals = (rentals || []).map(r => this.normalizeRental(r));
        const activeIds = new Set(normalizedRentals.map(r => String(r.carId || r.car_id || '')));
        const activeNos = new Set(normalizedRentals.map(r => String(r.carNo || r.car_no || '')));
        const activeCleanNums = new Set(normalizedRentals.map(r => String(r.carNo || r.car_no || r.carId || r.car_id || '').replace(/\D/g, '')).filter(Boolean));

        const sortedCars = (cars || []).map(c => {
          const cId = String(c.id || '');
          const cNo = String(c.carNo || c.car_no || '');
          const cClean = cNo.replace(/\D/g, '') || cId.replace(/\D/g, '');
          const isRented = c.status === 'Rented' || activeIds.has(cId) || activeNos.has(cNo) || (cClean && activeCleanNums.has(cClean));
          return {
            ...c,
            status: isRented ? 'Rented' : 'Available'
          };
        }).sort((a, b) => {
          const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
        });

        // Merge any pending optimistic rentals
        const optimistic = this.rentals().filter(r => String(r.id).startsWith('opt_'));
        const mergedRentals = [
          ...optimistic.filter(opt => !normalizedRentals.some(nr => nr.carId === opt.carId || nr.carNo === opt.carNo)),
          ...normalizedRentals
        ];

        this.rentals.set(mergedRentals);
        this.cars.set(sortedCars);
        this.updateStats();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading fleet data:', err);
        this.api.getCars().subscribe({
          next: (cars) => {
            if (cars && cars.length > 0) {
              const sorted = cars.slice().sort((a, b) => {
                const numA = parseInt(String(a.carNo || '0').replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(String(b.carNo || '0').replace(/\D/g, ''), 10) || 0;
                if (numA !== numB) return numA - numB;
                return String(a.carNo || '').localeCompare(String(b.carNo || ''));
              });
              this.cars.set(sorted);
              this.updateStats();
            }
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      }
    });

    if (this.models().length === 0) {
      this.api.getCarModels().subscribe({
        next: (models) => this.models.set(models || [])
      });
    }

    this.api.getRates().subscribe({
      next: (rates) => this.rates.set(rates || [])
    });

    this.api.getCustomers().subscribe({
      next: (custs) => this.customers.set(custs || []),
      error: () => {}
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
  }


  /**
   * Cross-references active rentals with cars to guarantee 100% consistent state
   */
  syncFleetStatuses() {
    const activeList = this.rentals().filter(r => r.status === 'ACTIVE' || !r.status);
    const activeCarIds = new Set(activeList.map(r => String(r.carId || r.car_id || '')));
    const activeCarNos = new Set(activeList.map(r => String(r.carNo || r.car_no || '')));
    const activeCleanNums = new Set(activeList.map(r => String(r.carNo || r.car_no || r.carId || r.car_id || '').replace(/\D/g, '')).filter(Boolean));

    const currentCars = this.cars();
    let hasChanged = false;
    const updated = currentCars.map(c => {
      const cId = String(c.id || '');
      const cNo = String(c.carNo || c.car_no || '');
      const cClean = cNo.replace(/\D/g, '') || cId.replace(/\D/g, '');
      const isRented = activeCarIds.has(cId) || activeCarNos.has(cNo) || (cClean && activeCleanNums.has(cClean));
      const targetStatus = isRented ? 'Rented' : (c.status === 'Rented' && activeList.length > 0 ? 'Available' : (c.status || 'Available'));
      if (c.status !== targetStatus) {
        hasChanged = true;
        return { ...c, status: targetStatus };
      }
      return c;
    });

    if (hasChanged) {
      this.cars.set(updated);
    }
    this.updateStats();
  }

  updateStats() {
    const all = this.cars();
    this.availableCount.set(all.filter(c => !this.isCarRented(c)).length);
    this.rentedCount.set(all.filter(c => this.isCarRented(c)).length);
  }

  displayedCars(type: string) {
    return this.cars()
      .filter(c => {
        const isSingle = (c.model || '').toLowerCase().includes('single');
        if (type === 'SINGLE') return isSingle;
        if (type === 'DOUBLE') return !isSingle;
        return true;
      })
      .sort((a, b) => {
        const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\D/g, ''), 10) || 0;
        if (numA !== numB) return numA - numB;
        return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
      });
  }

  getActiveRental(carOrIdOrNo: any): any {
    if (!carOrIdOrNo) return null;
    let targetId = '';
    let targetNo = '';
    if (typeof carOrIdOrNo === 'object') {
      targetId = String(carOrIdOrNo.id || carOrIdOrNo.car_id || carOrIdOrNo.carId || '').trim();
      targetNo = String(carOrIdOrNo.carNo || carOrIdOrNo.car_no || '').trim();
    } else {
      targetId = String(carOrIdOrNo).trim();
      targetNo = targetId;
    }

    const cleanNum = targetNo.replace(/\D/g, '') || targetId.replace(/\D/g, '');

    return this.rentals().find(r => {
      if (r.status && r.status !== 'ACTIVE') return false;
      const rId = String(r.id || '').trim();
      const rInvoice = String(r.invoice_no || r.invoiceNo || '').trim();
      const rCarId = String(r.car_id || r.carId || '').trim();
      const rCarNo = String(r.car_no || r.carNo || '').trim();
      const rCleanNum = rCarNo.replace(/\D/g, '') || rCarId.replace(/\D/g, '');

      // 1. Direct identifier matches
      if (targetId && (rCarId.toLowerCase() === targetId.toLowerCase() || rCarNo.toLowerCase() === targetId.toLowerCase() || rId === targetId || rInvoice === targetId)) {
        return true;
      }
      if (targetNo && (rCarNo.toLowerCase() === targetNo.toLowerCase() || rCarId.toLowerCase() === targetNo.toLowerCase())) {
        return true;
      }
      // 2. Numeric car number match (e.g. '76' matches 'CAR-076')
      if (cleanNum && rCleanNum && cleanNum === rCleanNum) {
        return true;
      }
      return false;
    }) || null;
  }

  isCarRented(car: any): boolean {
    if (!car) return false;
    if (car.status === 'Rented') return true;
    return !!this.getActiveRental(car);
  }

  getRentalStartTime(carOrId: any): Date {
    const r = this.getActiveRental(carOrId);
    if (!r) return new Date();
    const raw = r.start_time || r.startTime;
    if (!raw) return new Date();
    if (raw instanceof Date) return raw;
    const d = new Date(typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  /**
   * Returns live timer formatted as HH:mm:ss
   */
  getRentalDuration(carOrId: any): string {
    const r = this.getActiveRental(carOrId);
    if (!r) return '00:00:00';
    const raw = r.start_time || r.startTime;
    const start = new Date(typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : (raw || new Date())).getTime();
    if (isNaN(start)) return '00:00:00';
    const diffSec = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 1000));
    const hrs = Math.floor(diffSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((diffSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (diffSec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  /**
   * Returns human-readable elapsed duration (e.g. 1 hr 25 mins or 45 mins)
   */
  getFormattedTotalDuration(carOrId: any): string {
    const r = this.getActiveRental(carOrId);
    if (!r) return '0 min';
    const raw = r.start_time || r.startTime;
    const start = new Date(typeof raw === 'string' && raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : (raw || new Date())).getTime();
    if (isNaN(start)) return '0 min';
    const diffMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    }
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }

  /**
   * Finds matching active rate record from PostgreSQL
   */
  getMatchingRateObject(carOrRental?: any): any {
    const target = carOrRental || this.selectedCar();
    if (!target) return null;

    const r = this.getActiveRental(target);
    const modelName = String(target.model || r?.model || '').trim().toLowerCase();
    const modelId = String(target.model_id || target.modelId || r?.model_id || r?.modelId || '').trim();
    const activeRates = this.rates().filter(rt => (rt.status === 'ACTIVE' || rt.status === 'Available' || !rt.status));

    // 1. Match by modelId and duration 60
    let match = activeRates.find(rt => 
      modelId && (rt.model_id === modelId || rt.modelId === modelId) && Number(rt.duration) === 60
    );

    // 2. Match by modelId any duration
    if (!match && modelId) {
      match = activeRates.find(rt => rt.model_id === modelId || rt.modelId === modelId);
    }

    // 3. Match by exact model name and duration 60
    if (!match && modelName) {
      match = activeRates.find(rt => 
        rt.model && String(rt.model).trim().toLowerCase() === modelName && Number(rt.duration) === 60
      );
    }

    // 4. Match by exact model name any duration
    if (!match && modelName) {
      match = activeRates.find(rt => 
        rt.model && String(rt.model).trim().toLowerCase() === modelName
      );
    }

    // 5. Fuzzy match by 'double' vs 'single' (preferring duration 60 base rate)
    if (!match) {
      const isDouble = modelName.includes('double');
      match =
        activeRates.find(rt => {
          const m = String(rt.model || '').toLowerCase();
          return (isDouble ? m.includes('double') : m.includes('single')) && Number(rt.duration) === 60;
        }) ||
        activeRates.find(rt => {
          const m = String(rt.model || '').toLowerCase();
          return isDouble ? m.includes('double') : m.includes('single');
        });
    }

    return match || null;
  }

  /**
   * Retrieves base hourly rental rate from Database:
   * Single Seater: 1.000 KD (from DB)
   * Double Seater: 2.000 KD (from DB)
   */
  getCarBaseRate(carOrRental?: any): number {
    const target = carOrRental || this.selectedCar();
    if (!target) return 1.000;

    const match = this.getMatchingRateObject(target);
    if (match && match.amount !== undefined && match.amount !== null) {
      const amt = Number(match.amount);
      if (!isNaN(amt) && amt > 0) {
        return amt;
      }
    }

    // Fallback if DB rate record not yet loaded: Double Seater is 2 KD, Single Seater is 1 KD
    const r = this.getActiveRental(target);
    const modelName = String(target.model || r?.model || '').trim().toLowerCase();
    const isDouble = modelName.includes('double');
    return isDouble ? 2.000 : 1.000;
  }

  /**
   * Retrieves half-hour rate from Database (Requirement 3):
   * Single Seater: 0.500 KD (from DB rates table where duration = 30)
   * Double Seater: 1.000 KD (from DB rates table where duration = 30)
   */
  getCarHalfHourRate(carOrRental?: any): number {
    const target = carOrRental || this.selectedCar();
    if (!target) return 0.500;

    const activeRates = this.rates().filter(r => r.status === 'ACTIVE' || !r.status);
    const r = this.getActiveRental(target);
    const modelId = target.model_id || target.modelId || r?.model_id || r?.modelId;
    const modelName = String(target.model || r?.model || '').trim().toLowerCase();

    // 1. Match by modelId and duration 30
    let match = activeRates.find(rt => 
      modelId && (rt.model_id === modelId || rt.modelId === modelId) && Number(rt.duration) === 30
    );

    // 2. Match by exact model name and duration 30
    if (!match && modelName) {
      match = activeRates.find(rt => 
        rt.model && String(rt.model).trim().toLowerCase() === modelName && Number(rt.duration) === 30
      );
    }

    // 3. Match by double vs single and duration 30
    if (!match) {
      const isDouble = modelName.includes('double');
      match = activeRates.find(rt => {
        const m = String(rt.model || '').toLowerCase();
        return (isDouble ? m.includes('double') : m.includes('single')) && Number(rt.duration) === 30;
      });
    }

    if (match && match.amount !== undefined && match.amount !== null) {
      const amt = Number(match.amount);
      if (!isNaN(amt) && amt > 0) return amt;
    }

    // Fallback: 50% of base rate
    return this.getCarBaseRate(target) * 0.5;
  }

  /**
   * Pricing Calculation based on Database Rates (Requirements 2 & 3):
   * - Within grace period: 0.000 KD
   * - First hour (up to 60 minutes + grace period): Base rate from DB (1.000 for Single, 2.000 for Double)
   * - Any additional usage within next half-hour billing period:
   *   Single car: KWD 0.500 per half-hour
   *   Double car: KWD 1.000 per half-hour
   */
  calculateRate(): number {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car);
    if (!r) return 0;

    const start = this.getRentalStartTime(car).getTime();
    const elapsedMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const rawGrace = Number(this.gracePeriodMinutes());
    const grace = !isNaN(rawGrace) && rawGrace >= 0 ? rawGrace : 10;

    // Rule 1: Within initial grace period -> 0 KD
    if (elapsedMins <= grace) {
      return 0.000;
    }

    const baseRate = this.getCarBaseRate(car);
    const halfHourRate = this.getCarHalfHourRate(car);

    // Rule 2: First hour (up to 60 minutes + grace period) -> Base rate from DB
    if (elapsedMins <= 60 + grace) {
      return baseRate;
    }

    // Rule 3: Any additional usage within the next half-hour billing period
    const extraMins = elapsedMins - 60 - grace;
    const extraHalfHours = Math.ceil(extraMins / 30);
    return baseRate + (extraHalfHours * halfHourRate);
  }

  /**
   * Detailed rate breakdown for UI display (Database rates driven)
   */
  getRateBreakdown(): { base: number; extra: number; halfHourRate: number; extraHalfHours: number; isWithinGrace: boolean; graceMins: number } {
    const car = this.selectedCar();
    const rawGrace = Number(this.gracePeriodMinutes());
    const defaultGrace = !isNaN(rawGrace) && rawGrace >= 0 ? rawGrace : 10;
    if (!car) return { base: 0, extra: 0, halfHourRate: 0.500, extraHalfHours: 0, isWithinGrace: false, graceMins: defaultGrace };
    const r = this.getActiveRental(car);
    if (!r) return { base: 0, extra: 0, halfHourRate: 0.500, extraHalfHours: 0, isWithinGrace: false, graceMins: defaultGrace };

    const start = this.getRentalStartTime(car).getTime();
    const elapsedMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const grace = defaultGrace;

    const baseRate = this.getCarBaseRate(car);
    const halfHourRate = this.getCarHalfHourRate(car);

    if (elapsedMins <= grace) {
      return { base: baseRate, extra: 0, halfHourRate, extraHalfHours: 0, isWithinGrace: true, graceMins: grace };
    }

    if (elapsedMins <= 60 + grace) {
      return { base: baseRate, extra: 0, halfHourRate, extraHalfHours: 0, isWithinGrace: false, graceMins: grace };
    }

    const extraMins = elapsedMins - 60 - grace;
    const extraHalfHours = Math.ceil(extraMins / 30);
    return {
      base: baseRate,
      extra: extraHalfHours * halfHourRate,
      halfHourRate: halfHourRate,
      extraHalfHours: extraHalfHours,
      isWithinGrace: false,
      graceMins: grace
    };
  }

    onDiscountMasterChange(type: 'NONE' | 'DISABILITY_50' | 'CUSTOM') {
    this.selectedDiscountMaster = type;
  }

  /**
   * Calculate effective discount based on Master Dropdown selection
   */
  calculateEffectiveDiscount(): number {
    const rate = this.calculateRate();
    if (rate <= 0) return 0;

    if (this.selectedDiscountMaster === 'NONE') {
      return 0;
    } else if (this.selectedDiscountMaster === 'DISABILITY_50') {
      // 50% discount for customers with disabilities
      return (rate * 50) / 100;
    } else if (this.selectedDiscountMaster === 'CUSTOM') {
      const mode = this.customDiscountMode();
      const val = Number(this.customDiscountValue()) || 0;
      if (val <= 0) return 0;
      if (mode === 'PERCENT') {
        return Math.min(rate, (rate * Math.min(100, val)) / 100);
      } else {
        return Math.min(rate, val);
      }
    }
    return 0;
  }

  /**
   * Split Payment Management (Requirement 10)
   */
  onPaymentMethodChange(method: 'CASH' | 'KNET' | 'SPLIT') {
    this.paymentMethod = method;
    this.updateSplitAmounts();
  }

  updateSplitAmounts() {
    const total = this.finalCharge();
    if (this.paymentMethod === 'SPLIT') {
      let cash = this.splitCashAmount();
      if (cash <= 0 || cash > total) {
        cash = Math.round((total / 2) * 1000) / 1000;
      }
      this.splitCashAmount.set(cash);
      this.splitKnetAmount.set(Math.max(0, Math.round((total - cash) * 1000) / 1000));
    }
  }

  onSplitCashChange(val: number) {
    const total = this.finalCharge();
    const cash = Math.max(0, Math.min(total, Number(val) || 0));
    this.splitCashAmount.set(cash);
    this.splitKnetAmount.set(Math.max(0, Math.round((total - cash) * 1000) / 1000));
  }

  onSplitKnetChange(val: number) {
    const total = this.finalCharge();
    const knet = Math.max(0, Math.min(total, Number(val) || 0));
    this.splitKnetAmount.set(knet);
    this.splitCashAmount.set(Math.max(0, Math.round((total - knet) * 1000) / 1000));
  }

  finalCharge(): number {
    return Math.max(0, this.calculateRate() - this.calculateEffectiveDiscount());
  }

  getDepositPaid(): number {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car);
    return Number(r?.deposit_amount ?? r?.depositAmount ?? r?.rental_amount ?? r?.rentalAmount ?? this.depositAmount ?? 10);
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
    if (!car) return;
    this.selectedCar.set({ ...car });
    const isRented = car.status === 'Rented' || this.isCarRented(car);
    
    if (isRented) {
       this.isStartModalOpen.set(false);
       this.isCloseModalOpen.set(true);
       this.selectedDiscountMaster = 'NONE';
       this.customDiscountMode.set('PERCENT');
       this.customDiscountValue.set(0);
       this.discountReason = '';
       this.settlementRemarks = '';
       this.paymentMethod = 'CASH';

       const active = this.getActiveRental(car);
       // Refresh configured rates and grace period from DB so latest setup is always used
       this.api.getRates().subscribe({
         next: (rates) => {
           if (rates) {
             this.rates.set(rates);
             this.cdr.markForCheck();
           }
         }
       });
       this.api.getGracePeriods().subscribe({
         next: (gps) => {
           if (gps && gps.length > 0) {
             const activeGrace = gps.find((g: any) => g.status === 'ACTIVE' || g.status === 'Available') || gps[0];
             if (activeGrace && activeGrace.minutes !== undefined) {
               this.gracePeriodMinutes.set(Number(activeGrace.minutes));
               this.cdr.markForCheck();
             }
           }
         }
       });
       // If active rental wasn't in memory yet, fetch it immediately to populate settlement
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
    } else {
       this.isCloseModalOpen.set(false);
       this.isStartModalOpen.set(true);
       this.customerName = '';
       this.mobileNo = '';
       this.matchedCustomer.set(null);
       this.isEditingMatchedCustomerName.set(false);
       this.showCustomerDropdown.set(false);
       this.filteredCustomerSuggestions.set(this.customers().slice(0, 15));
       this.depositAmount = 10.000; // Requirement 1: Default deposit value is 10 KD
       this.paymentMethod = 'CASH';
       this.splitCashAmount.set(0);
       this.splitKnetAmount.set(0);
    }
    this.cdr.markForCheck();
  }

  onPhoneFocus() {
    const clean = String(this.mobileNo || '').trim();
    this.updateLocalCustomerSuggestions(clean);
    if (this.filteredCustomerSuggestions().length > 0) {
      this.showCustomerDropdown.set(true);
    }
  }

  onPhoneBlur() {
    setTimeout(() => {
      this.showCustomerDropdown.set(false);
      this.cdr.markForCheck();
    }, 180);
  }

  onPhoneChange(value: string) {
    const clean = String(value || '').trim();
    this.updateLocalCustomerSuggestions(clean);
    this.showCustomerDropdown.set(true);

    if (!clean) {
      if (this.matchedCustomer()) {
        this.customerName = '';
      }
      this.matchedCustomer.set(null);
      this.isEditingMatchedCustomerName.set(false);
      return;
    }

    // Check immediate exact match in cached customers
    const localExact = this.customers().find(c => String(c.phone || '').trim() === clean);
    if (localExact) {
      this.matchedCustomer.set(localExact);
      this.customerName = localExact.name || '';
      this.isEditingMatchedCustomerName.set(false);
    } else {
      if (this.matchedCustomer()) {
        this.matchedCustomer.set(null);
        this.isEditingMatchedCustomerName.set(false);
        this.customerName = '';
      }
    }

    if (this.phoneSearchTimeout) {
      clearTimeout(this.phoneSearchTimeout);
    }

    if (clean.length >= 2) {
      this.customerLookupLoading.set(true);
      this.phoneSearchTimeout = setTimeout(() => {
        this.api.searchCustomers(clean).subscribe({
          next: (rows) => {
            this.customerLookupLoading.set(false);
            const list = rows || [];
            this.filteredCustomerSuggestions.set(list);
            const serverExact = list.find(c => String(c.phone || '').trim() === clean);
            if (serverExact) {
              this.matchedCustomer.set(serverExact);
              if (!this.isEditingMatchedCustomerName()) {
                this.customerName = serverExact.name || '';
              }
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.customerLookupLoading.set(false);
            this.cdr.markForCheck();
          }
        });
      }, 150);
    }
  }

  private updateLocalCustomerSuggestions(query: string) {
    const all = this.customers() || [];
    if (!query) {
      this.filteredCustomerSuggestions.set(all.slice(0, 15));
      return;
    }
    const qLower = query.toLowerCase();
    const matches = all.filter(c =>
      String(c.phone || '').toLowerCase().includes(qLower) ||
      String(c.name || '').toLowerCase().includes(qLower)
    ).sort((a, b) => {
      const aPhone = String(a.phone || '');
      const bPhone = String(b.phone || '');
      const aExact = aPhone === query ? 0 : (aPhone.startsWith(query) ? 1 : 2);
      const bExact = bPhone === query ? 0 : (bPhone.startsWith(query) ? 1 : 2);
      return aExact - bExact;
    });
    this.filteredCustomerSuggestions.set(matches.slice(0, 15));
  }

  selectCustomer(cust: any) {
    if (!cust) return;
    this.mobileNo = String(cust.phone || '').trim();
    this.customerName = String(cust.name || '').trim();
    this.matchedCustomer.set(cust);
    this.isEditingMatchedCustomerName.set(false);
    this.showCustomerDropdown.set(false);
    this.cdr.markForCheck();
  }

  clearCustomerSelection() {
    this.mobileNo = '';
    this.customerName = '';
    this.matchedCustomer.set(null);
    this.isEditingMatchedCustomerName.set(false);
    this.updateLocalCustomerSuggestions('');
    this.cdr.markForCheck();
  }

  toggleEditMatchedCustomerName() {
    this.isEditingMatchedCustomerName.set(!this.isEditingMatchedCustomerName());
  }

  closeModal() {
    this.isCloseModalOpen.set(false);
    this.isStartModalOpen.set(false);
    this.showCustomerDropdown.set(false);
    this.selectedCar.set(null);
    this.paymentMethod = 'CASH';
    this.splitCashAmount.set(0);
    this.splitKnetAmount.set(0);
    this.cdr.markForCheck();
  }

  closeReceiptModal() {
    this.isReceiptModalOpen.set(false);
    this.lastClosedRental.set(null);
    this.cdr.markForCheck();
  }

  printReceiptStandard() {
    const r = this.lastClosedRental();
    if (r) {
      this.printService.printRentalReceipt(r, false);
    }
  }

  printReceiptThermal(width: ThermalPaperWidth = '80mm') {
    const r = this.lastClosedRental();
    if (r) {
      this.printService.printRentalReceipt(r, true, width);
    }
  }

  onRentalStart() {
    const car = this.selectedCar();
    if (!car) return;

    const defaultCustomer = this.translateService.translate('POS.WALK_IN_CUSTOMER');
    const deposit = Math.max(0, Number(this.depositAmount) || 0); // Requirement 2: Can be 0 KD or custom

    const rawUser = localStorage.getItem('currentUser');
    let currentUser: any = null;
    if (rawUser) {
      try { currentUser = JSON.parse(rawUser); } catch(e) {}
    }
    const currentDisplayName = currentUser?.employeeName || currentUser?.username || 'Cashier';
    const currentUserLogin = currentUser?.username || 'Cashier';

    const matchingRate = this.getMatchingRateObject(car);
    const rateId = matchingRate?.id || null;

    const payload = {
      carId: car.id,
      carNo: car.carNo,
      model: car.model,
      rateId: rateId,
      customerName: (this.customerName || '').trim() || defaultCustomer,
      customerPhone: (this.mobileNo || '').trim(),
      updateCustomerName: this.isEditingMatchedCustomerName(),
      durationMinutes: 60, // Standard base duration
      rentalAmount: deposit,
      totalAmount: deposit,
      paymentMethod: (this.paymentMethod === 'SPLIT' ? 'CASH' : this.paymentMethod) || 'CASH',
      createdBy: currentDisplayName,
      username: currentUserLogin,
      terminal: 'POS-Terminal-1',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH',
      printBillCopy: this.giveBillCopyOnPunch,
      shiftId: this.currentShift()?.id,
      shiftNumber: this.currentShift()?.shiftNumber || 1,
      businessDate: this.salesDate(),
    };

    // --- INSTANT OPTIMISTIC UI REFRESH (0ms DELAY) ---
    // 1. Immediately update car status in local state so the box instantly turns RED ('RENTED')
    const updatedCars = this.cars().map(c => c.id === car.id ? { ...c, status: 'Rented' } : c);
    this.cars.set(updatedCars);
    this.updateStats();

    // 2. Immediately add active rental into local state so timer starts immediately
    const tempRentalId = 'opt_' + Date.now();
    const optimisticRental = {
      id: tempRentalId,
      invoice_no: 'INV-PENDING',
      invoiceNo: 'INV-PENDING',
      car_id: car.id,
      carId: car.id,
      car_no: car.carNo,
      carNo: car.carNo,
      model: car.model,
      customer_name: payload.customerName,
      customerName: payload.customerName,
      customer_phone: payload.customerPhone,
      customerPhone: payload.customerPhone,
      start_time: new Date().toISOString(),
      startTime: new Date().toISOString(),
      duration_minutes: 60,
      rate_id: rateId,
      rateId: rateId,
      rental_amount: deposit,
      deposit_amount: deposit,
      depositAmount: deposit,
      total_amount: deposit,
      payment_method: payload.paymentMethod,
      status: 'ACTIVE',
      created_by: currentDisplayName,
    };
    this.rentals.set([optimisticRental, ...this.rentals().filter(r => r.car_id !== car.id && r.carId !== car.id)]);
    this.syncFleetStatuses();

    // 3. Immediately close modal so cashier can immediately click another box to start another rental
    this.closeModal();

    // 4. Send creation request to server in background
    this.api.createRental(payload).subscribe({
      next: (createdRental) => {
        // Replace optimistic rental with the real DB rental
        if (createdRental) {
          const norm = this.normalizeRental(createdRental);
          const filtered = this.rentals().filter(r => r.id !== tempRentalId && r.car_id !== car.id && r.carId !== car.id);
          this.rentals.set([norm, ...filtered]);

          // Keep this car explicitly Rented
          const refreshedCars = this.cars().map(c => c.id === car.id ? { ...c, status: 'Rented' } : c);
          this.cars.set(refreshedCars);
          this.updateStats();

          // Refresh cached customer master list so new/updated phone is immediately searchable
          this.api.getCustomers().subscribe({
            next: (custs) => this.customers.set(custs || []),
            error: () => {}
          });

          // Direct Thermal Print Feedback for Punching (Configuration Based)
          if (createdRental.printStatus?.success) {
            this.showPrintToast(
              'success',
              `🧾 ${this.translateService.translate('POS.PUNCH_PRINT_SUCCESS')} (${createdRental.printStatus.latencyMs}ms)`
            );
          } else if (this.giveBillCopyOnPunch && createdRental.printStatus?.error) {
            this.showPrintToast(
              'warning',
              `⚠️ ${this.translateService.translate('PRINTER.THERMAL_ERROR')}: ${createdRental.printStatus.error}`
            );
          }
        }
        // Silent background sync
        this.loadData(true);
      },
      error: (err) => {
        console.error('Error creating rental in Database:', err);
        // Rollback optimistic update
        const rolledBackCars = this.cars().map(c => c.id === car.id ? { ...c, status: 'Available' } : c);
        this.cars.set(rolledBackCars);
        this.rentals.set(this.rentals().filter(r => r.id !== tempRentalId));
        this.updateStats();
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
      }
    });
  }

  onRentalClose() {
    const car = this.selectedCar();
    if (!car) return;

    // Requirement 6: Staff must enter reason for custom discount
    if (this.selectedDiscountMaster === 'CUSTOM' && this.calculateEffectiveDiscount() > 0) {
      if (!this.discountReason || !this.discountReason.trim()) {
        alert('Please enter a reason for the custom discount to ensure accountability and monitoring.');
        return;
      }
    }

    const r = this.getActiveRental(car);
    const rentalId = r?.id || r?.invoice_no || r?.invoiceNo || car.id;

    this.processing.set(true);

    const calcCharge = this.calculateRate();
    const effectiveDiscount = this.calculateEffectiveDiscount();
    const charge = this.finalCharge();
    const depositAmt = this.getDepositPaid();
    const changeToReturn = this.finalChangeToReturn();
    const extraAmt = this.getRateBreakdown().extra;
    const elapsed = this.getRentalDuration(car);

    const rawUser = localStorage.getItem('currentUser');
    let currentUser: any = null;
    if (rawUser) {
      try { currentUser = JSON.parse(rawUser); } catch(e) {}
    }
    const currentDisplayName = currentUser?.employeeName || currentUser?.username || 'Cashier';
    const currentUserLogin = currentUser?.username || 'Cashier';

    let cashAmt = 0;
    let knetAmt = 0;
    if (this.paymentMethod === 'SPLIT') {
      cashAmt = this.splitCashAmount();
      knetAmt = this.splitKnetAmount();
    } else if (this.paymentMethod === 'CASH') {
      cashAmt = charge;
      knetAmt = 0;
    } else {
      cashAmt = 0;
      knetAmt = charge;
    }

    const payload = {
      rentalId: r?.id,
      invoiceNo: r?.invoice_no || r?.invoiceNo,
      carId: car.id,
      carNo: car.carNo,
      actualEndTime: new Date().toISOString(),
      extraAmount: extraAmt,
      discount: effectiveDiscount,
      discountType: this.selectedDiscountMaster,
      discountValue: this.selectedDiscountMaster === 'DISABILITY_50' ? 50 : (this.selectedDiscountMaster === 'CUSTOM' ? this.customDiscountValue() : 0),
      discountReason: this.discountReason || undefined,
      settlementRemarks: this.settlementRemarks || undefined,
      remarks: this.settlementRemarks || undefined,
      totalAmount: charge,
      paymentMethod: this.paymentMethod,
      cashAmount: cashAmt,
      knetAmount: knetAmt,
      username: currentUserLogin,
      cashierName: currentDisplayName,
      terminal: 'POS-Terminal-1',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      elapsedDuration: elapsed,
      depositAmount: depositAmt,
      changeReturned: changeToReturn,
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH',
      shiftId: this.currentShift()?.id,
      shiftNumber: this.currentShift()?.shiftNumber || 1,
      businessDate: this.salesDate(),
    };

    this.api.settleRental(rentalId, payload).subscribe({
      next: (res) => {
        this.processing.set(false);
        this.closeModal();

        // Optimistically update car back to Available and remove active rental
        const updatedCars = this.cars().map(c => (c.id === car.id || c.carNo === car.carNo) ? { ...c, status: 'Available' } : c);
        this.cars.set(updatedCars);
        this.rentals.set(this.rentals().filter(item => item.id !== r?.id && item.car_id !== car.id && item.car_no !== car.carNo));
        this.syncFleetStatuses();

        // Silent background reload
        this.loadData(true);
        this.loadSalesDateAndShift();

        const closedRental = res.rental || res;
        const srvTotal = closedRental?.total_amount !== undefined ? Number(closedRental.total_amount) : charge;
        const srvExtra = closedRental?.extra_amount !== undefined ? Number(closedRental.extra_amount) : extraAmt;
        const srvDiscount = closedRental?.discount !== undefined ? Number(closedRental.discount) : effectiveDiscount;
        const srvChange = closedRental?.change_returned !== undefined ? Number(closedRental.change_returned) : changeToReturn;
        const srvCash = closedRental?.cash_amount !== undefined ? Number(closedRental.cash_amount) : cashAmt;
        const srvKnet = closedRental?.knet_amount !== undefined ? Number(closedRental.knet_amount) : knetAmt;
        this.lastClosedRental.set({
          ...r,
          ...closedRental,
          start_time: r?.start_time || r?.startTime,
          actual_end_time: payload.actualEndTime,
          carNo: car.carNo,
          model: car.model,
          rental_amount: srvTotal + srvDiscount,
          extra_amount: srvExtra,
          total_amount: srvTotal,
          depositAmount: depositAmt,
          payment_method: this.paymentMethod,
          cash_amount: srvCash,
          knet_amount: srvKnet,
          discount: srvDiscount,
          discountType: this.selectedDiscountMaster,
          discount_reason: this.discountReason,
          settlement_remarks: this.settlementRemarks,
          elapsedDuration: elapsed,
          changeReturned: srvChange,
        });
        this.cdr.markForCheck();

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
        this.processing.set(false);
        const errMsg = err.error?.error || err.error?.message || err.message || 'Settlement failed. Please check network connection.';
        console.error('Settlement error:', err);
        this.showPrintToast('error', `❌ ${errMsg}`, 7000);
        alert(`Settlement Error: ${errMsg}`);
      }
    });
  }
}

