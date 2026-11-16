import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService, ThermalPaperWidth } from './print.service';
import { PermissionService } from './permission.service';

export type ShiftSummaryTab = 'OVERVIEW' | 'CASHIER' | 'BILLS' | 'CARS' | 'HOURLY' | 'CANCELLATIONS' | 'PAYMENTS';

@Component({
  selector: 'app-shift-close',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto flex flex-col items-center justify-start min-h-0 py-6 font-sans">
      <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 w-full max-w-5xl text-left my-auto space-y-6">
        
        <!-- Header & Shift Badges -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 bg-gradient-to-tr from-amber-500 to-orange-400 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-black text-slate-800 tracking-tight">{{ 'SHIFT.TITLE' | translate }}</h2>
                <span class="bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-200 uppercase">
                  Shift #{{ shift()?.shiftNumber || 1 }}
                </span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full" [ngClass]="shift()?.status === 'CLOSED' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'">
                  {{ shift()?.status || 'OPEN' }}
                </span>
              </div>
              <p class="text-slate-400 text-xs mt-0.5">{{ 'SHIFT.SUBTITLE' | translate }} &bull; Cashier: <strong class="text-slate-700">{{ currentEmployeeName() }}</strong></p>
            </div>
          </div>

          <!-- Quick Action Buttons: Thermal & A4 Print -->
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <button 
              type="button"
              (click)="printThermal('80mm')" 
              title="Print ESC/POS Thermal Slip"
              class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              <span>{{ 'PRINT.THERMAL_PRINT' | translate }}</span>
            </button>
            <button 
              type="button"
              (click)="printStandard()" 
              title="Print Standard A4 Slip"
              class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>{{ 'PRINT.PRINT_A4' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Ready For Day Close Alert if both shifts are closed -->
        <div *ngIf="shift()?.readyForDayClose" class="bg-amber-50 border border-amber-300 rounded-xl p-4 text-left">
          <div class="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
            <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{{ 'SHIFT.BOTH_SHIFTS_CLOSED' | translate }}</span>
          </div>
          <p class="text-xs text-amber-700 mb-3">{{ 'SHIFT.DAY_CLOSE_REQUIRED_MSG' | translate }}</p>
          <a routerLink="/day-close" class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 transition shadow-sm">
            <span>{{ 'NAV.DAY_CLOSING' | translate }}</span>
            <svg class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </a>
        </div>

        <!-- Loading Spinner -->
        <div *ngIf="loading()" class="py-12 text-slate-400 text-center">
          <div class="inline-flex items-center gap-2">
            <div class="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-bold">{{ 'SHIFT.LOADING' | translate }}</span>
          </div>
        </div>

        <!-- Navigation Tabs for Shift Summary Sections -->
        <div *ngIf="!loading()" class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
          <button type="button" (click)="activeTab.set('OVERVIEW')" [class]="activeTab() === 'OVERVIEW' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>📋 Financial Overview</span>
          </button>
          <button type="button" (click)="activeTab.set('CASHIER')" [class]="activeTab() === 'CASHIER' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>👤 1. Cashier Wise</span>
            <span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-mono">{{ shift()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('BILLS')" [class]="activeTab() === 'BILLS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>🧾 2. Bill Wise</span>
            <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-mono">{{ shift()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('CARS')" [class]="activeTab() === 'CARS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>🚗 3. CAR Wise</span>
            <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono">{{ shift()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('HOURLY')" [class]="activeTab() === 'HOURLY' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>⏰ 4. Hourly Sales</span>
            <span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{{ shift()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('CANCELLATIONS')" [class]="activeTab() === 'CANCELLATIONS' ? 'bg-white text-red-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>🚫 5. Cancellations</span>
            <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-mono">{{ shift()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('PAYMENTS')" [class]="activeTab() === 'PAYMENTS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>💳 6. Payment Types</span>
            <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ shift()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
          </button>
        </div>

        <!-- TAB 0: OVERVIEW & FINANCIAL SETTLEMENT -->
        <div *ngIf="!loading() && activeTab() === 'OVERVIEW'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <!-- Left Info Block -->
            <div class="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">{{ 'SHIFT.ACTIVE_CYCLE' | translate }}</span>
                <span class="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Shift {{ shift()?.shiftNumber || 1 }}
                </span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">{{ 'SHIFT.CASHIER' | translate }}</span>
                <span class="font-bold text-slate-800">{{ currentEmployeeName() }}</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">{{ 'SHIFT.STARTED_AT' | translate }}</span>
                <span class="font-mono font-bold text-slate-700">{{ (shift()?.startTime | date:'MMM dd, yyyy | HH:mm') || 'Now' }}</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">Total Cars Used</span>
                <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {{ shift()?.totalCarsUsed || shift()?.total_cars_used || 0 }} Cars
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-500 uppercase">{{ 'DAY_CLOSE.TOTAL_RENTALS' | translate }}</span>
                <span class="font-bold text-indigo-600">{{ shift()?.totalRentals || 0 }} {{ 'COMMON.TRIPS' | translate }}</span>
              </div>
            </div>

            <!-- Right Financial Breakdown Block -->
            <div class="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-600">Total Payments (Cash):</span>
                <span class="font-mono font-bold text-slate-900">{{ (shift()?.cashTotal || shift()?.cashAmount || '0.000') | number:'1.3-3' }} KD</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-600">Total Payments (KNET / Card):</span>
                <span class="font-mono font-bold text-slate-900">{{ (shift()?.knetTotal || shift()?.knetAmount || shift()?.cardAmount || '0.000') | number:'1.3-3' }} KD</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200 text-emerald-700">
                <span>Total Discounts Granted:</span>
                <span class="font-mono font-bold">-{{ (shift()?.totalDiscount || shift()?.discountAmount || '0.000') | number:'1.3-3' }} KD</span>
              </div>
              <div class="flex justify-between items-center pt-2 font-bold text-sm bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
                <span class="text-slate-900">Total Net Received:</span>
                <span class="font-mono font-black text-indigo-600 text-base">{{ (shift()?.overallTotal || shift()?.netRevenue || shift()?.totalRevenue || '0.000') | number:'1.3-3' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Closing Notes & Close Button -->
          <div *ngIf="!shift()?.readyForDayClose && shift()?.status !== 'CLOSED'" class="space-y-4 pt-2 border-t border-slate-200">
            <div class="flex flex-col gap-1.5 text-left">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'SHIFT.CLOSING_NOTES' | translate }}</label>
              <input type="text" [(ngModel)]="notes" [placeholder]="'SHIFT.NOTES_PLACEHOLDER' | translate" class="border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            </div>

            <!-- Primary Close Shift Button -->
            <button 
              (click)="startShiftCloseFlow()" 
              [disabled]="processing()" 
              class="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-orange-500/25 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ 'SHIFT.CONFIRM_BTN' | translate }} (#{{ shift()?.shiftNumber || 1 }})</span>
            </button>
          </div>
        </div>

        <!-- TAB 1: CASHIER-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CASHIER'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">1. Cashier-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Breakdown of Sales by Cashier</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Bills</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ shift()?.summaries?.cashierSummary?.totalBills || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-orange-200 shadow-2xs">
                <span class="text-[10px] font-bold text-orange-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-orange-600 font-mono">{{ shift()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th class="p-3">Cashier</th>
                  <th class="p-3 text-center">Bills Count</th>
                  <th class="p-3 text-right">Cash (KD)</th>
                  <th class="p-3 text-right">KNET / Card (KD)</th>
                  <th class="p-3 text-right">Discounts (KD)</th>
                  <th class="p-3 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let item of shift()?.summaries?.cashierSummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ item.cashier }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ item.billCount }}</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ item.cashTotal }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ item.knetTotal }}</td>
                  <td class="p-3 text-right font-mono text-emerald-600">-{{ item.discountTotal }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ item.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!shift()?.summaries?.cashierSummary?.items?.length">
                  <td colspan="6" class="p-6 text-center text-slate-400">No cashier records found for this shift.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td class="p-3 text-slate-900">Sales Total (All Cashiers)</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ shift()?.summaries?.cashierSummary?.totalBills || 0 }} Bills</td>
                  <td colspan="3" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-orange-600 text-sm">{{ shift()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 2: BILL-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'BILLS'" class="space-y-4">
          <!-- Sales Total Card & Search Filter -->
          <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">2. Bill-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Itemized Rental Bills</h3>
            </div>
            <div class="flex items-center gap-3">
              <input type="text" [(ngModel)]="billFilterText" placeholder="Search invoice, car, customer..." class="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-2xs shrink-0">
                <span class="text-[10px] font-bold text-blue-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-blue-600 font-mono">{{ shift()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200 max-h-[420px] overflow-y-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="p-3">Invoice #</th>
                  <th class="p-3">Car # / Model</th>
                  <th class="p-3">Customer Phone & Name</th>
                  <th class="p-3 text-center">Duration</th>
                  <th class="p-3 text-center">Payment</th>
                  <th class="p-3 text-right">Cash (KD)</th>
                  <th class="p-3 text-right">KNET (KD)</th>
                  <th class="p-3 text-right">Discount (KD)</th>
                  <th class="p-3 text-right font-black">Net Sales (KD)</th>
                  <th class="p-3">Cashier</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let b of getFilteredBills()" class="hover:bg-slate-50">
                  <td class="p-3 font-mono font-bold text-slate-800">{{ b.invoiceNo || b.id }}</td>
                  <td class="p-3">
                    <span class="font-bold text-slate-900">{{ b.carNo }}</span>
                    <span class="text-[10px] text-slate-400 block">{{ b.model }}</span>
                  </td>
                  <td class="p-3">
                    <span *ngIf="b.customerPhone" class="font-mono font-bold text-indigo-700 block">{{ b.customerPhone }}</span>
                    <span class="font-medium text-slate-700">{{ b.customerName }}</span>
                  </td>
                  <td class="p-3 text-center font-bold text-slate-600">{{ b.durationMinutes }}m</td>
                  <td class="p-3 text-center font-bold text-indigo-700">{{ b.paymentMethod }}</td>
                  <td class="p-3 text-right font-mono">{{ b.cashAmount }}</td>
                  <td class="p-3 text-right font-mono">{{ b.knetAmount }}</td>
                  <td class="p-3 text-right font-mono text-emerald-600">{{ b.discount > 0 ? '-' + b.discount : '0.000' }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ b.totalSales }} KD</td>
                  <td class="p-3 text-slate-500">{{ b.cashier }}</td>
                </tr>
                <tr *ngIf="!getFilteredBills().length">
                  <td colspan="10" class="p-6 text-center text-slate-400">No rental bills match the current view.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                <tr>
                  <td colspan="4" class="p-3 text-slate-900">Total Completed Bills: {{ shift()?.summaries?.billSummary?.totalBills || 0 }}</td>
                  <td colspan="4" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-blue-600 text-sm">{{ shift()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 3: CAR-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CARS'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">3. CAR-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Vehicle Utilization & Revenue</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Active Cars</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ shift()?.summaries?.carSummary?.totalCars || 0 }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Trips</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ shift()?.summaries?.carSummary?.totalTrips || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                <span class="text-[10px] font-bold text-emerald-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-emerald-600 font-mono">{{ shift()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th class="p-3">Car #</th>
                  <th class="p-3">Model / Class</th>
                  <th class="p-3 text-center">Trips Count</th>
                  <th class="p-3 text-center">Total Runtime</th>
                  <th class="p-3 text-right">Cash (KD)</th>
                  <th class="p-3 text-right">KNET (KD)</th>
                  <th class="p-3 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let cr of shift()?.summaries?.carSummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-mono font-bold text-slate-900">{{ cr.carNo }}</td>
                  <td class="p-3 font-medium text-slate-700">{{ cr.model || '-' }}</td>
                  <td class="p-3 text-center font-bold text-slate-800">{{ cr.tripCount }}</td>
                  <td class="p-3 text-center font-mono text-slate-600">{{ cr.totalMinutes }} mins</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ cr.cashTotal }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ cr.knetTotal }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ cr.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!shift()?.summaries?.carSummary?.items?.length">
                  <td colspan="7" class="p-6 text-center text-slate-400">No car activity records for this shift.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td colspan="2" class="p-3 text-slate-900">Total Cars: {{ shift()?.summaries?.carSummary?.totalCars || 0 }}</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ shift()?.summaries?.carSummary?.totalTrips || 0 }} Trips</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ shift()?.summaries?.carSummary?.totalMinutes || 0 }} mins</td>
                  <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-emerald-600 text-sm">{{ shift()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 4: HOURLY SALES-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'HOURLY'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">4. Hourly Sales-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Sales Volume Across Hours</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Bills</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ shift()?.summaries?.hourlySummary?.totalBills || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
                <span class="text-[10px] font-bold text-purple-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-purple-600 font-mono">{{ shift()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th class="p-3">Time Window</th>
                  <th class="p-3 text-center">Bills Count</th>
                  <th class="p-3 text-right">Cash (KD)</th>
                  <th class="p-3 text-right">KNET / Card (KD)</th>
                  <th class="p-3 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let h of shift()?.summaries?.hourlySummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ h.hourLabel || h.hourSlot }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ h.billCount }}</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ h.cashTotal }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ h.knetTotal }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ h.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!shift()?.summaries?.hourlySummary?.items?.length">
                  <td colspan="5" class="p-6 text-center text-slate-400">No hourly sales activity recorded.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td class="p-3 text-slate-900">Total Across Hours</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ shift()?.summaries?.hourlySummary?.totalBills || 0 }} Bills</td>
                  <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-purple-600 text-sm">{{ shift()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 5: CANCELLATION BILLS SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CANCELLATIONS'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-red-600 uppercase tracking-wider block">5. Cancellation Bills Summary</span>
              <h3 class="text-base font-black text-slate-900">Void & Cancelled Invoices</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Cancelled Bills</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ shift()?.summaries?.cancellationSummary?.totalCancelledBills || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-red-200 shadow-2xs">
                <span class="text-[10px] font-bold text-red-600 uppercase block">Sales Total (Void)</span>
                <span class="text-xl font-black text-red-600 font-mono">{{ shift()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-xs text-left">
              <thead class="bg-red-50 text-red-700 font-bold uppercase border-b border-red-200">
                <tr>
                  <th class="p-3">Invoice #</th>
                  <th class="p-3">Car # / Model</th>
                  <th class="p-3">Customer</th>
                  <th class="p-3 text-center">Cancelled Time</th>
                  <th class="p-3">Cancelled By</th>
                  <th class="p-3">Reason / Remarks</th>
                  <th class="p-3 text-right font-black">Cancelled Amount (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-red-100">
                <tr *ngFor="let cn of shift()?.summaries?.cancellationSummary?.items" class="hover:bg-red-50/50">
                  <td class="p-3 font-mono font-bold text-red-700">{{ cn.invoiceNo || cn.id }}</td>
                  <td class="p-3">
                    <span class="font-bold text-slate-900">{{ cn.carNo }}</span>
                    <span class="text-[10px] text-slate-400 block">{{ cn.model }}</span>
                  </td>
                  <td class="p-3 font-medium text-slate-700">{{ cn.customerName }}</td>
                  <td class="p-3 text-center font-mono text-slate-600">{{ cn.cancelledAt ? (cn.cancelledAt | date:'HH:mm') : '-' }}</td>
                  <td class="p-3 font-bold text-slate-800">{{ cn.cancelledBy }}</td>
                  <td class="p-3 text-slate-700">{{ cn.cancellationReason }}</td>
                  <td class="p-3 text-right font-mono font-black text-red-700">{{ cn.cancelledAmount }} KD</td>
                </tr>
                <tr *ngIf="!shift()?.summaries?.cancellationSummary?.items?.length">
                  <td colspan="7" class="p-6 text-center text-slate-400">No cancelled bills recorded during this shift.</td>
                </tr>
              </tbody>
              <tfoot class="bg-red-50 border-t-2 border-red-200 font-bold text-red-900">
                <tr>
                  <td colspan="4" class="p-3">Total Cancelled Bills: {{ shift()?.summaries?.cancellationSummary?.totalCancelledBills || 0 }}</td>
                  <td colspan="2" class="p-3 text-right uppercase text-[10px]">Sales Total (Void):</td>
                  <td class="p-3 text-right font-mono font-black text-red-700 text-sm">{{ shift()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 6: PAYMENT TYPE-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'PAYMENTS'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">6. Payment Type-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Revenue by Payment Tender</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Transactions</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ shift()?.summaries?.paymentTypeSummary?.totalTransactions || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-amber-200 shadow-2xs">
                <span class="text-[10px] font-bold text-amber-700 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-amber-700 font-mono">{{ shift()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th class="p-3">Payment Method</th>
                  <th class="p-3 text-center">Transactions</th>
                  <th class="p-3 text-center">Share (%)</th>
                  <th class="p-3 text-right">Cash Portion (KD)</th>
                  <th class="p-3 text-right">KNET Portion (KD)</th>
                  <th class="p-3 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let p of shift()?.summaries?.paymentTypeSummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ p.paymentMethod }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ p.transactionCount }}</td>
                  <td class="p-3 text-center font-bold text-indigo-600">{{ p.percentage }}%</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ p.cashPortion }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ p.knetPortion }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ p.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!shift()?.summaries?.paymentTypeSummary?.items?.length">
                  <td colspan="6" class="p-6 text-center text-slate-400">No payment transaction records found.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td class="p-3 text-slate-900">Total Collections</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ shift()?.summaries?.paymentTypeSummary?.totalTransactions || 0 }} Tx</td>
                  <td class="p-3 text-center text-slate-900 font-mono">100%</td>
                  <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-amber-700 text-sm">{{ shift()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <!-- Modal: Confirmation Prompt -->
      <div *ngIf="confirmModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="bg-amber-600 text-white p-4 flex items-center gap-2">
            <span class="text-xl">⚠️</span>
            <h3 class="font-bold text-sm">Confirmation Required</h3>
          </div>
          <div class="p-5 space-y-3 text-left">
            <p class="text-sm font-bold text-slate-800">
              Are you sure you want to close Shift #{{ shift()?.shiftNumber || 1 }}?
            </p>
            <p class="text-xs text-slate-600 leading-relaxed">
              This will settle all transactions for Shift #{{ shift()?.shiftNumber || 1 }}, print the closing slip, and close the session.
            </p>
            <div *ngIf="isSupervisorAuthRequired()" class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
              <span class="text-base">🔒</span>
              <div>
                <span class="font-bold block">Supervisor Authentication Required</span>
                <span class="text-[11px] text-amber-700">A supervisor or manager must authorize this action before closing the shift.</span>
              </div>
            </div>
            <div *ngIf="!isSupervisorAuthRequired()" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <span class="text-base">⚡</span>
              <div>
                <span class="font-bold block">Direct Close Enabled</span>
                <span class="text-[11px] text-emerald-700">No supervisor authentication required. You can confirm and close directly.</span>
              </div>
            </div>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button (click)="confirmModalOpen.set(false)" class="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <!-- When Supervisor Auth Required -->
            <button *ngIf="isSupervisorAuthRequired()" (click)="proceedToSupervisorAuth()" class="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 cursor-pointer shadow-xs flex items-center justify-center gap-1.5">
              <span>🔒 Proceed to Authorization</span>
            </button>
            <!-- When Supervisor Auth NOT Required -->
            <button *ngIf="!isSupervisorAuthRequired()" (click)="confirmDirectClose()" [disabled]="processing()" class="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 cursor-pointer shadow-xs flex items-center justify-center gap-1.5">
              <span *ngIf="processing()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Confirm & Close Shift</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Supervisor Authorization -->
      <div *ngIf="supervisorModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="bg-orange-600 text-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔒</span>
              <h3 class="font-bold text-sm">Supervisor Authorization</h3>
            </div>
            <button (click)="supervisorModalOpen.set(false)" class="text-white/80 hover:text-white font-bold cursor-pointer">&times;</button>
          </div>
          <div class="p-5 space-y-3 text-left">
            <p class="text-xs text-slate-600 leading-relaxed">
              {{ pendingPrintAction ? 'Please enter supervisor credentials to authorize printing the closing report.' : 'Please enter supervisor or manager authorization credentials to finalize closing Shift #' + (shift()?.shiftNumber || 1) + '.' }}
            </p>
            <div *ngIf="supervisorError()" class="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
              {{ supervisorError() }}
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supervisor Username</label>
              <input type="text" [(ngModel)]="supervisorUsername" placeholder="e.g. admin or supervisor" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supervisor Password *</label>
              <input type="password" [(ngModel)]="supervisorPassword" placeholder="Enter password" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" (keyup.enter)="verifySupervisorAndExecuteShiftClose()" />
            </div>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button (click)="supervisorModalOpen.set(false)" class="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="verifySupervisorAndExecuteShiftClose()" [disabled]="!supervisorPassword || supervisorVerifying()" class="flex-1 py-2.5 bg-orange-600 text-white font-bold rounded-lg text-xs hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
              <span *ngIf="supervisorVerifying()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Authorize & Continue</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class ShiftCloseComponent implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);
  private printService = inject(PrintService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);

  shift = signal<any>(null);
  loading = signal(false);
  processing = signal(false);
  notes = '';

  activeTab = signal<ShiftSummaryTab>('OVERVIEW');
  billFilterText = '';

  // Secure Access (Supervisor Auth)
  confirmModalOpen = signal(false);
  supervisorModalOpen = signal(false);
  supervisorUsername = '';
  supervisorPassword = '';
  supervisorVerifying = signal(false);
  supervisorError = signal('');
  pendingPrintAction: 'standard' | 'thermal' | null = null;

  isSupervisorAuthRequired(): boolean {
    return this.perm.isSupervisorAuthRequiredForShiftClose();
  }

  currentEmployeeName(): string {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        return u.employeeName || u.employee_name || u.username || 'Cashier';
      } catch (e) {}
    }
    return this.shift()?.cashierName || 'Cashier';
  }

  getFilteredBills(): any[] {
    const items = this.shift()?.summaries?.billSummary?.items || [];
    if (!this.billFilterText.trim()) return items;
    const q = this.billFilterText.toLowerCase();
    return items.filter((b: any) => 
      (b.invoiceNo || '').toLowerCase().includes(q) ||
      (b.carNo || '').toLowerCase().includes(q) ||
      (b.customerPhone || '').toLowerCase().includes(q) ||
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.cashier || '').toLowerCase().includes(q) ||
      (b.paymentMethod || '').toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    this.loadShift();
  }

  loadShift() {
    this.loading.set(true);
    const raw = localStorage.getItem('currentUser');
    let u: any = null;
    if (raw) { try { u = JSON.parse(raw); } catch(e) {} }

    this.api.getCurrentShift({
      userId: u?.id,
      username: u?.username,
      cashier: u?.employeeName || u?.username,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1',
    }).subscribe({
      next: (data) => {
        this.shift.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  printStandard() {
    const s = this.shift();
    if (!s) return;
    if (this.isSupervisorAuthRequired() && !this.perm.isAdmin() && this.perm.userRole().toUpperCase() !== 'MANAGER') {
      this.pendingPrintAction = 'standard';
      this.supervisorModalOpen.set(true);
      this.supervisorPassword = '';
      this.supervisorError.set('');
      return;
    }
    this.printService.printShiftReport({ ...s, notes: this.notes }, false);
  }

  printThermal(width: ThermalPaperWidth = '80mm') {
    const s = this.shift();
    if (!s) return;
    if (this.isSupervisorAuthRequired() && !this.perm.isAdmin() && this.perm.userRole().toUpperCase() !== 'MANAGER') {
      this.pendingPrintAction = 'thermal';
      this.supervisorModalOpen.set(true);
      this.supervisorPassword = '';
      this.supervisorError.set('');
      return;
    }
    this.printService.printShiftReport({ ...s, notes: this.notes }, true, width);
  }

  startShiftCloseFlow() {
    this.confirmModalOpen.set(true);
  }

  confirmDirectClose() {
    this.confirmModalOpen.set(false);
    const cashierName = this.currentEmployeeName();
    this.executeShiftClose(cashierName, undefined);
  }

  proceedToSupervisorAuth() {
    this.confirmModalOpen.set(false);
    this.pendingPrintAction = null;
    this.supervisorModalOpen.set(true);
    this.supervisorPassword = '';
    this.supervisorError.set('');
  }

  verifySupervisorAndExecuteShiftClose() {
    if (!this.supervisorPassword) {
      this.supervisorError.set('Please enter supervisor password.');
      return;
    }

    this.supervisorVerifying.set(true);
    this.supervisorError.set('');

    this.api.verifySupervisor({
      username: this.supervisorUsername || undefined,
      password: this.supervisorPassword
    }).subscribe({
      next: (res) => {
        this.supervisorVerifying.set(false);
        if (res.authorized) {
          this.supervisorModalOpen.set(false);
          if (this.pendingPrintAction === 'standard') {
            this.pendingPrintAction = null;
            this.printService.printShiftReport({ ...this.shift(), notes: this.notes }, false);
          } else if (this.pendingPrintAction === 'thermal') {
            this.pendingPrintAction = null;
            this.printService.printShiftReport({ ...this.shift(), notes: this.notes }, true, '80mm');
          } else {
            this.executeShiftClose(res.user?.employeeName || res.user?.username || 'Supervisor', res.user?.id);
          }
        } else {
          this.supervisorError.set(res.message || 'Authorization failed. Invalid supervisor credentials.');
        }
      },
      error: (err) => {
        this.supervisorVerifying.set(false);
        this.supervisorError.set(err.error?.error || 'Verification error: ' + err.message);
      }
    });
  }

  private executeShiftClose(closingCashierName: string, supervisorUserId?: string) {
    this.processing.set(true);
    const s = this.shift();
    const raw = localStorage.getItem('currentUser');
    let u: any = null;
    if (raw) { try { u = JSON.parse(raw); } catch(e) {} }

    this.api.closeShift({
      shiftId: s?.id,
      notes: this.notes,
      cashierName: closingCashierName,
      userId: supervisorUserId || u?.id,
      username: u?.username,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1',
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH',
      businessDate: s?.businessDate
    }).subscribe({
      next: (res) => {
        this.processing.set(false);
        
        let successMsg = this.translateService.translate('SHIFT.CLOSE_SUCCESS') || 'Shift closed successfully.';
        if (res.printStatus?.success) {
          successMsg += '\n\n🖨️ ' + (this.translateService.translate('PRINT.PRINT_SUCCESS') || 'Thermal closing slip sent to printer.');
        } else if (res.printStatus && !res.printStatus.success) {
          successMsg += '\n\n⚠️ ' + (res.printStatus.error || 'Printer offline - could not print closing slip');
        }

        alert(successMsg);

        // Clear shift cache and logout user session
        localStorage.removeItem('activeShift');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.processing.set(false);
        alert(this.translateService.translate('SHIFT.CLOSE_ERROR') || 'Error closing shift: ' + (err.error?.error || err.message));
      }
    });
  }
}
