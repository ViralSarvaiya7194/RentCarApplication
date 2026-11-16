import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService, ThermalPaperWidth } from './print.service';

@Component({
  selector: 'app-day-close',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="p-4 sm:p-6 md:p-8 flex-1 overflow-y-auto flex flex-col items-center justify-start min-h-0 relative">
      
      <!-- Toast Notification -->
      <div *ngIf="toast()" 
           class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all transform animate-in slide-in-from-top-4"
           [ngClass]="toast()?.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-rose-600 text-white shadow-rose-600/20'">
        <span>{{ toast()?.type === 'success' ? '✅' : '❌' }}</span>
        <span>{{ toast()?.message }}</span>
        <button (click)="toast.set(null)" class="ml-2 hover:opacity-75 cursor-pointer text-sm font-bold">&times;</button>
      </div>

      <!-- Main Container (Expanded to max-w-5xl for comprehensive closing report) -->
      <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 w-full max-w-5xl border-t-4 border-t-red-500 my-4 space-y-6">
        
        <!-- Header Top Row -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3 text-left">
            <div class="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shadow-md shadow-red-500/10 shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{{ 'DAY_CLOSE.TITLE' | translate }}</h2>
                <span *ngIf="summary()?.isClosed" class="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
                  {{ 'DAY_CLOSE.STATUS_CLOSED' | translate }}
                </span>
                <span *ngIf="!summary()?.isClosed" class="bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-200 uppercase">
                  {{ 'DAY_CLOSE.STATUS_PENDING' | translate }}
                </span>
              </div>
              <p class="text-slate-400 text-xs">{{ 'DAY_CLOSE.SUBTITLE' | translate }}</p>
            </div>
          </div>

          <!-- Actions Toolbar: A4 Print, Thermal Print, Email, SMTP Settings -->
          <div class="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              (click)="printStandard()" 
              [disabled]="loading() || !summary()"
              class="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              <span>{{ 'PRINT.PRINT_A4' | translate }}</span>
            </button>

            <button 
              type="button"
              (click)="printThermal('80mm')" 
              [disabled]="loading() || !summary()"
              class="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>{{ 'PRINT.THERMAL_PRINT' | translate }}</span>
            </button>

            <button 
              type="button"
              (click)="openEmailModal()" 
              [disabled]="loading() || !summary()"
              class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span>{{ 'DAY_CLOSE.EMAIL_REPORT' | translate }}</span>
            </button>

            <button 
              type="button"
              (click)="openEmailSettings()" 
              title="Configure SMTP & Auto-Email"
              class="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 text-xs font-bold border border-slate-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>
        </div>

        <!-- Sales Date Selector & Date Presets Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>📅</span>
              <span>Audit Sales Date:</span>
            </span>
            <input 
              type="date" 
              [ngModel]="selectedDate()" 
              (ngModelChange)="onDateChange($event)"
              class="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
            <button 
              type="button" 
              (click)="loadSummary()" 
              title="Refresh"
              class="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer">
              <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <button 
              type="button" 
              (click)="setActiveSalesDate()" 
              [class]="selectedDate() === activeSalesDate() ? 'bg-red-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'"
              class="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold transition cursor-pointer">
              Active Sales Date ({{ activeSalesDate() || 'Today' }})
            </button>
            <button 
              type="button" 
              (click)="setToday()" 
              class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer">
              Today
            </button>
            <button 
              type="button" 
              (click)="setYesterday()" 
              class="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer">
              Yesterday
            </button>
          </div>
        </div>

        <!-- Loading Spinner -->
        <div *ngIf="loading()" class="py-12 text-slate-400 text-center">
          <div class="inline-flex items-center gap-2">
            <div class="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-bold">{{ 'DAY_CLOSE.LOADING' | translate }}</span>
          </div>
        </div>

        <!-- Navigation Tabs for the 6 Detailed Summaries + Overview -->
        <div *ngIf="!loading()" class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
          <button type="button" (click)="activeTab.set('OVERVIEW')" [class]="activeTab() === 'OVERVIEW' ? 'bg-white text-red-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>📋 Financial Overview</span>
          </button>
          <button type="button" (click)="activeTab.set('CASHIER')" [class]="activeTab() === 'CASHIER' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>👤 1. Cashier Wise</span>
            <span class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-mono">{{ summary()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('BILLS')" [class]="activeTab() === 'BILLS' ? 'bg-white text-blue-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>🧾 2. Bill Wise</span>
            <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-mono">{{ summary()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('CARS')" [class]="activeTab() === 'CARS' ? 'bg-white text-emerald-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>🚗 3. CAR Wise</span>
            <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono">{{ summary()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('HOURLY')" [class]="activeTab() === 'HOURLY' ? 'bg-white text-purple-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>⏰ 4. Hourly Sales</span>
            <span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{{ summary()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('CANCELLATIONS')" [class]="activeTab() === 'CANCELLATIONS' ? 'bg-white text-red-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>🚫 5. Cancellations</span>
            <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-mono">{{ summary()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
          </button>
          <button type="button" (click)="activeTab.set('PAYMENTS')" [class]="activeTab() === 'PAYMENTS' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <span>💳 6. Payment Types</span>
            <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ summary()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
          </button>
        </div>

        <!-- TAB 0: FINANCIAL OVERVIEW & AUDIT RECONCILIATION -->
        <div *ngIf="!loading() && activeTab() === 'OVERVIEW'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <!-- Left Info Block: Operational metrics -->
            <div class="space-y-2.5 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs">
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">{{ 'DAY_CLOSE.AUDIT_DATE' | translate }}</span>
                <span class="font-mono font-bold text-slate-800">{{ summary()?.date }}</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">{{ 'SHIFT.SHIFTS_CLOSED_LABEL' | translate }}</span>
                <span class="font-bold text-slate-800">{{ summary()?.totalShifts || 2 }} Shifts (Shift 1 + Shift 2)</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">Total Cars Used</span>
                <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {{ summary()?.totalCarsUsed || summary()?.total_cars_used || 0 }} Cars
                </span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="font-bold text-slate-500 uppercase">{{ 'DAY_CLOSE.TOTAL_RENTALS' | translate }}</span>
                <span class="font-bold text-indigo-600">{{ summary()?.totalRentals || 0 }} {{ 'COMMON.TRIPS' | translate }}</span>
              </div>
              <div class="flex items-center justify-between pt-1 text-[11px]">
                <span class="text-slate-500 font-medium flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  {{ 'DAY_CLOSE.AUTO_EMAIL' | translate }}:
                </span>
                <span [ngClass]="settingsForm.enableDayCloseEmail ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'">
                  {{ settingsForm.enableDayCloseEmail ? ('COMMON.ACTIVE' | translate) : ('COMMON.INACTIVE' | translate) }}
                </span>
              </div>
            </div>

            <!-- Right Financial Breakdown Block -->
            <div class="space-y-2.5 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs">
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-600">Total Payments (Cash):</span>
                <span class="font-mono font-bold text-slate-900">{{ (summary()?.cashAmount || '0.000') | number:'1.3-3' }} KD</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-600">Total Payments (KNET / Card):</span>
                <span class="font-mono font-bold text-slate-900">{{ (summary()?.cardAmount || '0.000') | number:'1.3-3' }} KD</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200 text-emerald-700">
                <span>Total Discounts Granted:</span>
                <span class="font-mono font-bold">-{{ (summary()?.discountAmount || '0.000') | number:'1.3-3' }} KD</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-slate-300 font-bold text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span class="text-slate-900">Total Net Amount Received:</span>
                <span class="font-mono font-black text-indigo-600 text-base">{{ (summary()?.totalRevenue || '0.000') | number:'1.3-3' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Closing Notes -->
          <div *ngIf="!summary()?.isClosed" class="flex flex-col gap-1.5 text-left">
            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ 'DAY_CLOSE.AUDIT_NOTES' | translate }}</label>
            <input type="text" [(ngModel)]="notes" [placeholder]="'DAY_CLOSE.NOTES_PLACEHOLDER' | translate" class="border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
          </div>

          <!-- Confirm Day Close Button / Closed Notice -->
          <div class="pt-2">
            <button 
              *ngIf="!summary()?.isClosed"
              (click)="startDayCloseFlow()" 
              [disabled]="processing()" 
              class="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-red-600/25 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span *ngIf="processing()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ 'DAY_CLOSE.CONFIRM_BTN' | translate }}
            </button>
            
            <div *ngIf="summary()?.isClosed" class="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center justify-between">
              <span>✅ {{ 'DAY_CLOSE.DAY_ALREADY_CLOSED_MSG' | translate }} ({{ summary()?.dayCloseRecord?.closed_by || 'Admin' }})</span>
              <span class="font-mono text-slate-600">{{ summary()?.dayCloseRecord?.close_date }}</span>
            </div>
          </div>
        </div>

        <!-- TAB 1: CASHIER-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CASHIER'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <span class="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">1. Cashier-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Breakdown of Sales by Cashier</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Bills</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ summary()?.summaries?.cashierSummary?.totalBills || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-orange-200 shadow-2xs">
                <span class="text-[10px] font-bold text-orange-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-orange-600 font-mono">{{ summary()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
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
                <tr *ngFor="let item of summary()?.summaries?.cashierSummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ item.cashier }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ item.billCount }}</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ item.cashTotal }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ item.knetTotal }}</td>
                  <td class="p-3 text-right font-mono text-emerald-600">-{{ item.discountTotal }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ item.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!summary()?.summaries?.cashierSummary?.items?.length">
                  <td colspan="6" class="p-6 text-center text-slate-400">No cashier records found for this date.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td class="p-3 text-slate-900">Sales Total (All Cashiers)</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ summary()?.summaries?.cashierSummary?.totalBills || 0 }} Bills</td>
                  <td colspan="3" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-orange-600 text-sm">{{ summary()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 2: BILL-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'BILLS'" class="space-y-4">
          <!-- Sales Total Card & Search Filter -->
          <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">2. Bill-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Itemized Rental Bills</h3>
            </div>
            <div class="flex items-center gap-3">
              <input type="text" [(ngModel)]="billFilterText" placeholder="Search invoice, car, customer..." class="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-2xs shrink-0">
                <span class="text-[10px] font-bold text-blue-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-blue-600 font-mono">{{ summary()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th class="p-3">Invoice #</th>
                  <th class="p-3">Car # / Model</th>
                  <th class="p-3">Customer</th>
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
                  <td class="p-3 font-medium text-slate-700">{{ b.customerName }}</td>
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
                  <td colspan="4" class="p-3 text-slate-900">Total Completed Bills: {{ summary()?.summaries?.billSummary?.totalBills || 0 }}</td>
                  <td colspan="4" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-blue-600 text-sm">{{ summary()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 3: CAR-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CARS'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">3. CAR-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Vehicle Utilization & Revenue</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Active Cars</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ summary()?.summaries?.carSummary?.totalCars || 0 }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Trips</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ summary()?.summaries?.carSummary?.totalTrips || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                <span class="text-[10px] font-bold text-emerald-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-emerald-600 font-mono">{{ summary()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
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
                <tr *ngFor="let cr of summary()?.summaries?.carSummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-mono font-bold text-slate-900">{{ cr.carNo }}</td>
                  <td class="p-3 font-medium text-slate-700">{{ cr.model || '-' }}</td>
                  <td class="p-3 text-center font-bold text-slate-800">{{ cr.tripCount }}</td>
                  <td class="p-3 text-center font-mono text-slate-600">{{ cr.totalMinutes }} mins</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ cr.cashTotal }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ cr.knetTotal }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ cr.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!summary()?.summaries?.carSummary?.items?.length">
                  <td colspan="7" class="p-6 text-center text-slate-400">No car activity records for this date.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td colspan="2" class="p-3 text-slate-900">Total Cars: {{ summary()?.summaries?.carSummary?.totalCars || 0 }}</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ summary()?.summaries?.carSummary?.totalTrips || 0 }} Trips</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ summary()?.summaries?.carSummary?.totalMinutes || 0 }} mins</td>
                  <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-emerald-600 text-sm">{{ summary()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 4: HOURLY SALES-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'HOURLY'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <span class="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">4. Hourly Sales-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Sales Volume Across Hours</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Bills</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ summary()?.summaries?.hourlySummary?.totalBills || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
                <span class="text-[10px] font-bold text-purple-600 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-purple-600 font-mono">{{ summary()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
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
                <tr *ngFor="let h of summary()?.summaries?.hourlySummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ h.hourLabel || h.hourSlot }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ h.billCount }}</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ h.cashTotal }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ h.knetTotal }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ h.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!summary()?.summaries?.hourlySummary?.items?.length">
                  <td colspan="5" class="p-6 text-center text-slate-400">No hourly sales activity recorded.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td class="p-3 text-slate-900">Total Across Hours</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ summary()?.summaries?.hourlySummary?.totalBills || 0 }} Bills</td>
                  <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-purple-600 text-sm">{{ summary()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 5: CANCELLATION BILLS SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'CANCELLATIONS'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <span class="text-[10px] font-bold text-red-600 uppercase tracking-wider block">5. Cancellation Bills Summary</span>
              <h3 class="text-base font-black text-slate-900">Void & Cancelled Invoices</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Cancelled Bills</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ summary()?.summaries?.cancellationSummary?.totalCancelledBills || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-red-200 shadow-2xs">
                <span class="text-[10px] font-bold text-red-600 uppercase block">Sales Total (Void)</span>
                <span class="text-xl font-black text-red-600 font-mono">{{ summary()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
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
                <tr *ngFor="let cn of summary()?.summaries?.cancellationSummary?.items" class="hover:bg-red-50/50">
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
                <tr *ngIf="!summary()?.summaries?.cancellationSummary?.items?.length">
                  <td colspan="7" class="p-6 text-center text-slate-400">No cancelled bills recorded for this date.</td>
                </tr>
              </tbody>
              <tfoot class="bg-red-50 border-t-2 border-red-200 font-bold text-red-900">
                <tr>
                  <td colspan="4" class="p-3">Total Cancelled Bills: {{ summary()?.summaries?.cancellationSummary?.totalCancelledBills || 0 }}</td>
                  <td colspan="2" class="p-3 text-right uppercase text-[10px]">Sales Total (Void):</td>
                  <td class="p-3 text-right font-mono font-black text-red-700 text-sm">{{ summary()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB 6: PAYMENT TYPE-WISE SUMMARY WITH SALES TOTAL -->
        <div *ngIf="!loading() && activeTab() === 'PAYMENTS'" class="space-y-4">
          <!-- Sales Total Card -->
          <div class="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">6. Payment Type-wise Summary</span>
              <h3 class="text-base font-black text-slate-900">Revenue by Payment Tender</h3>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Transactions</span>
                <span class="text-lg font-black text-slate-800 font-mono">{{ summary()?.summaries?.paymentTypeSummary?.totalTransactions || 0 }}</span>
              </div>
              <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-amber-200 shadow-2xs">
                <span class="text-[10px] font-bold text-amber-700 uppercase block">Sales Total</span>
                <span class="text-xl font-black text-amber-700 font-mono">{{ summary()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
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
                <tr *ngFor="let p of summary()?.summaries?.paymentTypeSummary?.items" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ p.paymentMethod }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ p.transactionCount }}</td>
                  <td class="p-3 text-center font-bold text-indigo-600">{{ p.percentage }}%</td>
                  <td class="p-3 text-right font-mono text-amber-700">{{ p.cashPortion }}</td>
                  <td class="p-3 text-right font-mono text-blue-700">{{ p.knetPortion }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ p.totalSales }} KD</td>
                </tr>
                <tr *ngIf="!summary()?.summaries?.paymentTypeSummary?.items?.length">
                  <td colspan="6" class="p-6 text-center text-slate-400">No payment records found for this date.</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td class="p-3 text-slate-900">Total Collections</td>
                  <td class="p-3 text-center text-slate-900 font-mono">{{ summary()?.summaries?.paymentTypeSummary?.totalTransactions || 0 }} Tx</td>
                  <td class="p-3 text-center text-slate-900">100%</td>
                  <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                  <td class="p-3 text-right font-mono font-black text-amber-700 text-sm">{{ summary()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <!-- Modal 1: Send Email Report Now -->
      <div *ngIf="emailModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          
          <div class="bg-indigo-600 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <h3 class="font-bold text-sm">{{ 'DAY_CLOSE.EMAIL_REPORT' | translate }}</h3>
                <p class="text-[11px] text-indigo-100">Send Day Close financial summary via Email</p>
              </div>
            </div>
            <button (click)="emailModalOpen.set(false)" class="text-white/80 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
          </div>

          <div class="p-5 space-y-4 text-left">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Recipient Emails (comma-separated) *
              </label>
              <input 
                type="text" 
                [(ngModel)]="emailForm.recipientEmails" 
                placeholder="director@company.com, audit@company.com" 
                class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
              <p class="text-[10px] text-slate-400 mt-1">Separate multiple email addresses with a comma.</p>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Additional Notes / Message
              </label>
              <textarea 
                [(ngModel)]="emailForm.notes" 
                rows="2" 
                placeholder="Optional remarks for management..." 
                class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>

            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
              <div class="flex justify-between">
                <span>Date:</span>
                <span class="font-mono font-bold">{{ summary()?.date }}</span>
              </div>
              <div class="flex justify-between">
                <span>Total Trips:</span>
                <span class="font-bold text-indigo-600">{{ summary()?.totalRentals }}</span>
              </div>
              <div class="flex justify-between">
                <span>Status:</span>
                <span class="font-bold" [ngClass]="summary()?.isClosed ? 'text-emerald-600' : 'text-amber-600'">
                  {{ summary()?.isClosed ? 'Closed' : 'Pending Close' }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <button 
                type="button" 
                (click)="openEmailSettings()" 
                class="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer">
                ⚙️ SMTP Settings
              </button>

              <div class="flex gap-2">
                <button 
                  type="button" 
                  (click)="emailModalOpen.set(false)" 
                  class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer">
                  {{ 'COMMON.CANCEL' | translate }}
                </button>
                <button 
                  type="button" 
                  (click)="sendEmailReportNow()" 
                  [disabled]="sendingEmail()" 
                  class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20">
                  <span *ngIf="sendingEmail()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{{ sendingEmail() ? ('DAY_CLOSE.SENDING_EMAIL' | translate) : 'Send Email' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal 2: SMTP & Email Configuration Settings -->
      <div *ngIf="settingsModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
          
          <div class="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div>
                <h3 class="font-bold text-sm">{{ 'DAY_CLOSE.EMAIL_SETTINGS' | translate }}</h3>
                <p class="text-[11px] text-slate-400">Configure SMTP Mail Server & Default Recipients</p>
              </div>
            </div>
            <button (click)="settingsModalOpen.set(false)" class="text-white/80 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto text-left flex-1">
            
            <!-- Enable Auto-Email Toggle -->
            <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-indigo-900">Send Report Automatically on Day Close</p>
                <p class="text-[11px] text-indigo-700">Dispatches report to recipients as soon as Day Close is confirmed.</p>
              </div>
              <input 
                type="checkbox" 
                [(ngModel)]="settingsForm.enableDayCloseEmail" 
                class="w-5 h-5 accent-indigo-600 rounded cursor-pointer">
            </div>

            <!-- Default Recipients -->
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Default Recipient Emails (comma separated) *
              </label>
              <input 
                type="text" 
                [(ngModel)]="settingsForm.emailRecipients" 
                placeholder="director@company.com, accountant@company.com" 
                class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
            </div>

            <div class="border-t border-slate-200 pt-3">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">SMTP Mail Server</h4>
              
              <div class="grid grid-cols-3 gap-3 mb-3">
                <div class="col-span-2">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Host</label>
                  <input 
                    type="text" 
                    [(ngModel)]="settingsForm.smtpHost" 
                    placeholder="smtp.gmail.com" 
                    class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Port</label>
                  <input 
                    type="number" 
                    [(ngModel)]="settingsForm.smtpPort" 
                    placeholder="587" 
                    class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Username / Email</label>
                  <input 
                    type="text" 
                    [(ngModel)]="settingsForm.smtpUser" 
                    placeholder="alerts@company.com" 
                    class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">SMTP Password / App Password</label>
                  <input 
                    type="password" 
                    [(ngModel)]="settingsForm.smtpPass" 
                    placeholder="••••••••••••" 
                    class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Sender Address</label>
                  <input 
                    type="text" 
                    [(ngModel)]="settingsForm.emailSender" 
                    placeholder="POS System <alerts@company.com>" 
                    class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div class="flex items-center gap-2 pt-5">
                  <input 
                    type="checkbox" 
                    id="smtpSecure" 
                    [(ngModel)]="settingsForm.secure" 
                    (change)="onSecureToggle()"
                    class="w-4 h-4 accent-indigo-600 rounded cursor-pointer">
                  <label for="smtpSecure" class="text-xs font-bold text-slate-600 cursor-pointer">Use SSL (Port 465)</label>
                </div>
              </div>
            </div>

            <!-- Test Connection Section -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Test Email Dispatch</label>
              <div class="flex gap-2">
                <input 
                  type="email" 
                  [(ngModel)]="testEmailAddress" 
                  placeholder="your-email@example.com" 
                  class="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <button 
                  type="button" 
                  (click)="sendTestEmail()" 
                  [disabled]="testingEmail() || !testEmailAddress" 
                  class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <span *ngIf="testingEmail()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{{ testingEmail() ? 'Sending...' : 'Test' }}</span>
                </button>
              </div>
            </div>

          </div>

          <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
            <button 
              type="button" 
              (click)="settingsModalOpen.set(false)" 
              class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-lg text-xs font-bold cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button 
              type="button" 
              (click)="saveEmailSettings()" 
              [disabled]="savingSettings()" 
              class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20">
              <span *ngIf="savingSettings()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ savingSettings() ? 'Saving...' : 'Save Settings' }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Modal: Confirmation Prompt -->
      <div *ngIf="confirmCloseModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="bg-amber-600 text-white p-4 flex items-center gap-2">
            <span class="text-xl">⚠️</span>
            <h3 class="font-bold text-sm">Confirmation Required</h3>
          </div>
          <div class="p-5 space-y-3 text-left">
            <p class="text-sm font-bold text-slate-800">
              Are you sure you want to close the report?
            </p>
            <p class="text-xs text-slate-600 leading-relaxed">
              Finalizing the Day Close will close the business date (<strong class="font-mono text-slate-900">{{ summary()?.date }}</strong>), log all financial reconciliations, and advance to the next business date. This action cannot be reversed.
            </p>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button (click)="confirmCloseModalOpen.set(false)" class="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="proceedToSupervisorAuth()" class="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 cursor-pointer shadow-xs">
              Yes, Proceed to Authorization
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Supervisor Authorization -->
      <div *ngIf="supervisorModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="bg-red-600 text-white p-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔒</span>
              <h3 class="font-bold text-sm">Supervisor Authorization</h3>
            </div>
            <button (click)="supervisorModalOpen.set(false)" class="text-white/80 hover:text-white font-bold cursor-pointer">&times;</button>
          </div>
          <div class="p-5 space-y-3 text-left">
            <p class="text-xs text-slate-600 leading-relaxed">
              Please enter supervisor or manager authorization credentials to finalize this Day Close.
            </p>
            <div *ngIf="supervisorError()" class="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
              {{ supervisorError() }}
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supervisor Username</label>
              <input type="text" [(ngModel)]="supervisorUsername" placeholder="e.g. admin or supervisor" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supervisor Password *</label>
              <input type="password" [(ngModel)]="supervisorPassword" placeholder="Enter password" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500" (keyup.enter)="verifySupervisorAndExecuteDayClose()" />
            </div>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button (click)="supervisorModalOpen.set(false)" class="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="verifySupervisorAndExecuteDayClose()" [disabled]="!supervisorPassword || supervisorVerifying()" class="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
              <span *ngIf="supervisorVerifying()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Authorize & Close Day</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class DayCloseComponent implements OnInit {
  private api = inject(ApiService);
  private printService = inject(PrintService);
  public translateService = inject(TranslateService);

  summary = signal<any>(null);
  loading = signal(false);
  processing = signal(false);
  notes = '';

  activeTab = signal<'OVERVIEW' | 'CASHIER' | 'BILLS' | 'CARS' | 'HOURLY' | 'CANCELLATIONS' | 'PAYMENTS'>('OVERVIEW');
  billFilterText = '';

  selectedDate = signal<string>('');
  activeSalesDate = signal<string>('');

  // Secure Access Controls
  confirmCloseModalOpen = signal(false);
  supervisorModalOpen = signal(false);
  supervisorUsername = '';
  supervisorPassword = '';
  supervisorVerifying = signal(false);
  supervisorError = signal('');

  // Email facility state
  emailModalOpen = signal(false);
  settingsModalOpen = signal(false);
  sendingEmail = signal(false);
  testingEmail = signal(false);
  savingSettings = signal(false);
  testEmailAddress = '';

  emailForm = {
    recipientEmails: '',
    notes: ''
  };

  settingsForm: any = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    secure: false,
    smtpUser: '',
    smtpPass: '',
    emailSender: 'Kiddie Kruzzer POS <noreply@kiddiekruzzer.com>',
    enableDayCloseEmail: true,
    emailRecipients: ''
  };

  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit() {
    this.api.getSalesDate().subscribe({
      next: (res) => {
        const d = res?.salesDate || new Date().toISOString().split('T')[0];
        this.activeSalesDate.set(d);
        this.selectedDate.set(d);
        this.loadSummary(d);
      },
      error: () => {
        const d = new Date().toISOString().split('T')[0];
        this.activeSalesDate.set(d);
        this.selectedDate.set(d);
        this.loadSummary(d);
      }
    });
    this.loadEmailSettings();
  }

  loadSummary(date?: string) {
    this.loading.set(true);
    const targetDate = date || this.selectedDate() || undefined;
    this.api.getDayCloseSummary(targetDate).subscribe({
      next: (data) => {
        this.summary.set(data);
        if (data?.date) {
          this.selectedDate.set(data.date);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onDateChange(newDate: string) {
    if (!newDate) return;
    this.selectedDate.set(newDate);
    this.loadSummary(newDate);
  }

  setToday() {
    const today = new Date().toISOString().split('T')[0];
    this.onDateChange(today);
  }

  setYesterday() {
    const yest = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    this.onDateChange(yest);
  }

  setActiveSalesDate() {
    const act = this.activeSalesDate();
    if (act) {
      this.onDateChange(act);
    } else {
      this.api.getSalesDate().subscribe({
        next: (res) => {
          if (res?.salesDate) {
            this.activeSalesDate.set(res.salesDate);
            this.onDateChange(res.salesDate);
          }
        }
      });
    }
  }

  getFilteredBills() {
    const items = this.summary()?.summaries?.billSummary?.items || [];
    if (!this.billFilterText.trim()) return items;
    const q = this.billFilterText.toLowerCase();
    return items.filter((b: any) =>
      (b.invoiceNo && String(b.invoiceNo).toLowerCase().includes(q)) ||
      (b.carNo && String(b.carNo).toLowerCase().includes(q)) ||
      (b.model && String(b.model).toLowerCase().includes(q)) ||
      (b.customerName && String(b.customerName).toLowerCase().includes(q)) ||
      (b.paymentMethod && String(b.paymentMethod).toLowerCase().includes(q)) ||
      (b.cashier && String(b.cashier).toLowerCase().includes(q))
    );
  }

  loadEmailSettings() {
    this.api.getEmailSettings().subscribe({
      next: (res) => {
        if (res) {
          this.settingsForm = {
            smtpHost: res.smtpHost || 'smtp.gmail.com',
            smtpPort: res.smtpPort || 587,
            secure: res.smtpPort === 465,
            smtpUser: res.smtpUser || '',
            smtpPass: res.smtpPass || '',
            emailSender: res.emailSender || '',
            enableDayCloseEmail: res.enableDayCloseEmail !== false,
            emailRecipients: res.emailRecipients || ''
          };
          this.emailForm.recipientEmails = this.settingsForm.emailRecipients;
          if (!this.testEmailAddress && this.settingsForm.emailRecipients) {
            this.testEmailAddress = this.settingsForm.emailRecipients.split(',')[0].trim();
          }
        }
      },
      error: (err) => {
        console.warn('Could not load email settings:', err);
      }
    });
  }

  onSecureToggle() {
    if (this.settingsForm.secure) {
      this.settingsForm.smtpPort = 465;
    } else if (this.settingsForm.smtpPort === 465) {
      this.settingsForm.smtpPort = 587;
    }
  }

  printStandard() {
    const s = this.summary();
    if (s) {
      this.printService.printClosingReport({ ...s, notes: this.notes, summaries: s.summaries }, false);
    }
  }

  printThermal(width: ThermalPaperWidth = '80mm') {
    const s = this.summary();
    if (s) {
      this.printService.printClosingReport({ ...s, notes: this.notes, summaries: s.summaries }, true, width);
    }
  }

  openEmailModal() {
    if (!this.emailForm.recipientEmails && this.settingsForm.emailRecipients) {
      this.emailForm.recipientEmails = this.settingsForm.emailRecipients;
    }
    this.emailModalOpen.set(true);
  }

  openEmailSettings() {
    this.emailModalOpen.set(false);
    this.settingsModalOpen.set(true);
  }

  saveEmailSettings() {
    this.savingSettings.set(true);
    const payload = {
      ...this.settingsForm,
      smtpPort: Number(this.settingsForm.smtpPort) || (this.settingsForm.secure ? 465 : 587)
    };
    this.api.saveEmailSettings(payload).subscribe({
      next: () => {
        this.savingSettings.set(false);
        this.settingsModalOpen.set(false);
        this.emailForm.recipientEmails = this.settingsForm.emailRecipients;
        this.showToast('success', 'Email configuration saved successfully.');
      },
      error: (err) => {
        this.savingSettings.set(false);
        this.showToast('error', 'Error saving settings: ' + (err.error?.error || err.message));
      }
    });
  }

  sendTestEmail() {
    if (!this.testEmailAddress) {
      this.showToast('error', 'Please enter a test recipient email address.');
      return;
    }
    this.testingEmail.set(true);
    this.api.testEmail({ to: this.testEmailAddress, settings: this.settingsForm }).subscribe({
      next: (res) => {
        this.testingEmail.set(false);
        if (res.success) {
          this.showToast('success', res.message || 'Test email sent successfully!');
        } else {
          this.showToast('error', res.message || 'Test email failed.');
        }
      },
      error: (err) => {
        this.testingEmail.set(false);
        this.showToast('error', 'Test email failed: ' + (err.error?.error || err.message));
      }
    });
  }

  sendEmailReportNow() {
    if (!this.emailForm.recipientEmails || !this.emailForm.recipientEmails.trim()) {
      this.showToast('error', 'Please provide at least one recipient email address.');
      return;
    }

    this.sendingEmail.set(true);
    const sum = this.summary();
    const payload = {
      date: sum?.date || this.selectedDate() || new Date().toISOString().split('T')[0],
      recipientEmails: this.emailForm.recipientEmails,
      notes: this.emailForm.notes || this.notes || 'End of day closing report',
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1'
    };

    this.api.sendDayCloseEmail(payload).subscribe({
      next: (res) => {
        this.sendingEmail.set(false);
        this.emailModalOpen.set(false);
        this.showToast('success', res.message || 'Day Close report emailed successfully!');
      },
      error: (err) => {
        this.sendingEmail.set(false);
        this.showToast('error', 'Error sending email: ' + (err.error?.error || err.message));
      }
    });
  }

  startDayCloseFlow() {
    if (this.summary()?.isClosed) {
      alert(this.translateService.translate('DAY_CLOSE.DAY_ALREADY_CLOSED_MSG'));
      return;
    }
    this.confirmCloseModalOpen.set(true);
  }

  proceedToSupervisorAuth() {
    this.confirmCloseModalOpen.set(false);
    this.supervisorModalOpen.set(true);
    this.supervisorPassword = '';
    this.supervisorError.set('');
  }

  verifySupervisorAndExecuteDayClose() {
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
          const supervisorName = res.user?.employee_name || res.user?.username || 'Supervisor';
          this.executeDayClose(supervisorName);
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

  executeDayClose(authorizedBy: string = 'Admin') {
    this.processing.set(true);
    const sum = this.summary();
    const payload = {
      closeDate: sum?.date || this.selectedDate() || new Date().toISOString().split('T')[0],
      totalRentals: sum?.totalRentals || 0,
      totalCarsUsed: sum?.totalCarsUsed || sum?.total_cars_used || 0,
      totalRevenue: sum?.totalRevenue || '0.000',
      cashAmount: sum?.cashAmount || '0.000',
      cardAmount: sum?.cardAmount || '0.000',
      discountAmount: sum?.discountAmount || '0.000',
      refundAmount: sum?.refundAmount || '0.000',
      closedBy: authorizedBy,
      notes: this.notes || `End of day closing authorized by ${authorizedBy}`,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1',
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH'
    };

    this.api.closeDay(payload).subscribe({
      next: (res: any) => {
        this.processing.set(false);
        if (res?.newSalesDate) {
          localStorage.setItem('salesDate', res.newSalesDate);
          this.activeSalesDate.set(res.newSalesDate);
        }
        let msg = this.translateService.translate('DAY_CLOSE.SUCCESS_MSG') || 'Day closed successfully.';
        if (res?.newSalesDate) {
          const resetTemplate = this.translateService.translate('DAY_CLOSE.RESET_MSG') || 'Sales date reset to {date}. Next shift will be Shift #1.';
          msg += '\n\n📅 ' + resetTemplate.replace('{date}', res.newSalesDate);
        }
        if (res?.printStatus?.success) {
          msg += '\n\n🖨️ ' + (this.translateService.translate('PRINT.PRINT_SUCCESS') || 'Day close report sent to printer.');
        } else if (res?.printStatus && !res.printStatus.success) {
          console.warn('[Day Close Print Warning]:', res.printStatus.error);
        }
        if (res?.emailStatus?.sent) {
          msg += '\n\n📧 ' + (this.translateService.translate('DAY_CLOSE.EMAIL_SUCCESS') || 'Day close report was automatically emailed to recipients.');
        } else if (res?.emailStatus?.error) {
          console.warn('[Day Close Email Error]:', res.emailStatus.error);
        }
        alert(msg);
        this.loadSummary(res?.dayClose?.close_date || payload.closeDate);
      },
      error: (err) => {
        this.processing.set(false);
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
      }
    });
  }

  showToast(type: 'success' | 'error', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => {
      if (this.toast()?.message === message) {
        this.toast.set(null);
      }
    }, 5000);
  }
}
