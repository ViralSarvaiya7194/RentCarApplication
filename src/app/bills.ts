import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService } from './print.service';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="p-3 lg:p-4 flex-1 overflow-y-auto flex flex-col gap-2.5 min-h-0">
      
      <!-- Top Header & Action Controls -->
      <div class="flex items-center justify-between gap-3 shrink-0">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-lg lg:text-xl font-bold text-slate-800 truncate">{{ 'BILLS.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-xs mt-0.5 hidden xl:block truncate">{{ 'BILLS.SUBTITLE' | translate }}</p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Audit Log Viewer Button -->
          <button (click)="openAuditModal()" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span>{{ 'BILLS.AUDIT_LOG_BTN' | translate }}</span>
          </button>

          <!-- Refresh Button -->
          <button (click)="loadRentals()" class="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      <!-- Sales Date Selector Bar (Compact for 1024x768) -->
      <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 px-3 py-2 rounded-xl border border-amber-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
            📅
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-black uppercase text-amber-900 tracking-wide whitespace-nowrap">{{ isArabic() ? 'تصفية تاريخ المبيعات' : 'Sales Date View' }}</span>
              <span *ngIf="salesDateFilter() !== 'ALL'" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-mono whitespace-nowrap">
                {{ salesDateFilter() }}
              </span>
              <span *ngIf="salesDateFilter() === 'ALL'" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 whitespace-nowrap">
                {{ isArabic() ? 'جميع التواريخ السابقة' : 'All History' }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 hidden xl:block truncate">
              {{ isArabic() ? 'عرض المعاملات والإيصالات الخاصة بيوم المبيعات المحدد فقط' : 'Showing sales transactions strictly for the selected sales business date.' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <div class="flex items-center bg-white border border-amber-300 rounded-lg px-2 py-1 shadow-2xs">
            <label class="text-[10px] font-black uppercase text-amber-800 mr-1.5 whitespace-nowrap">{{ isArabic() ? 'تاريخ المبيعات:' : 'Sales Date:' }}</label>
            <input 
              type="date" 
              [ngModel]="salesDateFilter() === 'ALL' ? '' : salesDateFilter()" 
              (ngModelChange)="onSalesDateChange($event)"
              class="text-xs font-mono font-bold text-slate-800 focus:outline-none cursor-pointer" />
          </div>

          <button 
            type="button" 
            (click)="setSalesDateToday()"
            [class]="salesDateFilter() === activeSalesBusinessDate() ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 font-medium'"
            class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap">
            {{ isArabic() ? 'اليوم' : 'Today' }} ({{ activeSalesBusinessDate() }})
          </button>

          <button 
            type="button" 
            (click)="setSalesDateYesterday()"
            [class]="salesDateFilter() === yesterdayDateStr() ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 font-medium'"
            class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap">
            {{ isArabic() ? 'أمس' : 'Yesterday' }}
          </button>

          <button 
            type="button" 
            (click)="setSalesDateAll()"
            [class]="salesDateFilter() === 'ALL' ? 'bg-slate-800 text-white shadow-2xs font-bold' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium'"
            class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer whitespace-nowrap">
            {{ isArabic() ? 'كل التواريخ' : 'All Days' }}
          </button>
        </div>
      </div>

      <!-- Quick Stats Counters (Compact single row for 1024x768) -->
      <div class="grid grid-cols-5 gap-2 shrink-0">
        <div class="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
          <div class="min-w-0">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{{ 'BILLS.TOTAL_BILLS' | translate }}</p>
            <p class="text-base lg:text-lg font-black text-slate-800 leading-tight">{{ filteredRentals().length }}</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">🧾</div>
        </div>

        <div class="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
          <div class="min-w-0">
            <p class="text-[10px] text-green-600 font-bold uppercase tracking-wider truncate">{{ 'POS.ACTIVE_DRIVES' | translate }}</p>
            <p class="text-base lg:text-lg font-black text-green-700 leading-tight">{{ activeCount() }}</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-sm shrink-0">🚗</div>
        </div>

        <div class="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
          <div class="min-w-0">
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{{ 'BILLS.COMPLETED' | translate }}</p>
            <p class="text-base lg:text-lg font-black text-slate-700 leading-tight">{{ completedCount() }}</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">✅</div>
        </div>

        <div class="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
          <div class="min-w-0">
            <p class="text-[10px] text-red-500 font-bold uppercase tracking-wider truncate">{{ 'BILLS.CANCELLED_BILLS' | translate }}</p>
            <p class="text-base lg:text-lg font-black text-red-600 leading-tight">{{ cancelledCount() }}</p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">❌</div>
        </div>

        <div class="bg-gradient-to-tr from-amber-50 to-orange-50 px-3 py-2 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between min-w-0">
          <div class="min-w-0">
            <p class="text-[10px] text-amber-700 font-bold uppercase tracking-wider truncate">Sales Total</p>
            <p class="text-base lg:text-lg font-black text-amber-600 font-mono leading-tight whitespace-nowrap">{{ totalSalesAmount() | number:'1.3-3' }} <span class="text-[10px] font-sans">KD</span></p>
          </div>
          <div class="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">💰</div>
        </div>
      </div>

      <!-- Filters Toolbar (Compact single row) -->
      <div class="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 shrink-0">
        <div class="relative flex-1 max-w-md">
          <svg class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            [placeholder]="'BILLS.SEARCH_PLACEHOLDER' | translate" 
            class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition">
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <!-- Status Filter -->
          <div class="flex items-center gap-1.5">
            <label class="text-xs font-bold text-slate-500">{{ 'COMMON.STATUS' | translate }}:</label>
            <select 
              [(ngModel)]="statusFilter" 
              class="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
              <option value="COMPLETED">{{ 'BILLS.COMPLETED' | translate }}</option>
              <option value="CANCELLED">{{ 'BILLS.CANCELLED' | translate }}</option>
            </select>
          </div>

          <span class="text-xs font-bold text-slate-400 whitespace-nowrap">
            {{ filteredRentals().length }} {{ 'COMMON.RECORDS' | translate }}
          </span>
        </div>
      </div>

      <!-- Main Bills Table (Flex-1 Scrollable Grid for 1024x768 & all screen sizes) -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 min-h-[280px] flex flex-col overflow-hidden">
        <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'RECEIPT.INVOICE_NO' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'COMMON.DATE' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'POS.CUSTOMER_NAME' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'RECEIPT.CAR' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'RECEIPT.DURATION' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'RECEIPT.TOTAL_PAID' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'POS.PAYMENT_METHOD' | translate }}</th>
                <th class="px-3 py-2.5 whitespace-nowrap">{{ 'COMMON.STATUS' | translate }}</th>
                <th class="px-3 py-2.5 text-right whitespace-nowrap">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of filteredRentals()" class="hover:bg-slate-50 transition-colors">
                
                <!-- Invoice No & Duplicate Badges -->
                <td class="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span>{{ item.invoice_no || item.invoiceNo }}</span>
                    <span *ngIf="item.reprint_count > 0 || item.reprintCount > 0" class="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold" [title]="'Reprinted ' + (item.reprint_count || item.reprintCount) + ' times'">
                      #{{ item.reprint_count || item.reprintCount }} {{ 'DUPLICATE.BADGE' | translate }}
                    </span>
                  </div>
                </td>

                <!-- Date & Time -->
                <td class="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                  {{ (item.start_time || item.startTime) | date:'yyyy-MM-dd HH:mm' }}
                </td>

                <!-- Customer -->
                <td class="px-3 py-2.5 text-xs">
                  <div class="font-bold text-slate-800 truncate max-w-[140px]">{{ item.customer_name || item.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</div>
                  <div class="text-slate-400 text-[10px] font-mono" *ngIf="item.customer_phone || item.customerPhone">{{ item.customer_phone || item.customerPhone }}</div>
                </td>

                <!-- Vehicle -->
                <td class="px-3 py-2.5 text-xs font-semibold text-slate-800 whitespace-nowrap">
                  <div class="flex items-center gap-1">
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
                </td>

                <!-- Duration -->
                <td class="px-3 py-2.5 text-xs whitespace-nowrap">
                  {{ item.duration_minutes || item.durationMinutes }} {{ 'COMMON.MINUTES' | translate }}
                </td>

                <!-- Amount -->
                <td class="px-3 py-2.5 text-xs font-mono font-black text-slate-900 whitespace-nowrap">
                  {{ (item.total_amount || item.totalAmount || item.rental_amount || item.rentalAmount || '0.000') }} {{ 'COMMON.KWD' | translate }}
                </td>

                <!-- Payment Method -->
                <td class="px-3 py-2.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                  {{ item.payment_method || item.paymentMethod || 'CASH' }}
                </td>

                <!-- Status Badge -->
                <td class="px-3 py-2.5 text-xs whitespace-nowrap">
                  <span *ngIf="item.status === 'ACTIVE'" class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 flex items-center gap-1 w-max">
                    <span class="w-1.5 h-1.5 bg-green-600 rounded-full animate-ping"></span> {{ 'COMMON.ACTIVE' | translate }}
                  </span>
                  <span *ngIf="item.status === 'COMPLETED'" class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 w-max">
                    {{ 'BILLS.COMPLETED' | translate }}
                  </span>
                  <span *ngIf="item.status === 'CANCELLED'" class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 w-max" [title]="item.cancellation_reason || item.cancellationReason || ''">
                    {{ 'BILLS.CANCELLED' | translate }}
                  </span>
                </td>

                <!-- Actions: View, Print Duplicate, Cancel -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    
                    <!-- View Bill (On-Screen Modal Only, No Print Dialog) -->
                    <button 
                      (click)="viewBill(item)" 
                      class="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded border border-slate-200 transition cursor-pointer text-xs flex items-center gap-1" 
                      [title]="'BILLS.VIEW_PREVIEW' | translate">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      <span class="hidden sm:inline">{{ 'COMMON.VIEW' | translate }}</span>
                    </button>

                    <!-- Print Duplicate (Direct Thermal Printing) -->
                    <button 
                      *ngIf="perm.can('BILLS_DUPLICATE', 'PRINT')"
                      (click)="printDuplicateDirect(item)" 
                      [disabled]="printingId() === item.id"
                      class="px-2 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                      [title]="'DUPLICATE.PRINT_BTN' | translate">
                      <span *ngIf="printingId() === item.id" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <svg *ngIf="printingId() !== item.id" class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      <span>{{ 'DUPLICATE.PRINT_BTN' | translate }}</span>
                    </button>

                    <!-- Change Car Button (For Active Rentals) -->
                    <button 
                      *ngIf="item.status === 'ACTIVE'"
                      (click)="openChangeCarModal(item)" 
                      class="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      [title]="'POS.CHANGE_CAR' | translate">
                      <span class="text-xs">🔄</span>
                      <span>{{ 'POS.CHANGE_CAR' | translate }}</span>
                    </button>

                    <!-- Cancel Bill Button (Prior Confirmation & Supervisor/Manager Login) -->
                    <button 
                      *ngIf="item.status !== 'CANCELLED'"
                      (click)="openCancelPriorConfirm(item)" 
                      class="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      [title]="'CANCEL.BTN' | translate">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      <span>{{ 'CANCEL.BTN' | translate }}</span>
                    </button>

                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredRentals().length === 0 && !loading()">
                <td colspan="10" class="px-6 py-8 text-center text-slate-400">{{ 'COMMON.NO_RECORDS' | translate }}</td>
              </tr>
              <tr *ngIf="loading()">
                <td colspan="10" class="px-6 py-8 text-center text-slate-400">
                  <div class="inline-flex items-center gap-2">
                    <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    {{ 'COMMON.LOADING' | translate }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 1: VIEW BILL ON-SCREEN (Zero Print Dialog)          -->
      <!-- ======================================================== -->
      <div *ngIf="isViewModalOpen && selectedRental" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          
          <!-- View Modal Header Ribbon -->
          <div class="p-3 text-center text-xs font-bold uppercase tracking-wider"
               [ngClass]="selectedRental.status === 'CANCELLED' ? 'bg-red-600 text-white' : (selectedRental.reprint_count > 0 ? 'bg-purple-600 text-white' : 'bg-slate-800 text-white')">
            <span *ngIf="selectedRental.status === 'CANCELLED'">*** {{ 'CANCEL.BANNER' | translate }} ***</span>
            <span *ngIf="selectedRental.status !== 'CANCELLED' && (selectedRental.reprint_count > 0 || selectedRental.reprintCount > 0)">*** {{ 'DUPLICATE.BANNER' | translate }} (Copy #{{ selectedRental.reprint_count || selectedRental.reprintCount }}) ***</span>
            <span *ngIf="selectedRental.status !== 'CANCELLED' && !selectedRental.reprint_count && !selectedRental.reprintCount">{{ 'RECEIPT.TITLE' | translate }}</span>
          </div>

          <!-- Bill On-Screen Preview Body -->
          <div class="p-6 bg-white flex flex-col gap-4 text-slate-800 font-sans text-xs">
            <div class="text-center border-b border-dashed border-slate-300 pb-3">
              <div class="w-8 h-8 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center mx-auto mb-1 text-sm">K</div>
              <h3 class="font-bold text-sm">Kiddie Kruzzer</h3>
              <p class="text-[10px] text-slate-400">Entertainment & Rentals POS</p>
            </div>

            <!-- Meta details (Time Details: Start Time, End Time, Total Usage Duration) -->
            <div class="space-y-1.5">
              <div class="flex justify-between">
                <span class="text-slate-500">{{ 'RECEIPT.INVOICE_NO' | translate }}:</span>
                <span class="font-mono font-bold">{{ selectedRental.invoice_no || selectedRental.invoiceNo }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ 'POS.CUSTOMER_NAME' | translate }}:</span>
                <span class="font-bold">{{ selectedRental.customer_name || selectedRental.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ 'RECEIPT.CAR' | translate }}:</span>
                <span class="font-bold">{{ selectedRental.car_no || selectedRental.carNo }} ({{ selectedRental.model }})</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ 'POS.START_TIME' | translate }}:</span>
                <span class="font-mono font-bold">{{ (selectedRental.start_time || selectedRental.startTime) | date:'yyyy-MM-dd HH:mm:ss' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ 'POS.END_TIME' | translate }}:</span>
                <span class="font-mono font-bold">{{ (selectedRental.actual_end_time || selectedRental.actualEndTime || selectedRental.expected_end_time || selectedRental.expectedEndTime || selectedRental.start_time || selectedRental.startTime) | date:'yyyy-MM-dd HH:mm:ss' }}</span>
              </div>
              <div class="flex justify-between bg-indigo-50/70 p-1.5 rounded border border-indigo-100">
                <span class="text-indigo-900 font-bold">{{ 'POS.TOTAL_USAGE_DURATION' | translate }}:</span>
                <span class="font-bold font-mono text-indigo-700">{{ selectedRental.elapsed_duration || selectedRental.elapsedDuration || ((selectedRental.duration_minutes || selectedRental.durationMinutes) + ' min') }}</span>
              </div>
            </div>

            <!-- Cancellation Info Box (if cancelled) -->
            <div *ngIf="selectedRental.status === 'CANCELLED'" class="bg-red-50 p-3 rounded-lg border border-red-200 text-red-800 space-y-1 text-[11px]">
              <div class="font-bold uppercase text-[10px] text-red-600">{{ 'CANCEL.DETAILS_HEADER' | translate }}:</div>
              <div><strong>{{ 'CANCEL.REASON_LABEL' | translate }}:</strong> {{ selectedRental.cancellation_reason || selectedRental.cancellationReason || 'N/A' }}</div>
              <div *ngIf="selectedRental.cancellation_remarks || selectedRental.cancellationRemarks">
                <strong>{{ 'CANCEL.REMARKS_LABEL' | translate }}:</strong> {{ selectedRental.cancellation_remarks || selectedRental.cancellationRemarks }}
              </div>
              <div><strong>{{ 'CANCEL.CANCELLED_BY' | translate }}:</strong> {{ selectedRental.cancelled_by || selectedRental.cancelledBy || 'Cashier' }} at {{ (selectedRental.cancelled_at || selectedRental.cancelledAt) | date:'short' }}</div>
            </div>

            <!-- Financials Breakdown (With Split Payment Breakdown & Discount Reason) -->
            <div class="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5">
              <div class="flex justify-between" *ngIf="selectedRental.deposit_amount || selectedRental.depositAmount">
                <span class="text-slate-500">{{ 'POS.DEPOSIT_AMOUNT' | translate }}:</span>
                <span class="font-mono font-bold">{{ (selectedRental.deposit_amount || selectedRental.depositAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ 'POS.CALCULATED_CHARGE' | translate }}:</span>
                <span class="font-mono font-bold">{{ (selectedRental.rental_amount || selectedRental.rentalAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
              </div>
              <div *ngIf="selectedRental.discount && +selectedRental.discount > 0" class="flex justify-between text-green-600">
                <span>{{ 'RECEIPT.DISCOUNT' | translate }} <span *ngIf="selectedRental.discount_type || selectedRental.discountType">({{ selectedRental.discount_type || selectedRental.discountType }})</span>:</span>
                <span class="font-mono font-bold">-{{ selectedRental.discount | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
              </div>
              <div *ngIf="selectedRental.discount_reason || selectedRental.discountReason" class="text-[10px] text-emerald-700 italic pl-2">
                Reason: {{ selectedRental.discount_reason || selectedRental.discountReason }}
              </div>
              <div class="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                <span>{{ 'RECEIPT.TOTAL_PAID' | translate }}:</span>
                <span class="font-mono text-indigo-600">{{ (selectedRental.total_amount || selectedRental.totalAmount || '0.000') | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
              </div>
              <div *ngIf="(selectedRental.change_returned || selectedRental.changeReturned) && +(selectedRental.change_returned || selectedRental.changeReturned) > 0" class="flex justify-between text-emerald-700 font-bold">
                <span>{{ 'POS.RETURN_TO_CUSTOMER' | translate }}:</span>
                <span class="font-mono">{{ (selectedRental.change_returned || selectedRental.changeReturned) | number:'1.3-3' }} {{ 'COMMON.KWD' | translate }}</span>
              </div>
              <div class="flex justify-between text-[11px] text-slate-500">
                <span>{{ 'POS.PAYMENT_METHOD' | translate }}:</span>
                <span class="font-bold">{{ selectedRental.payment_method || selectedRental.paymentMethod || 'CASH' }}</span>
              </div>
              <!-- Split Payment Display -->
              <div *ngIf="selectedRental.payment_method === 'SPLIT' || (selectedRental.cash_amount > 0 && selectedRental.knet_amount > 0)" class="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5 text-[10px]">
                <div class="flex justify-between text-slate-600">
                  <span>• Cash Paid:</span>
                  <span class="font-mono font-bold">{{ (selectedRental.cash_amount || 0) | number:'1.3-3' }} KD</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>• KNET Paid:</span>
                  <span class="font-mono font-bold">{{ (selectedRental.knet_amount || 0) | number:'1.3-3' }} KD</span>
                </div>
              </div>
              <div *ngIf="selectedRental.settlement_remarks || selectedRental.settlementRemarks" class="pt-1.5 text-[11px] text-slate-600 border-t border-slate-100">
                <span class="font-bold">{{ 'POS.REMARKS' | translate }}:</span>
                <span>{{ selectedRental.settlement_remarks || selectedRental.settlementRemarks }}</span>
              </div>
            </div>

            <!-- Rate Tariff Footer (Requirement 9) -->
            <div class="bg-slate-50 border border-slate-200 rounded p-2 text-left font-mono text-[9px] text-slate-600 leading-tight">
              <div class="font-bold text-[10px] text-slate-800 text-center mb-1">Rate Tariff</div>
              <div class="flex justify-between"><span>First Hour – Single Car:</span><span class="font-bold">KWD 1.000</span></div>
              <div class="flex justify-between"><span>First Hour – Double Car:</span><span class="font-bold">KWD 2.000</span></div>
              <div class="flex justify-between"><span>Additional Half-Hour – Single:</span><span class="font-bold">KWD 0.500</span></div>
              <div class="flex justify-between"><span>Additional Half-Hour – Double:</span><span class="font-bold">KWD 1.000</span></div>
            </div>

            <div class="text-center text-[10px] text-slate-400">
              Your Events Management Company &bull; Automated Thermal POS
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button (click)="closeViewModal()" class="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
              {{ 'COMMON.CLOSE' | translate }}
            </button>
            <button (click)="printDuplicateDirect(selectedRental)" class="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              <span>{{ 'DUPLICATE.PRINT_BTN' | translate }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 2A: CANCELLATION PRIOR CONFIRMATION DIALOG         -->
      <!-- ======================================================== -->
      <div *ngIf="isCancelPriorConfirmOpen && billToCancel" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-red-300">
          
          <div class="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">⚠️</span>
              <div>
                <h3 class="font-extrabold text-sm leading-tight">{{ isArabic() ? 'تأكيد طلب إلغاء الفاتورة' : 'Confirm Bill Cancellation Request' }}</h3>
                <p class="text-[11px] text-red-100 font-medium">{{ isArabic() ? 'يرجى مراجعة تفاصيل الفاتورة قبل المتابعة' : 'Prior confirmation before supervisor authorization' }}</p>
              </div>
            </div>
            <button (click)="closeCancelPriorConfirm()" class="text-white/80 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
          </div>

          <div class="p-5 flex flex-col gap-3.5 text-slate-800 text-xs bg-slate-50/50">
            
            <div class="bg-red-50 p-3.5 rounded-xl border border-red-200 text-red-900 text-xs leading-relaxed">
              <strong>{{ isArabic() ? 'تحذير هام:' : 'Important Warning:' }}</strong>
              {{ isArabic() ? 'هل أنت متأكد من رغبتك في إلغاء هذه الفاتورة؟ سيتم إلغاء العملية وتحرير السيارة وإرجاعها لحالة متاح.' : 'Are you sure you want to request cancellation for this bill? This action cannot be reversed and will void the transaction.' }}
            </div>

            <!-- Bill Summary Card -->
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div class="flex justify-between items-center pb-2 border-b border-slate-100">
                <span class="text-slate-500 font-medium">{{ 'RECEIPT.INVOICE_NO' | translate }}:</span>
                <span class="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{{ billToCancel.invoice_no || billToCancel.invoiceNo }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">{{ 'POS.CUSTOMER_NAME' | translate }}:</span>
                <span class="font-bold text-slate-800">{{ billToCancel.customer_name || billToCancel.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">{{ 'RECEIPT.CAR' | translate }}:</span>
                <span class="font-bold text-slate-800">#{{ billToCancel.car_no || billToCancel.carNo }} ({{ billToCancel.model }})</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">{{ 'RECEIPT.TOTAL_PAID' | translate }}:</span>
                <span class="font-mono font-black text-slate-900 text-sm">{{ billToCancel.total_amount || billToCancel.totalAmount }} {{ 'COMMON.KWD' | translate }}</span>
              </div>
              <div class="flex justify-between text-[11px] text-slate-500" *ngIf="billToCancel.created_at">
                <span>{{ 'COMMON.DATE' | translate }}:</span>
                <span>{{ billToCancel.created_at | date:'short' }}</span>
              </div>
            </div>

            <div class="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <span class="text-base shrink-0">🛡️</span>
              <div>
                <strong>{{ isArabic() ? 'مطلوب إذن المشرف / المدير:' : 'Supervisor / Manager Authorization Required:' }}</strong>
                {{ isArabic() ? 'في الخطوة التالية، يلزم تسجيل دخول المشرف أو المدير لاعتماد الإلغاء وحفظ سجل التدقيق.' : 'In the next step, a Supervisor or Manager must log in with their credentials to authorize this cancellation.' }}
              </div>
            </div>

          </div>

          <div class="p-3.5 bg-slate-50 border-t border-slate-200 flex gap-2.5 justify-end shrink-0">
            <button (click)="closeCancelPriorConfirm()" class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
              {{ isArabic() ? 'إلغاء / تراجع' : 'Keep Bill / Cancel' }}
            </button>
            <button (click)="proceedToSupervisorAuth()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md">
              <span>{{ isArabic() ? 'متابعة إلى اعتماد المشرف' : 'Proceed to Manager Login' }}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>

        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 2B: SUPERVISOR / MANAGER LOGIN & AUTHORIZATION     -->
      <!-- ======================================================== -->
      <div *ngIf="isCancelModalOpen && billToCancel" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-red-300">
          
          <div class="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-red-500">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white text-base shadow-sm">
                🔒
              </div>
              <div>
                <h3 class="font-extrabold text-sm leading-tight flex items-center gap-2">
                  <span>{{ isArabic() ? 'تسجيل دخول المشرف / المدير' : 'Supervisor / Manager Authorization' }}</span>
                </h3>
                <p class="text-[11px] text-slate-300 font-medium">Invoice #{{ billToCancel.invoice_no || billToCancel.invoiceNo }}</p>
              </div>
            </div>
            <button (click)="closeCancelModal()" class="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
          </div>

          <div class="p-5 flex flex-col gap-3.5 text-slate-800 text-xs bg-slate-50/50">
            
            <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px] leading-relaxed">
              {{ isArabic() ? 'يجب على المشرف أو المدير تسجيل الدخول لاعتماد إلغاء الفاتورة. سيتم تسجيل اسم المدير وسجل التدقيق.' : 'A Supervisor or Manager must enter their login credentials to authorize cancelling this bill. The audit trail will record this authorization.' }}
            </div>

            <!-- Supervisor Login Credentials -->
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <span>🔑</span>
                <span>{{ isArabic() ? 'بيانات المشرف / المدير' : 'Supervisor / Manager Credentials' }}</span>
              </div>

              <!-- Supervisor Username -->
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                  <span>{{ isArabic() ? 'اسم مستخدم المدير / المشرف' : 'Manager / Supervisor Username' }}</span>
                  <span class="text-red-500 font-black">*</span>
                </label>
                <div class="relative">
                  <input 
                    type="text" 
                    [(ngModel)]="supervisorUsername" 
                    placeholder="e.g. yahia.zakariya or admin" 
                    autocomplete="off"
                    class="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium" />
                  <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
              </div>

              <!-- Supervisor Password -->
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                  <span>{{ isArabic() ? 'كلمة مرور المدير / المشرف' : 'Manager / Supervisor Password' }}</span>
                  <span class="text-red-500 font-black">*</span>
                </label>
                <div class="relative">
                  <input 
                    type="password" 
                    [(ngModel)]="supervisorPassword" 
                    placeholder="••••••••" 
                    autocomplete="new-password"
                    class="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium" />
                  <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
              </div>
            </div>

            <!-- Mandatory Reason -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                <span>{{ 'CANCEL.REASON_LABEL' | translate }}</span>
                <span class="text-red-500 font-black">*</span>
              </label>
              <select [(ngModel)]="cancelReasonId" (change)="onReasonSelect()" class="border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-red-500 bg-white">
                <option value="">-- {{ 'CANCEL.REASON_PLACEHOLDER' | translate }} --</option>
                <option *ngFor="let r of cancellationReasons()" [value]="r.id">
                  {{ isArabic() ? r.arabic_name : r.english_name }}
                </option>
              </select>
            </div>

            <!-- Mandatory Remarks -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                <span>{{ 'CANCEL.REMARKS_LABEL' | translate }}</span>
                <span class="text-red-500 font-black">*</span>
              </label>
              <textarea 
                [(ngModel)]="cancelRemarks" 
                rows="2" 
                [placeholder]="'CANCEL.REMARKS_PLACEHOLDER' | translate" 
                class="border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-red-500 bg-white"></textarea>
            </div>

            <div *ngIf="cancelError" class="p-2.5 rounded-lg bg-red-100 border border-red-300 text-red-700 font-bold text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{{ cancelError }}</span>
            </div>
          </div>

          <div class="p-3.5 bg-slate-50 border-t border-slate-200 flex gap-2.5 justify-end shrink-0">
            <button (click)="closeCancelModal()" [disabled]="cancelling()" class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="confirmCancelBill()" [disabled]="cancelling() || !supervisorUsername || !supervisorPassword || !cancelReasonId || !cancelRemarks" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              <span *ngIf="cancelling()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>🔒 {{ isArabic() ? 'اعتماد وإلغاء الفاتورة' : 'Authorize & Cancel Bill' }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 3: PRINTER CONFIGURATION MODAL                     -->
      <!-- ======================================================== -->
      <div *ngIf="isPrinterModalOpen" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          
          <div class="bg-slate-800 p-4 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
              <h3 class="font-bold text-sm">{{ 'PRINTER.SETTINGS_TITLE' | translate }}</h3>
            </div>
            <span class="text-[10px] bg-slate-700 text-indigo-300 px-2 py-0.5 rounded font-mono">{{ printerConfig.interfaceType }}</span>
          </div>

          <div class="p-6 flex flex-col gap-4 text-slate-800 text-xs">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.NAME' | translate }}</label>
                <input type="text" [(ngModel)]="printerConfig.printerName" class="border border-slate-300 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.INTERFACE_TYPE' | translate }}</label>
                <select [(ngModel)]="printerConfig.interfaceType" class="border border-slate-300 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="LAN">LAN / Network (TCP Socket)</option>
                  <option value="USB">USB / Windows Spooler</option>
                  <option value="VIRTUAL">Virtual (Test & Development)</option>
                </select>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.IP_ADDRESS' | translate }}</label>
                <input type="text" [(ngModel)]="printerConfig.ipAddress" placeholder="192.168.1.200" class="border border-slate-300 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.PORT' | translate }}</label>
                <input type="number" [(ngModel)]="printerConfig.port" placeholder="9100" class="border border-slate-300 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.PAPER_WIDTH' | translate }}</label>
                <select [(ngModel)]="printerConfig.paperWidth" class="border border-slate-300 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="80mm">80mm (Standard POS Roll)</option>
                  <option value="58mm">58mm (Compact Mobile Roll)</option>
                </select>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.ENCODING' | translate }}</label>
                <select [(ngModel)]="printerConfig.encoding" class="border border-slate-300 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="CP864">CP864 (Arabic Standard ESC/POS)</option>
                  <option value="CP437">CP437 (English / Western)</option>
                  <option value="UTF-8">UTF-8 Raw</option>
                </select>
              </div>
            </div>

            <div class="flex items-center gap-6 pt-2 border-t border-slate-200">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="printerConfig.autoCut" class="rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs font-medium">{{ 'PRINTER.AUTO_CUT' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="printerConfig.cashDrawer" class="rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs font-medium">{{ 'PRINTER.DRAWER_KICK' | translate }}</span>
              </label>
            </div>

            <!-- Test Print Feedback Box -->
            <div *ngIf="testPrintResult" class="p-3 rounded-lg text-xs" [ngClass]="testPrintResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'">
              {{ testPrintResult.message }} ({{ testPrintResult.latencyMs }}ms)
            </div>
          </div>

          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-between items-center">
            <button (click)="runTestPrint()" [disabled]="testingPrint()" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <span *ngIf="testingPrint()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ 'PRINTER.TEST_BTN' | translate }}</span>
            </button>

            <div class="flex gap-2">
              <button (click)="closePrinterModal()" class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                {{ 'COMMON.CANCEL' | translate }}
              </button>
              <button (click)="savePrinterSettings()" [disabled]="savingPrinter()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50">
                <span *ngIf="savingPrinter()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ 'COMMON.SAVE' | translate }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- ======================================================== -->
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
                  <span class="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-800 rounded-md border border-indigo-200 flex items-center gap-1 shadow-2xs">
                    <span>🔒</span>
                    <span>{{ isCurrentCarDouble() ? 'Double Seater Fleet' : 'Single Seater Fleet' }}</span>
                  </span>
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
                  <p>No other {{ isCurrentCarDouble() ? 'Double Seater' : 'Single Seater' }} replacement cars are currently available in the fleet.</p>
                  <p class="font-normal text-amber-700 text-[11px] mt-0.5">Changing car is restricted to the same vehicle type (Single ➔ Single, Double ➔ Double).</p>
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
              (click)="promptCarChangeConfirmation()" 
              [disabled]="!changeCarTargetId() || changeCarProcessing() || availableCarsForChange().length === 0" 
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md transition">
              <span *ngIf="changeCarProcessing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span *ngIf="!changeCarProcessing()">🔄</span>
              <span>{{ 'POS.CONFIRM_CAR_CHANGE' | translate }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 5B: CHANGE CAR CONFIRMATION PROMPT DIALOG          -->
      <!-- ======================================================== -->
      <div *ngIf="isConfirmCarChangePromptOpen && changeCarRental" class="fixed inset-0 bg-slate-950/70 z-60 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-indigo-200">
          
          <div class="bg-gradient-to-r from-indigo-700 to-indigo-900 p-4 text-white flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">⚠️</span>
              <div>
                <h3 class="font-extrabold text-sm leading-tight">{{ isArabic() ? 'تأكيد تغيير السيارة' : 'Confirm Car Assignment Change' }}</h3>
                <p class="text-[11px] text-indigo-200 font-medium">{{ isArabic() ? 'يرجى مراجعة تفاصيل التبديل وتأكيد الإجراء' : 'Please review and confirm this car reassignment' }}</p>
              </div>
            </div>
            <button type="button" (click)="cancelCarChangeConfirmation()" class="text-white/70 hover:text-white text-lg font-bold">&times;</button>
          </div>

          <div class="p-5 space-y-3.5 text-xs text-slate-700 bg-slate-50/50">
            <p class="font-bold text-slate-800">
              {{ isArabic() ? 'هل أنت متأكد من رغبتك في تبديل السيارة المخصصة للفاتورة رقم' : 'Are you sure you want to change the car assigned to Invoice' }} 
              <span class="font-mono text-indigo-700 font-black">#{{ changeCarRental.invoice_no || changeCarRental.invoiceNo }}</span>؟
            </p>

            <!-- Comparison Visual Card -->
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div class="flex items-center justify-between">
                <!-- Current Car -->
                <div class="flex-1 bg-red-50/80 p-2.5 rounded-lg border border-red-200/70 text-center">
                  <div class="text-[10px] font-bold text-red-600 uppercase">{{ isArabic() ? 'السيارة الحالية' : 'Current Car' }}</div>
                  <div class="font-black text-sm text-slate-900 mt-0.5">#{{ changeCarRental.car_no || changeCarRental.carNo }}</div>
                  <div class="text-[11px] text-slate-600 font-medium truncate">{{ changeCarRental.model }}</div>
                </div>

                <div class="px-2 text-indigo-600 text-lg font-black">➔</div>

                <!-- Replacement Car -->
                <div class="flex-1 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/70 text-center">
                  <div class="text-[10px] font-bold text-emerald-600 uppercase">{{ isArabic() ? 'السيارة البديلة' : 'Replacement Car' }}</div>
                  <div class="font-black text-sm text-slate-900 mt-0.5">#{{ selectedChangeTargetCar()?.carNo || selectedChangeTargetCar()?.car_no }}</div>
                  <div class="text-[11px] text-slate-600 font-medium truncate">{{ selectedChangeTargetCar()?.model }}</div>
                </div>
              </div>

              <div class="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                <div class="flex justify-between">
                  <span class="text-slate-400">{{ 'POS.CUSTOMER_NAME' | translate }}:</span>
                  <span class="font-bold text-slate-800">{{ changeCarRental.customer_name || changeCarRental.customerName || ('POS.WALK_IN_CUSTOMER' | translate) }}</span>
                </div>
                <div class="flex justify-between" *ngIf="changeCarReason">
                  <span class="text-slate-400">{{ isArabic() ? 'السبب:' : 'Reason:' }}</span>
                  <span class="font-medium text-slate-800 truncate max-w-[200px]" [title]="changeCarReason">{{ changeCarReason }}</span>
                </div>
              </div>
            </div>

            <div class="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] leading-relaxed">
              📋 <strong>{{ isArabic() ? 'سجل التدقيق:' : 'Audit Trail Notice:' }}</strong>
              {{ isArabic() ? 'سيتم تحرير السيارة الحالية كـ "متاح" وحجز السيارة الجديدة، وحفظ العملية في سجل التدقيق.' : 'This action will release Car #' + (changeCarRental.car_no || changeCarRental.carNo) + ' back to Available, rent Car #' + (selectedChangeTargetCar()?.carNo || selectedChangeTargetCar()?.car_no) + ', and maintain a full audit log entry.' }}
            </div>
          </div>

          <div class="p-3 bg-slate-50 border-t border-slate-200 flex gap-2.5 justify-end">
            <button 
              type="button" 
              (click)="cancelCarChangeConfirmation()" 
              [disabled]="changeCarProcessing()"
              class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button 
              type="button" 
              (click)="executeConfirmedCarChange()" 
              [disabled]="changeCarProcessing()" 
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50">
              <span *ngIf="changeCarProcessing()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ isArabic() ? 'نعم، قم بتغيير السيارة' : 'Yes, Confirm & Change Car' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 4: AUDIT LOG VIEWER MODAL                          -->
      <!-- ======================================================== -->
      <div *ngIf="isAuditModalOpen" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-slate-200 max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          
          <div class="bg-slate-800 p-4 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              <h3 class="font-bold text-sm">{{ 'BILLS.AUDIT_LOG_TITLE' | translate }}</h3>
            </div>
            <button (click)="closeAuditModal()" class="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
          </div>

          <div class="p-4 overflow-y-auto flex-1 text-xs">
            <table class="w-full text-left text-slate-600">
              <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th class="px-3 py-2">{{ 'COMMON.DATE' | translate }}</th>
                  <th class="px-3 py-2">{{ 'RECEIPT.INVOICE_NO' | translate }}</th>
                  <th class="px-3 py-2">{{ 'COMMON.ACTION' | translate }}</th>
                  <th class="px-3 py-2">{{ 'SHIFT.CASHIER' | translate }}</th>
                  <th class="px-3 py-2">{{ 'PRINTER.NAME' | translate }}</th>
                  <th class="px-3 py-2">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="px-3 py-2">{{ 'CANCEL.REMARKS_LABEL' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let l of auditLogs()" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-mono text-[11px]">{{ l.created_at | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                  <td class="px-3 py-2 font-mono font-bold text-slate-900">{{ l.invoice_no }}</td>
                  <td class="px-3 py-2 font-bold">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                          [ngClass]="{
                            'bg-indigo-100 text-indigo-800 border border-indigo-200': l.action === 'CAR_CHANGE' || l.action === 'CAR_SWAP',
                            'bg-red-100 text-red-800 border border-red-200': l.action === 'BILL_CANCELLATION' || l.action === 'CANCEL_BILL_PRINT',
                            'bg-amber-100 text-amber-800 border border-amber-200': l.action === 'DUPLICATE_PRINT',
                            'bg-slate-100 text-slate-700 border border-slate-200': l.action !== 'CAR_CHANGE' && l.action !== 'CAR_SWAP' && l.action !== 'BILL_CANCELLATION' && l.action !== 'CANCEL_BILL_PRINT' && l.action !== 'DUPLICATE_PRINT'
                          }">
                      <span *ngIf="l.action === 'CAR_CHANGE' || l.action === 'CAR_SWAP'">🔄</span>
                      <span *ngIf="l.action === 'BILL_CANCELLATION' || l.action === 'CANCEL_BILL_PRINT'">🚫</span>
                      <span *ngIf="l.action === 'DUPLICATE_PRINT'">🖨️</span>
                      <span>{{ l.action }}</span>
                    </span>
                  </td>
                  <td class="px-3 py-2 font-semibold">{{ l.username }}</td>
                  <td class="px-3 py-2 text-slate-500">{{ l.printer_name || 'N/A' }}</td>
                  <td class="px-3 py-2">
                    <span class="px-2 py-0.5 rounded text-[9px] font-bold" 
                          [ngClass]="l.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : (l.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700')">
                      {{ l.status }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-slate-500 text-[10px] max-w-xs truncate" [title]="l.remarks || ''">{{ l.remarks || '-' }}</td>
                </tr>
                <tr *ngIf="auditLogs().length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-slate-400">{{ 'COMMON.NO_RECORDS' | translate }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button (click)="closeAuditModal()" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition cursor-pointer">
              {{ 'COMMON.CLOSE' | translate }}
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class BillsComponent implements OnInit {
  private api = inject(ApiService);
  private printService = inject(PrintService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);

  rentals = signal<any[]>([]);
  cars = signal<any[]>([]);
  cancellationReasons = signal<any[]>([]);
  auditLogs = signal<any[]>([]);
  loading = signal(false);

  // Change Car State
  isChangeCarModalOpen = false;
  isConfirmCarChangePromptOpen = false;
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

  isCurrentCarDouble(): boolean {
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
      const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\D/g, ''), 10) || 0;
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
  });

  // Search & Filter State
  searchQuery = signal<string>('');
  activeSalesBusinessDate = signal<string>(localStorage.getItem('salesDate') || new Date().toISOString().split('T')[0]);
  salesDateFilter = signal<string>(localStorage.getItem('salesDate') || new Date().toISOString().split('T')[0]);
  statusFilter = signal<string>('ALL');

  yesterdayDateStr = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Modal States
  isViewModalOpen = false;
  selectedRental: any = null;

  isCancelPriorConfirmOpen = false;
  isCancelModalOpen = false;
  billToCancel: any = null;
  supervisorUsername = '';
  supervisorPassword = '';
  cancelReasonId = '';
  cancelReasonText = '';
  cancelRemarks = '';
  cancelling = signal(false);
  cancelError = '';

  isPrinterModalOpen = false;
  printerConfig: any = {
    printerName: 'Counter 1 Thermal Printer',
    interfaceType: 'LAN',
    ipAddress: '192.168.1.200',
    port: 9100,
    paperWidth: '80mm',
    encoding: 'CP864',
    autoCut: true,
    cashDrawer: false,
    isActive: true
  };
  savingPrinter = signal(false);
  testingPrint = signal(false);
  testPrintResult: any = null;

  isAuditModalOpen = false;
  printingId = signal<number | null>(null);

  formatDateToYMD(dtStr: any): string {
    if (!dtStr) return '';
    try {
      const d = new Date(dtStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {}
    return String(dtStr).split('T')[0];
  }

  getRentalSalesDate(r: any): string {
    if (r.business_date || r.businessDate) {
      return String(r.business_date || r.businessDate).split('T')[0];
    }
    return this.formatDateToYMD(r.start_time || r.startTime || r.created_at || r.createdAt);
  }

  matchesSalesDate(r: any, targetDate: string): boolean {
    if (!targetDate || targetDate === 'ALL') return true;
    const bDate = (r.business_date || r.businessDate) ? String(r.business_date || r.businessDate).split('T')[0] : '';
    const sDate = this.formatDateToYMD(r.start_time || r.startTime);
    const cDate = this.formatDateToYMD(r.created_at || r.createdAt);
    const rawSDate = String(r.start_time || r.startTime || '').split('T')[0];
    const rawCDate = String(r.created_at || r.createdAt || '').split('T')[0];
    return bDate === targetDate || sDate === targetDate || cDate === targetDate || rawSDate === targetDate || rawCDate === targetDate;
  }

  filteredRentals = computed(() => {
    let list = this.rentals();
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const sDate = this.salesDateFilter();

    // 1. Sales Date filter: show sales matching business_date or start_time/created_at date
    if (sDate && sDate !== 'ALL') {
      list = list.filter(r => this.matchesSalesDate(r, sDate));
    }

    // 2. Status filter
    if (st !== 'ALL') {
      list = list.filter(r => (r.status || '').toUpperCase() === st);
    }

    // 3. Search query
    if (q) {
      list = list.filter(r => 
        (r.invoice_no && r.invoice_no.toLowerCase().includes(q)) ||
        (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q)) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.customer_phone && r.customer_phone.includes(q)) ||
        (r.customerPhone && r.customerPhone.includes(q)) ||
        (r.car_no && r.car_no.toLowerCase().includes(q)) ||
        (r.carNo && r.carNo.toLowerCase().includes(q))
      );
    }
    return list;
  });

  activeCount = computed(() => this.filteredRentals().filter(r => r.status === 'ACTIVE').length);
  completedCount = computed(() => this.filteredRentals().filter(r => r.status === 'COMPLETED').length);
  cancelledCount = computed(() => this.filteredRentals().filter(r => r.status === 'CANCELLED').length);
  totalSalesAmount = computed(() => {
    return this.filteredRentals()
      .filter(r => r.status === 'COMPLETED')
      .reduce((acc, r) => acc + Number(r.total_amount || r.totalAmount || 0), 0);
  });

  ngOnInit() {
    this.api.getSalesDate().subscribe({
      next: (res) => {
        if (res?.salesDate) {
          this.activeSalesBusinessDate.set(res.salesDate);
          this.salesDateFilter.set(res.salesDate);
          localStorage.setItem('salesDate', res.salesDate);
          this.loadRentals(true);
        } else {
          this.loadRentals(true);
        }
      },
      error: () => {
        this.loadRentals(true);
      }
    });

    this.loadCars();
    this.loadCancellationReasons();
    this.loadPrinterSettings();
  }

  isArabic(): boolean {
    return this.translateService.currentLang() === 'ar';
  }

  getCurrentUser(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) return JSON.parse(raw).username || 'Cashier';
    } catch (e) {}
    return 'Cashier';
  }

  loadRentals(fallbackToAllIfEmpty = false) {
    this.loading.set(true);
    const dateParam = this.salesDateFilter();
    this.api.getRentals({ date: dateParam !== 'ALL' ? dateParam : undefined }).subscribe({
      next: (data) => {
        const rows = data || [];
        if (fallbackToAllIfEmpty && rows.length === 0 && dateParam !== 'ALL') {
          this.salesDateFilter.set('ALL');
          this.loadRentals(false);
          return;
        }
        this.rentals.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading bills:', err);
        this.loading.set(false);
      }
    });
  }

  onSalesDateChange(newDate: string) {
    this.salesDateFilter.set(newDate || 'ALL');
    this.loadRentals();
  }

  setSalesDateToday() {
    const today = this.activeSalesBusinessDate() || new Date().toISOString().split('T')[0];
    this.salesDateFilter.set(today);
    this.loadRentals();
  }

  setSalesDateYesterday() {
    this.salesDateFilter.set(this.yesterdayDateStr());
    this.loadRentals();
  }

  setSalesDateAll() {
    this.salesDateFilter.set('ALL');
    this.loadRentals();
  }

  loadCancellationReasons() {
    this.api.getCancellationReasons().subscribe({
      next: (reasons) => {
        this.cancellationReasons.set(reasons || []);
      }
    });
  }

  loadPrinterSettings() {
    this.api.getPrinterSettings().subscribe({
      next: (cfg) => {
        if (cfg) this.printerConfig = { ...cfg };
      }
    });
  }

  // 1. View Bill Action (On-Screen Preview, Audits View, No Print Dialog)
  viewBill(rental: any) {
    this.selectedRental = rental;
    this.isViewModalOpen = true;

    // Log view audit
    this.api.auditBillView(rental.invoice_no || rental.invoiceNo, {
      username: this.getCurrentUser(),
      terminal: 'POS-Terminal-1',
      location: localStorage.getItem('currentLocation') || 'Main Counter'
    }).subscribe();
  }

  closeViewModal() {
    this.isViewModalOpen = false;
    this.selectedRental = null;
  }

  // 2. Direct Thermal Duplicate Print (Zero Print Dialog)
  printDuplicateDirect(rental: any) {
    const invNo = rental.invoice_no || rental.invoiceNo;
    this.printingId.set(rental.id);

    const lang = this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH';

    this.api.printDuplicateBill(invNo, {
      username: this.getCurrentUser(),
      terminal: 'POS-Terminal-1',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      language: lang,
    }).subscribe({
      next: (res: any) => {
        this.printingId.set(null);
        if (res.printStatus?.success) {
          alert(`✅ ${this.translateService.translate('DUPLICATE.PRINT_SUCCESS')}\n${res.printStatus.message}`);
        } else {
          alert(`⚠️ ${this.translateService.translate('DUPLICATE.PRINT_WARNING')}\n${res.printStatus?.error || 'Printer connection issue'}`);
        }
        this.loadRentals();
      },
      error: (err: any) => {
        this.printingId.set(null);
        alert(`❌ ${this.translateService.translate('MESSAGE.SERVER_ERROR')}: ` + (err.error?.error || err.message));
      }
    });
  }

  // 3. Cancel Bill Modal & Submission (Prior Confirmation -> Supervisor/Manager Login Authorization)
  openCancelPriorConfirm(rental: any) {
    this.billToCancel = rental;
    this.isCancelPriorConfirmOpen = true;
    this.isCancelModalOpen = false;
    this.cancelError = '';
  }

  closeCancelPriorConfirm() {
    this.isCancelPriorConfirmOpen = false;
    this.billToCancel = null;
  }

  proceedToSupervisorAuth() {
    this.isCancelPriorConfirmOpen = false;
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.cancelReasonId = '';
    this.cancelReasonText = '';
    this.cancelRemarks = '';
    this.cancelError = '';
    this.isCancelModalOpen = true;
  }

  openCancelModal(rental: any) {
    // Legacy alias: triggers prior confirmation first
    this.openCancelPriorConfirm(rental);
  }

  closeCancelModal() {
    this.isCancelModalOpen = false;
    this.isCancelPriorConfirmOpen = false;
    this.billToCancel = null;
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.cancelError = '';
  }

  onReasonSelect() {
    const found = this.cancellationReasons().find(r => r.id === this.cancelReasonId);
    if (found) {
      this.cancelReasonText = this.isArabic() ? found.arabic_name : found.english_name;
    }
  }

  confirmCancelBill() {
    if (!this.supervisorUsername || !this.supervisorUsername.trim()) {
      this.cancelError = this.isArabic() 
        ? 'يرجى إدخال اسم مستخدم المشرف أو المدير.' 
        : 'Supervisor or Manager username is required.';
      return;
    }
    if (!this.supervisorPassword || !this.supervisorPassword.trim()) {
      this.cancelError = this.isArabic() 
        ? 'يرجى إدخال كلمة مرور المشرف أو المدير.' 
        : 'Supervisor or Manager password is required.';
      return;
    }
    if (!this.cancelReasonId || !this.cancelReasonText) {
      this.cancelError = this.translateService.translate('CANCEL.ERR_REASON_REQUIRED') || 'Cancellation reason is required.';
      return;
    }
    if (!this.cancelRemarks || this.cancelRemarks.trim().length < 3) {
      this.cancelError = this.translateService.translate('CANCEL.ERR_REMARKS_REQUIRED') || 'Cancellation remarks are required.';
      return;
    }

    this.cancelling.set(true);
    this.cancelError = '';

    const lang = this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH';

    const payload = {
      reasonId: this.cancelReasonId,
      reason: this.cancelReasonText,
      remarks: this.cancelRemarks.trim(),
      supervisorUsername: this.supervisorUsername.trim(),
      supervisorPassword: this.supervisorPassword.trim(),
      username: this.getCurrentUser(),
      terminal: 'POS-Terminal-1',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      language: lang,
    };

    this.api.cancelBill(this.billToCancel.id || this.billToCancel.invoice_no, payload).subscribe({
      next: (res: any) => {
        this.cancelling.set(false);
        const inv = this.billToCancel.invoice_no || this.billToCancel.invoiceNo;
        this.closeCancelModal();
        alert(`✅ Bill ${inv} cancelled successfully with Manager Authorization.\n${res.printStatus?.message || ''}`);
        this.loadRentals();
        this.loadCars();
      },
      error: (err: any) => {
        this.cancelling.set(false);
        this.cancelError = err.error?.error || err.message || 'Authorization failed. Cancellation rejected.';
      }
    });
  }

  // 4. Printer Configuration Modal
  openPrinterModal() {
    this.loadPrinterSettings();
    this.testPrintResult = null;
    this.isPrinterModalOpen = true;
  }

  closePrinterModal() {
    this.isPrinterModalOpen = false;
  }

  savePrinterSettings() {
    this.savingPrinter.set(true);
    this.api.savePrinterSettings(this.printerConfig).subscribe({
      next: (res: any) => {
        this.savingPrinter.set(false);
        this.printerConfig = { ...res };
        alert(this.translateService.translate('PRINTER.SAVED_MSG'));
        this.closePrinterModal();
      },
      error: (err: any) => {
        this.savingPrinter.set(false);
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
      }
    });
  }

  runTestPrint() {
    this.testingPrint.set(true);
    this.testPrintResult = null;
    this.api.testPrinter(this.printerConfig).subscribe({
      next: (res: any) => {
        this.testingPrint.set(false);
        this.testPrintResult = res;
      },
      error: (err: any) => {
        this.testingPrint.set(false);
        this.testPrintResult = { success: false, message: err.error?.error || err.message, latencyMs: 0 };
      }
    });
  }

  // 5. Audit Log Modal
  openAuditModal() {
    this.api.getBillAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs.set(logs || []);
        this.isAuditModalOpen = true;
      }
    });
  }

  closeAuditModal() {
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
    this.isConfirmCarChangePromptOpen = false;
    this.changeCarRental = null;
    this.changeCarTargetId.set('');
    this.changeCarReason = '';
  }

  promptCarChangeConfirmation() {
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
    if (!targetCarObj) {
      alert('Selected replacement car could not be found.');
      return;
    }

    // Model type restriction check (Single to Double & Double to Single prohibited)
    const curIsDouble = String(rental.model || '').toLowerCase().includes('double');
    const targetIsDouble = String(targetCarObj?.model || '').toLowerCase().includes('double');
    if (curIsDouble !== targetIsDouble) {
      alert(curIsDouble
        ? 'Vehicle Type Restricted: Cannot change a Double Seater car to a Single Seater. Please choose a Double Seater car.'
        : 'Vehicle Type Restricted: Cannot change a Single Seater car to a Double Seater. Please choose a Single Seater car.');
      return;
    }

    // Open confirmation message modal
    this.isConfirmCarChangePromptOpen = true;
  }

  cancelCarChangeConfirmation() {
    this.isConfirmCarChangePromptOpen = false;
  }

  confirmChangeCar() {
    this.promptCarChangeConfirmation();
  }

  executeConfirmedCarChange() {
    const rental = this.changeCarRental;
    const newCarId = this.changeCarTargetId();
    if (!rental || !newCarId) return;

    const curCarId = String(rental.car_id || rental.carId || '');
    const curCarNo = String(rental.car_no || rental.carNo || '');
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
        this.isConfirmCarChangePromptOpen = false;
        this.closeChangeCarModal();
        alert(`✅ Car successfully changed from #${curCarNo} to #${res.newCarNo || targetCarNo}!\nAudit trail entry recorded.`);
        this.loadRentals();
        this.loadCars();
      },
      error: (err: any) => {
        this.changeCarProcessing.set(false);
        const msg = err.error?.error || err.message || 'Failed to change car';
        alert(`Error changing car: ${msg}`);
      }
    });
  }
}
