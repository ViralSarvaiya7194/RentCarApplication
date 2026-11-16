import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService } from './print.service';
import { PermissionService } from './permission.service';

export type PeriodicTab = 'DAYS' | 'CASHIER' | 'BILLS' | 'CARS' | 'HOURLY' | 'CANCELLATIONS' | 'PAYMENTS';

@Component({
  selector: 'app-periodic-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterLink],
  host: { class: 'flex-1 flex flex-col min-h-0 overflow-hidden' },
  template: `
    <ng-container *ngIf="perm.can('PERIODIC_REPORT', 'VIEW'); else accessDenied">
    <div class="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden font-sans">
      <!-- Top Header & Filter Bar (Compact for 1024x768) -->
      <div class="bg-white border-b border-slate-200 px-3 lg:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs z-10">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-black shadow-sm shadow-orange-500/20 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div class="min-w-0">
            <h1 class="text-base lg:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">{{ 'REPORTS.PERIODIC_REPORT_TITLE' | translate }}</h1>
            <p class="text-[11px] text-slate-400 font-medium hidden xl:block truncate">{{ 'REPORTS.PERIODIC_REPORT_SUBTITLE' | translate }}</p>
          </div>
        </div>

        <!-- Date Range Filter & Action Buttons -->
        <div class="flex flex-wrap items-center gap-1.5">
          <!-- Date Range Pickers -->
          <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span class="px-1.5 font-bold text-slate-400 uppercase text-[10px]">{{ 'REPORTS.FROM' | translate }}:</span>
            <input type="date" [(ngModel)]="fromDate" (change)="loadReport()" class="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
            <span class="px-1.5 font-bold text-slate-400 uppercase text-[10px]">{{ 'REPORTS.TO' | translate }}:</span>
            <input type="date" [(ngModel)]="toDate" (change)="loadReport()" class="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
          </div>

          <!-- Quick Presets -->
          <div class="hidden sm:flex items-center gap-1">
            <button type="button" (click)="setPreset('TODAY')" class="px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 whitespace-nowrap">
              {{ 'REPORTS.PRESET_TODAY' | translate }}
            </button>
            <button type="button" (click)="setPreset('YESTERDAY')" class="px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 whitespace-nowrap">
              {{ 'REPORTS.PRESET_YESTERDAY' | translate }}
            </button>
            <button type="button" (click)="setPreset('7DAYS')" class="px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 whitespace-nowrap">
              {{ 'REPORTS.PRESET_7DAYS' | translate }}
            </button>
            <button type="button" (click)="setPreset('MONTH')" class="px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 whitespace-nowrap">
              {{ 'REPORTS.PRESET_MONTH' | translate }}
            </button>
            <button type="button" (click)="setPreset('ALL')" class="px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 whitespace-nowrap">
              {{ 'COMMON.ALL' | translate }}
            </button>
          </div>

          <!-- Direct Thermal Print Button -->
          <button 
            *ngIf="perm.can('PERIODIC_REPORT', 'PRINT')"
            type="button" 
            (click)="printThermal()" 
            [disabled]="loading() || !reportData()?.days?.length"
            class="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            <span>{{ 'PRINT.THERMAL_PRINT' | translate }}</span>
          </button>

          <!-- Standard A4 Print Button -->
          <button 
            *ngIf="perm.can('PERIODIC_REPORT', 'PRINT')"
            type="button" 
            (click)="printStandard()" 
            [disabled]="loading() || !reportData()?.days?.length"
            class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span>{{ 'PRINT.PRINT_A4' | translate }}</span>
          </button>

          <!-- Export CSV -->
          <button 
            *ngIf="perm.can('PERIODIC_REPORT', 'EXPORT')"
            type="button" 
            (click)="exportCSV()" 
            [disabled]="loading() || !reportData()?.days?.length"
            class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>{{ 'MASTER_EXPORT.EXPORT_CSV' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Main Content (Flex column for 1024x768 so grid stays prominent and scrollable) -->
      <div class="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0 flex flex-col gap-2.5">
        <!-- Toast Notification -->
        <div *ngIf="toastMsg()" class="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-xs flex items-center justify-between shrink-0">
          <span>{{ toastMsg() }}</span>
          <button (click)="toastMsg.set(null)" class="text-emerald-600 hover:text-emerald-900">&times;</button>
        </div>

        <!-- Grand Summary Highlights (Compact single row for 1024x768) -->
        <div class="grid grid-cols-3 gap-2.5 shrink-0">
          <div class="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
            <div class="min-w-0">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">{{ 'DAY_CLOSE.TOTAL_RENTALS' | translate }}</span>
              <span class="text-base lg:text-lg font-black text-slate-900 font-mono leading-tight block">{{ reportData()?.grandTotal?.totalRentals || 0 }} <span class="text-[11px] text-indigo-600 font-sans">Completed Trips</span></span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shrink-0">🧾</div>
          </div>

          <div class="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between min-w-0">
            <div class="min-w-0">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total Days Analyzed</span>
              <span class="text-base lg:text-lg font-black text-slate-700 font-mono leading-tight block">{{ reportData()?.days?.length || 0 }} <span class="text-[11px] text-slate-400 font-sans">Days</span></span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm shrink-0">📅</div>
          </div>

          <div class="bg-gradient-to-r from-amber-50/80 to-orange-50/80 px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between min-w-0">
            <div class="min-w-0">
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider block truncate">Period Revenue Total</span>
              <span class="text-base lg:text-lg font-black text-amber-600 font-mono leading-tight block">{{ reportData()?.grandTotal?.totalRevenue || '0.000' }} <span class="text-[11px] font-sans">KD</span></span>
            </div>
            <div class="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm shrink-0 shadow-2xs">💰</div>
          </div>
        </div>

        <!-- Navigation Tabs for the 6 Detailed Summaries (Single Horizontal Row on 1024x768) -->
        <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold overflow-x-auto shrink-0 whitespace-nowrap">
          <button type="button" (click)="activeTab.set('DAYS')" [class]="activeTab() === 'DAYS' ? 'bg-white text-amber-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>📅 Day-by-Day Table</span>
          </button>
          <button type="button" (click)="activeTab.set('CASHIER')" [class]="activeTab() === 'CASHIER' ? 'bg-white text-amber-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>👤 1. Cashier Wise</span>
            <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ reportData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('BILLS')" [class]="activeTab() === 'BILLS' ? 'bg-white text-amber-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>🧾 2. Bill Wise</span>
            <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-mono">{{ reportData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('CARS')" [class]="activeTab() === 'CARS' ? 'bg-white text-amber-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>🚗 3. CAR Wise</span>
            <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono">{{ reportData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('HOURLY')" [class]="activeTab() === 'HOURLY' ? 'bg-white text-amber-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>⏰ 4. Hourly Sales</span>
            <span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{{ reportData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('CANCELLATIONS')" [class]="activeTab() === 'CANCELLATIONS' ? 'bg-white text-red-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>🚫 5. Cancellations</span>
            <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-mono">{{ reportData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('PAYMENTS')" [class]="activeTab() === 'PAYMENTS' ? 'bg-white text-amber-600 shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>💳 6. Payment Types</span>
            <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ reportData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
          </button>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 flex-1">
          <div class="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs font-bold">{{ 'REPORTS.LOADING_DATA' | translate }}</span>
        </div>

        <!-- TAB 0: DAY-WISE TABLE -->
        <div *ngIf="!loading() && activeTab() === 'DAYS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center shrink-0">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wide">
              {{ 'REPORTS.PERIOD_FROM_TO' | translate }}: <strong class="font-mono text-slate-900">{{ fromDate }}</strong> → <strong class="font-mono text-slate-900">{{ toDate }}</strong>
            </span>
            <span class="text-xs font-bold text-slate-500">{{ reportData()?.days?.length || 0 }} {{ 'COMMON.RECORDS' | translate }}</span>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th class="px-3.5 py-2.5 whitespace-nowrap">Date (Day)</th>
                  <th class="px-3.5 py-2.5 text-center whitespace-nowrap">Rentals (Trips)</th>
                  <th class="px-3.5 py-2.5 text-right whitespace-nowrap">Cash (KD)</th>
                  <th class="px-3.5 py-2.5 text-right whitespace-nowrap">KNET / Card (KD)</th>
                  <th class="px-3.5 py-2.5 text-right whitespace-nowrap">Discounts (KD)</th>
                  <th class="px-3.5 py-2.5 text-right whitespace-nowrap">Refunds (KD)</th>
                  <th class="px-3.5 py-2.5 text-right font-black whitespace-nowrap">Net Total (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let day of reportData()?.days" class="hover:bg-slate-50 transition">
                  <td class="px-3.5 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{{ day.date }}</td>
                  <td class="px-3.5 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">{{ day.rentals }}</td>
                  <td class="px-3.5 py-2.5 text-right font-mono text-amber-700 whitespace-nowrap">{{ day.cash | number:'1.3-3' }}</td>
                  <td class="px-3.5 py-2.5 text-right font-mono text-blue-700 whitespace-nowrap">{{ day.knet | number:'1.3-3' }}</td>
                  <td class="px-3.5 py-2.5 text-right font-mono text-emerald-600 whitespace-nowrap">{{ day.discount ? '-' + (day.discount | number:'1.3-3') : '0.000' }}</td>
                  <td class="px-3.5 py-2.5 text-right font-mono text-red-600 whitespace-nowrap">{{ day.refund ? '-' + (day.refund | number:'1.3-3') : '0.000' }}</td>
                  <td class="px-3.5 py-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">{{ day.total | number:'1.3-3' }} KD</td>
                </tr>
                <tr *ngIf="!reportData()?.days?.length">
                  <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
                    No transactions found for the selected date range.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 1: CASHIER-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CASHIER'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider">1. Cashier-wise Summary</span>
              <span class="text-xs font-black text-slate-900 ml-2">Total Sales Breakdown by Cashier</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-600">Total Bills: <strong class="font-mono text-slate-900">{{ reportData()?.summaries?.cashierSummary?.totalBills || 0 }}</strong></span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-black text-amber-600 font-mono">Sales Total: {{ reportData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
            </div>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-2.5">Cashier</th>
                  <th class="px-3 py-2.5 text-center">Bills Count</th>
                  <th class="px-3 py-2.5 text-right">Cash (KD)</th>
                  <th class="px-3 py-2.5 text-right">KNET / Card (KD)</th>
                  <th class="px-3 py-2.5 text-right">Discounts (KD)</th>
                  <th class="px-3 py-2.5 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let item of reportData()?.summaries?.cashierSummary?.items" class="hover:bg-slate-50">
                  <td class="px-3 py-2.5 font-bold text-slate-900">{{ item.cashier }}</td>
                  <td class="px-3 py-2.5 text-center font-bold text-slate-700">{{ item.billCount }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-amber-700">{{ item.cashTotal }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-blue-700">{{ item.knetTotal }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-emerald-600">-{{ item.discountTotal }}</td>
                  <td class="px-3 py-2.5 text-right font-mono font-black text-slate-900">{{ item.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!reportData()?.summaries?.cashierSummary?.items?.length">
                  <td colspan="6" class="p-6 text-center text-slate-400">No cashier records found for this period.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                <tr>
                  <td class="px-3 py-2 text-slate-900">Sales Total (All Cashiers)</td>
                  <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ reportData()?.summaries?.cashierSummary?.totalBills || 0 }} Bills</td>
                  <td colspan="3" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-amber-600 text-sm">{{ reportData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 2: BILL-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'BILLS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">2. Bill-wise Summary</span>
              <span class="text-xs font-black text-slate-900 ml-2">Itemized Rental Bills</span>
            </div>
            <div class="flex items-center gap-2">
              <input type="text" [(ngModel)]="billFilterText" placeholder="Search invoice, car, customer..." class="bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span class="bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-xs font-black text-blue-600 font-mono shrink-0">Sales Total: {{ reportData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
            </div>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-2.5 whitespace-nowrap">Invoice #</th>
                  <th class="px-3 py-2.5 whitespace-nowrap">Car # / Model</th>
                  <th class="px-3 py-2.5 whitespace-nowrap">Customer Phone & Name</th>
                  <th class="px-3 py-2.5 text-center whitespace-nowrap">Duration</th>
                  <th class="px-3 py-2.5 text-center whitespace-nowrap">Payment</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap">Cash (KD)</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap">KNET (KD)</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap">Discount (KD)</th>
                  <th class="px-3 py-2.5 text-right font-black whitespace-nowrap">Net Sales (KD)</th>
                  <th class="px-3 py-2.5 whitespace-nowrap">Cashier</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let b of getFilteredBills()" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">{{ b.invoiceNo || b.id }}</td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <span class="font-bold text-slate-900">{{ b.carNo }}</span>
                    <span class="text-[10px] text-slate-400 ml-1">({{ b.model }})</span>
                  </td>
                  <td class="px-3 py-2">
                    <span *ngIf="b.customerPhone" class="font-mono font-bold text-indigo-700 mr-1.5">{{ b.customerPhone }}</span>
                    <span class="font-medium text-slate-700">{{ b.customerName }}</span>
                  </td>
                  <td class="px-3 py-2 text-center font-bold text-slate-600 whitespace-nowrap">{{ b.durationMinutes }}m</td>
                  <td class="px-3 py-2 text-center font-bold text-indigo-700 whitespace-nowrap">{{ b.paymentMethod }}</td>
                  <td class="px-3 py-2 text-right font-mono whitespace-nowrap">{{ b.cashAmount }}</td>
                  <td class="px-3 py-2 text-right font-mono whitespace-nowrap">{{ b.knetAmount }}</td>
                  <td class="px-3 py-2 text-right font-mono text-emerald-600 whitespace-nowrap">{{ b.discount > 0 ? '-' + b.discount : '0.000' }}</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-slate-900 whitespace-nowrap">{{ b.totalSales }} KD</td>
                  <td class="px-3 py-2 text-slate-500 whitespace-nowrap">{{ b.cashier }}</td>
                </tr>
                <tr *ngIf="!getFilteredBills().length">
                  <td colspan="10" class="p-6 text-center text-slate-400">No rental bills match the current filter.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                <tr>
                  <td colspan="4" class="px-3 py-2 text-slate-900">Total Completed Bills: {{ reportData()?.summaries?.billSummary?.totalBills || 0 }}</td>
                  <td colspan="4" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-blue-600 text-sm">{{ reportData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 3: CAR-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CARS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">3. CAR-wise Summary</span>
              <span class="text-xs font-black text-slate-900 ml-2">Vehicle Utilization & Revenue</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-600">Active Cars: <strong class="font-mono text-slate-900">{{ reportData()?.summaries?.carSummary?.totalCars || 0 }}</strong></span>
              <span class="text-xs font-bold text-slate-600">Trips: <strong class="font-mono text-slate-900">{{ reportData()?.summaries?.carSummary?.totalTrips || 0 }}</strong></span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-black text-emerald-600 font-mono">Sales Total: {{ reportData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
            </div>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-2.5">Car #</th>
                  <th class="px-3 py-2.5">Model / Class</th>
                  <th class="px-3 py-2.5 text-center">Trips Count</th>
                  <th class="px-3 py-2.5 text-center">Total Runtime</th>
                  <th class="px-3 py-2.5 text-right">Cash (KD)</th>
                  <th class="px-3 py-2.5 text-right">KNET (KD)</th>
                  <th class="px-3 py-2.5 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let cr of reportData()?.summaries?.carSummary?.items" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-mono font-bold text-slate-900">{{ cr.carNo }}</td>
                  <td class="px-3 py-2 font-medium text-slate-700">{{ cr.model || '-' }}</td>
                  <td class="px-3 py-2 text-center font-bold text-slate-800">{{ cr.tripCount }}</td>
                  <td class="px-3 py-2 text-center font-mono text-slate-600">{{ cr.totalMinutes }} mins</td>
                  <td class="px-3 py-2 text-right font-mono text-amber-700">{{ cr.cashTotal }}</td>
                  <td class="px-3 py-2 text-right font-mono text-blue-700">{{ cr.knetTotal }}</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ cr.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!reportData()?.summaries?.carSummary?.items?.length">
                  <td colspan="7" class="p-6 text-center text-slate-400">No car activity records for this period.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                <tr>
                  <td colspan="2" class="px-3 py-2 text-slate-900">Total Cars: {{ reportData()?.summaries?.carSummary?.totalCars || 0 }}</td>
                  <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ reportData()?.summaries?.carSummary?.totalTrips || 0 }} Trips</td>
                  <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ reportData()?.summaries?.carSummary?.totalMinutes || 0 }} mins</td>
                  <td colspan="2" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-emerald-600 text-sm">{{ reportData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 4: HOURLY SALES-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'HOURLY'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span class="text-[10px] font-bold text-purple-600 uppercase tracking-wider">4. Hourly Sales-wise Summary</span>
              <span class="text-xs font-black text-slate-900 ml-2">Sales Volume Across Hours</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-600">Total Bills: <strong class="font-mono text-slate-900">{{ reportData()?.summaries?.hourlySummary?.totalBills || 0 }}</strong></span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-xs font-black text-purple-600 font-mono">Sales Total: {{ reportData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
            </div>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-2.5">Time Window</th>
                  <th class="px-3 py-2.5 text-center">Bills Count</th>
                  <th class="px-3 py-2.5 text-right">Cash (KD)</th>
                  <th class="px-3 py-2.5 text-right">KNET / Card (KD)</th>
                  <th class="px-3 py-2.5 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let h of reportData()?.summaries?.hourlySummary?.items" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-bold text-slate-800">{{ h.hourLabel || h.hourSlot }}</td>
                  <td class="px-3 py-2 text-center font-bold text-slate-700">{{ h.billCount }}</td>
                  <td class="px-3 py-2 text-right font-mono text-amber-700">{{ h.cashTotal }}</td>
                  <td class="px-3 py-2 text-right font-mono text-blue-700">{{ h.knetTotal }}</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ h.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!reportData()?.summaries?.hourlySummary?.items?.length">
                  <td colspan="5" class="p-6 text-center text-slate-400">No hourly sales activity recorded.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                <tr>
                  <td class="px-3 py-2 text-slate-900">Total Across Hours</td>
                  <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ reportData()?.summaries?.hourlySummary?.totalBills || 0 }} Bills</td>
                  <td colspan="2" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-purple-600 text-sm">{{ reportData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 5: CANCELLATION BILLS SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CANCELLATIONS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span class="text-[10px] font-bold text-red-600 uppercase tracking-wider">5. Cancellation Bills Summary</span>
              <span class="text-xs font-black text-slate-900 ml-2">Void & Cancelled Invoices</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-600">Cancelled: <strong class="font-mono text-slate-900">{{ reportData()?.summaries?.cancellationSummary?.totalCancelledBills || 0 }}</strong></span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-red-200 text-xs font-black text-red-600 font-mono">Sales Total (Void): {{ reportData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
            </div>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="bg-red-50 text-red-700 font-bold uppercase border-b border-red-200 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-2.5">Invoice #</th>
                  <th class="px-3 py-2.5">Car # / Model</th>
                  <th class="px-3 py-2.5">Customer</th>
                  <th class="px-3 py-2.5 text-center">Cancelled Time</th>
                  <th class="px-3 py-2.5">Cancelled By</th>
                  <th class="px-3 py-2.5">Reason / Remarks</th>
                  <th class="px-3 py-2.5 text-right font-black">Cancelled Amount (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-red-100 font-medium">
                <tr *ngFor="let cn of reportData()?.summaries?.cancellationSummary?.items" class="hover:bg-red-50/50">
                  <td class="px-3 py-2 font-mono font-bold text-red-700">{{ cn.invoiceNo || cn.id }}</td>
                  <td class="px-3 py-2">
                    <span class="font-bold text-slate-900">{{ cn.carNo }}</span>
                    <span class="text-[10px] text-slate-400 ml-1">({{ cn.model }})</span>
                  </td>
                  <td class="px-3 py-2 font-medium text-slate-700">{{ cn.customerName }}</td>
                  <td class="px-3 py-2 text-center font-mono text-slate-600">{{ cn.cancelledAt ? (cn.cancelledAt | date:'HH:mm') : '-' }}</td>
                  <td class="px-3 py-2 font-bold text-slate-800">{{ cn.cancelledBy }}</td>
                  <td class="px-3 py-2 text-slate-700">{{ cn.cancellationReason }}</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-red-700">{{ cn.cancelledAmount }} KD</td>
                </tr>
                <tr *ngIf="!reportData()?.summaries?.cancellationSummary?.items?.length">
                  <td colspan="7" class="p-6 text-center text-slate-400">No cancelled bills recorded during this period.</td>
                </tr>
              </tbody>
              <tfoot class="bg-red-50 border-t-2 border-red-200 font-bold text-red-900 sticky bottom-0 z-10">
                <tr>
                  <td colspan="4" class="px-3 py-2">Total Cancelled Bills: {{ reportData()?.summaries?.cancellationSummary?.totalCancelledBills || 0 }}</td>
                  <td colspan="2" class="px-3 py-2 text-right uppercase text-[10px]">Sales Total (Void):</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-red-700 text-sm">{{ reportData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 6: PAYMENT TYPE-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'PAYMENTS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
          <div class="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider">6. Payment Type-wise Summary</span>
              <span class="text-xs font-black text-slate-900 ml-2">Revenue by Payment Tender</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-600">Transactions: <strong class="font-mono text-slate-900">{{ reportData()?.summaries?.paymentTypeSummary?.totalTransactions || 0 }}</strong></span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-black text-amber-700 font-mono">Sales Total: {{ reportData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
            </div>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-2.5">Payment Method</th>
                  <th class="px-3 py-2.5 text-center">Transactions</th>
                  <th class="px-3 py-2.5 text-center">Share (%)</th>
                  <th class="px-3 py-2.5 text-right">Cash Portion (KD)</th>
                  <th class="px-3 py-2.5 text-right">KNET Portion (KD)</th>
                  <th class="px-3 py-2.5 text-right font-black">Total Sales (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let p of reportData()?.summaries?.paymentTypeSummary?.items" class="hover:bg-slate-50">
                  <td class="px-3 py-2 font-bold text-slate-800">{{ p.paymentMethod }}</td>
                  <td class="px-3 py-2 text-center font-bold text-slate-700">{{ p.transactionCount }}</td>
                  <td class="px-3 py-2 text-center font-bold text-indigo-600">{{ p.percentage }}%</td>
                  <td class="px-3 py-2 text-right font-mono text-amber-700">{{ p.cashPortion }}</td>
                  <td class="px-3 py-2 text-right font-mono text-blue-700">{{ p.knetPortion }}</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ p.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!reportData()?.summaries?.paymentTypeSummary?.items?.length">
                  <td colspan="6" class="p-6 text-center text-slate-400">No payment transaction records found.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                <tr>
                  <td class="px-3 py-2 text-slate-900">Total Collections</td>
                  <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ reportData()?.summaries?.paymentTypeSummary?.totalTransactions || 0 }} Tx</td>
                  <td class="px-3 py-2 text-center text-slate-900 font-mono">100%</td>
                  <td colspan="2" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-amber-700 text-sm">{{ reportData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <!-- Modal: Supervisor Authorization for Closing Report -->
      <div *ngIf="supervisorModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="bg-amber-600 text-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔒</span>
              <h3 class="font-bold text-sm">Supervisor Authorization</h3>
            </div>
            <button (click)="supervisorModalOpen.set(false)" class="text-white/80 hover:text-white font-bold cursor-pointer">&times;</button>
          </div>
          <div class="p-5 space-y-3 text-left">
            <p class="text-xs text-slate-600 leading-relaxed">
              Supervisor authentication is required to print the closing sales report.
            </p>
            <div *ngIf="supervisorError()" class="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
              {{ supervisorError() }}
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supervisor Username</label>
              <input type="text" [(ngModel)]="supervisorUsername" placeholder="e.g. admin or supervisor" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supervisor Password *</label>
              <input type="password" [(ngModel)]="supervisorPassword" placeholder="Enter password" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500" (keyup.enter)="verifySupervisorAndPrintThermal()" />
            </div>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button (click)="supervisorModalOpen.set(false)" class="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="verifySupervisorAndPrintThermal()" [disabled]="!supervisorPassword || supervisorVerifying()" class="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
              <span *ngIf="supervisorVerifying()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Authorize & Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </ng-container>

    <ng-template #accessDenied>
      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-full">
        <div class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">Access Denied / غير مصرح بالدخول</h2>
        <p class="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          You do not have permission to view Periodic Reports. Please contact your system administrator.
        </p>
        <a routerLink="/" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition inline-flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          Back to Counter (POS)
        </a>
      </div>
    </ng-template>
  `
})
export class PeriodicReportComponent implements OnInit {
  private api = inject(ApiService);
  private printService = inject(PrintService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);

  loading = signal(false);
  reportData = signal<any>(null);
  toastMsg = signal<string | null>(null);

  fromDate = new Date().toISOString().split('T')[0];
  toDate = new Date().toISOString().split('T')[0];

  activeTab = signal<PeriodicTab>('DAYS');
  billFilterText = '';

  // Supervisor Authorization for closing report
  supervisorModalOpen = signal(false);
  supervisorUsername = '';
  supervisorPassword = '';
  supervisorVerifying = signal(false);
  supervisorError = signal('');

  getFilteredBills(): any[] {
    const items = this.reportData()?.summaries?.billSummary?.items || [];
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
    if (this.perm.can('PERIODIC_REPORT', 'VIEW')) {
      this.loadReport(true);
    }
  }

  setPreset(preset: 'TODAY' | 'YESTERDAY' | '7DAYS' | 'MONTH' | 'ALL') {
    const now = new Date();
    if (preset === 'TODAY') {
      this.fromDate = now.toISOString().split('T')[0];
      this.toDate = now.toISOString().split('T')[0];
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now.getTime() - 86400000);
      this.fromDate = y.toISOString().split('T')[0];
      this.toDate = y.toISOString().split('T')[0];
    } else if (preset === '7DAYS') {
      const d7 = new Date(now.getTime() - (7 * 86400000));
      this.fromDate = d7.toISOString().split('T')[0];
      this.toDate = now.toISOString().split('T')[0];
    } else if (preset === 'MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      this.fromDate = first.toISOString().split('T')[0];
      this.toDate = now.toISOString().split('T')[0];
    } else if (preset === 'ALL') {
      this.fromDate = '2026-01-01';
      this.toDate = now.toISOString().split('T')[0];
    }
    this.loadReport(false);
  }

  loadReport(fallbackIfEmpty = false) {
    this.loading.set(true);
    this.api.getPeriodicReport({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
      next: (data) => {
        if (fallbackIfEmpty && (!data?.days || data.days.length === 0) && this.fromDate !== '2026-01-01') {
          this.fromDate = '2026-01-01';
          this.loadReport(false);
          return;
        }
        this.reportData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error loading periodic report:', err);
      }
    });
  }

  printStandard() {
    const data = this.reportData();
    if (!data) return;
    this.printService.printClosingReport({
      closeDate: `${this.fromDate} to ${this.toDate}`,
      totalRentals: data.grandTotal?.totalRentals || 0,
      cashAmount: data.grandTotal?.totalCash || '0.000',
      cardAmount: data.grandTotal?.totalKnet || '0.000',
      discountAmount: data.grandTotal?.totalDiscount || '0.000',
      totalRevenue: data.grandTotal?.totalRevenue || '0.000',
      closedBy: 'Management Auditor',
      summaries: data.summaries
    }, false);
  }

  printThermal() {
    if (this.perm.isSupervisorAuthRequiredForShiftClose() && !this.perm.isAdmin() && this.perm.userRole().toUpperCase() !== 'MANAGER') {
      this.supervisorModalOpen.set(true);
      this.supervisorPassword = '';
      this.supervisorError.set('');
      return;
    }
    this.executePrintThermal();
  }

  verifySupervisorAndPrintThermal() {
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
          this.executePrintThermal();
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

  executePrintThermal() {
    this.api.printPeriodicReportThermal({
      fromDate: this.fromDate,
      toDate: this.toDate,
      branch: localStorage.getItem('currentBranch') || 'Avenues Mall',
      location: localStorage.getItem('currentLocation') || 'Zone A - Ground Floor',
      terminal: 'POS-Terminal-1',
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH'
    }).subscribe({
      next: () => {
        this.toastMsg.set('✅ ' + this.translateService.translate('PRINT.THERMAL_PRINT_SENT'));
        setTimeout(() => this.toastMsg.set(null), 4000);
      },
      error: (err) => {
        alert('Thermal print error: ' + (err.error?.error || err.message));
      }
    });
  }

  exportCSV() {
    const days = this.reportData()?.days || [];
    if (days.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = ['Date', 'Rentals', 'Cash_KD', 'KNET_KD', 'Discount_KD', 'Refund_KD', 'Net_Total_KD'];
    const csvRows = [
      headers.join(','),
      ...days.map((d: any) => `"${d.date}",${d.rentals},${d.cash},${d.knet},${d.discount || 0},${d.refund || 0},${d.total}`)
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Periodic_Report_${this.fromDate}_to_${this.toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
