import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { PrintService, ThermalPaperWidth } from './print.service';
import { PermissionService } from './permission.service';

export type ReportTab = 
  | 'MANAGEMENT_DASHBOARD'
  | 'DAILY_SUMMARY'
  | 'PERIODIC_REPORT'
  | 'LOCATION_SALES'
  | 'ITEM_SALES'
  | 'PAYMENT_COLLECTION'
  | 'AGGREGATOR_SALES'
  | 'DISCOUNT_ANALYSIS'
  | 'CANCELLATION_ANALYSIS'
  | 'CASHIER_PERFORMANCE'
  | 'CUSTOMER_SALES'
  | 'SHIFT_REPORT';

export interface ReportPageConfig {
  id: ReportTab;
  slug: string;
  moduleKey: string;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  description: string;
}

export const REPORT_PAGES: ReportPageConfig[] = [
  {
    id: 'MANAGEMENT_DASHBOARD',
    slug: 'management-dashboard',
    moduleKey: 'REPORT_DASHBOARD',
    labelKey: 'REPORTS.TAB_MANAGEMENT_DASHBOARD',
    defaultLabel: 'Management Sales Dashboard',
    icon: '📊',
    description: 'Executive revenue metrics, fleet occupancy, trip counts, and sales velocity.'
  },
  {
    id: 'DAILY_SUMMARY',
    slug: 'daily-summary',
    moduleKey: 'REPORT_DAILY_SUMMARY',
    labelKey: 'REPORTS.TAB_DAILY_SUMMARY',
    defaultLabel: 'Daily Sales Summary',
    icon: '📅',
    description: 'Day-by-day sales breakdown, cash collections, card settlements, and discount summaries.'
  },
  {
    id: 'PERIODIC_REPORT',
    slug: 'periodic-report',
    moduleKey: 'REPORT_PERIODIC',
    labelKey: 'REPORTS.TAB_PERIODIC_REPORT',
    defaultLabel: 'Periodic Sales Report',
    icon: '🖨️',
    description: 'Day-wise thermal closing audits, tax totals, gross sales, and receipt statistics.'
  },
  {
    id: 'SHIFT_REPORT',
    slug: 'shift-report',
    moduleKey: 'REPORT_SHIFT',
    labelKey: 'REPORTS.TAB_SHIFT_REPORT',
    defaultLabel: 'Shift Sales Report',
    icon: '🕒',
    description: 'Cashier shift-wise reconciliation, cash in drawer, drawer variance, and rental counts.'
  },
  {
    id: 'LOCATION_SALES',
    slug: 'location-sales',
    moduleKey: 'REPORT_LOCATION',
    labelKey: 'REPORTS.TAB_LOCATION_SALES',
    defaultLabel: 'Location-wise Sales',
    icon: '📍',
    description: 'Multi-location revenue breakdown, branch performance, and mall outlet metrics.'
  },
  {
    id: 'ITEM_SALES',
    slug: 'item-sales',
    moduleKey: 'REPORT_ITEM',
    labelKey: 'REPORTS.TAB_ITEM_SALES',
    defaultLabel: 'Car Model & Item Sales',
    icon: '🏎️',
    description: 'Top rented vehicle models, rental durations, category performance, and hourly rates.'
  },
  {
    id: 'PAYMENT_COLLECTION',
    slug: 'payment-collection',
    moduleKey: 'REPORT_PAYMENT',
    labelKey: 'REPORTS.TAB_PAYMENT_COLLECTION',
    defaultLabel: 'Payment Method Collections',
    icon: '💳',
    description: 'Reconciliation of Cash, KNET, Credit Card, and Aggregator payment gateways.'
  },
  {
    id: 'AGGREGATOR_SALES',
    slug: 'aggregator-sales',
    moduleKey: 'REPORT_AGGREGATOR',
    labelKey: 'REPORTS.TAB_AGGREGATOR_SALES',
    defaultLabel: 'Aggregator & Platform Sales',
    icon: '🌐',
    description: 'Third-party delivery/booking aggregator commissions, net payout, and order volumes.'
  },
  {
    id: 'DISCOUNT_ANALYSIS',
    slug: 'discount-analysis',
    moduleKey: 'REPORT_DISCOUNT',
    labelKey: 'REPORTS.TAB_DISCOUNT_ANALYSIS',
    defaultLabel: 'Discount & Promotion Analysis',
    icon: '🏷️',
    description: 'Promotional discounts, staff concessions, coupon campaigns, and margin impact.'
  },
  {
    id: 'CANCELLATION_ANALYSIS',
    slug: 'cancellation-analysis',
    moduleKey: 'REPORT_CANCELLATION',
    labelKey: 'REPORTS.TAB_CANCELLATION_ANALYSIS',
    defaultLabel: 'Void Bills & Cancellation Audit',
    icon: '❌',
    description: 'Supervised bill cancellations, voided transactions, manager authorizations, and refund trails.'
  },
  {
    id: 'CASHIER_PERFORMANCE',
    slug: 'cashier-performance',
    moduleKey: 'REPORT_CASHIER',
    labelKey: 'REPORTS.TAB_CASHIER_PERFORMANCE',
    defaultLabel: 'Cashier Sales Performance',
    icon: '👤',
    description: 'Cashier productivity, transaction count, average ticket size, and active shift hours.'
  },
  {
    id: 'CUSTOMER_SALES',
    slug: 'customer-sales',
    moduleKey: 'REPORT_CUSTOMER',
    labelKey: 'REPORTS.TAB_CUSTOMER_SALES',
    defaultLabel: 'Customer-wise Sales',
    icon: '📱',
    description: 'Customer-wise sales grouped by phone number first, unified customer name, trip count, and revenue.'
  }
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterLink],
  host: { class: 'flex-1 flex flex-col min-h-0 overflow-hidden' },
  template: `
    <ng-container *ngIf="hasAnyAccess(); else noReportsAccess">
    <div class="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden font-sans">
      <!-- Individual Report Page Header (Compact for 1024x768) -->
      <div class="bg-white border-b border-slate-200 px-3 lg:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs z-10">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-sm font-black shadow-xs shrink-0">
            <span>{{ currentReport().icon }}</span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-sm lg:text-base font-black text-slate-900 tracking-tight leading-tight truncate">{{ currentReport().labelKey | translate }}</h1>
              <!-- Page Rights status indicator -->
              <span *ngIf="hasCurrentPageAccess()" class="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Active
              </span>
              <span *ngIf="!hasCurrentPageAccess()" class="bg-red-50 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1 shrink-0">
                <span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Restricted
              </span>
            </div>
            <p class="hidden xl:block text-[11px] text-slate-400 font-medium truncate">{{ currentReport().description }}</p>
          </div>
        </div>

        <!-- Global Date Range & Action Buttons -->
        <div class="flex flex-wrap items-center gap-1.5">
          <!-- Date Filter Controls -->
          <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <span class="px-1.5 font-bold text-slate-400 uppercase text-[9px]">{{ 'REPORTS.FROM' | translate }}:</span>
            <input type="date" [(ngModel)]="fromDate" (change)="onDateChange()" class="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <span class="px-1.5 font-bold text-slate-400 uppercase text-[9px]">{{ 'REPORTS.TO' | translate }}:</span>
            <input type="date" [(ngModel)]="toDate" (change)="onDateChange()" class="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
          </div>

          <!-- Quick Presets -->
          <div class="flex items-center gap-1">
            <button type="button" (click)="setPreset('TODAY')" class="px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
              {{ 'REPORTS.PRESET_TODAY' | translate }}
            </button>
            <button type="button" (click)="setPreset('YESTERDAY')" class="px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
              {{ 'REPORTS.PRESET_YESTERDAY' | translate }}
            </button>
            <button type="button" (click)="setPreset('7DAYS')" class="px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
              {{ 'REPORTS.PRESET_7DAYS' | translate }}
            </button>
            <button type="button" (click)="setPreset('MONTH')" class="px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
              {{ 'REPORTS.PRESET_MONTH' | translate }}
            </button>
            <button type="button" (click)="setPreset('ALL')" class="px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
              All
            </button>
          </div>

          <!-- Direct Thermal Print Button (Guarded by Page Print Rights) -->
          <button 
            *ngIf="canPrintCurrentReport()"
            type="button" 
            (click)="printThermalCurrentReport()" 
            [disabled]="loading()"
            title="Thermal Print Report"
            class="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            <span>{{ 'PRINT.THERMAL_PRINT' | translate }}</span>
          </button>

          <!-- Export CSV (Guarded by Page Export Rights) -->
          <button 
            *ngIf="canExportCurrentReport()"
            type="button" 
            (click)="exportCurrentReport()" 
            title="Export CSV"
            class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>{{ 'MASTER_EXPORT.EXPORT_CSV' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Individual Reports Navigation Strip (Shows ONLY Permitted Reports) -->
      <div class="bg-white border-b border-slate-200 px-3 lg:px-4 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0 shadow-inner">
        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider me-1.5 shrink-0 flex items-center gap-1">
          <svg class="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
          {{ 'REPORTS.SWITCH_REPORT' | translate }}:
        </span>

        <ng-container *ngFor="let rep of accessibleReports()">
          <button 
            type="button"
            (click)="navigateToReport(rep)"
            [class]="activeTab() === rep.id ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100 font-medium'"
            class="px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0">
            <span>{{ rep.icon }}</span>
            <span>{{ rep.labelKey | translate }}</span>
          </button>
        </ng-container>
      </div>

      <!-- Main Content Area or Individual Page Access Denied State -->
      <div *ngIf="hasCurrentPageAccess(); else pageAccessDenied" class="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0 flex flex-col gap-3">
        <!-- Toast Notification -->
        <div *ngIf="toastMessage()" class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-sm flex items-center justify-between">
          <span>{{ toastMessage() }}</span>
          <button (click)="toastMessage.set(null)" class="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>

        <!-- Loading Indicator -->
        <div *ngIf="loading()" class="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs font-bold">{{ 'REPORTS.LOADING_DATA' | translate }}</span>
        </div>

        <!-- TAB 1: MANAGEMENT SALES DASHBOARD -->
        <div *ngIf="!loading() && activeTab() === 'MANAGEMENT_DASHBOARD'" class="space-y-6">
          <!-- KPI Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ 'REPORTS.TODAY_GROSS_REVENUE' | translate }}</p>
                <p class="text-2xl font-black text-slate-900 font-mono mt-1">{{ managementData()?.todaySummary?.totalRevenue || '0.000' }} <span class="text-xs text-indigo-600">KD</span></p>
                <span class="text-[10px] font-bold text-emerald-600 mt-1 inline-block">↑ {{ managementData()?.todaySummary?.totalRentals || 0 }} {{ 'COMMON.TRIPS' | translate }}</span>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ 'REPORTS.FLEET_OCCUPANCY_RATE' | translate }}</p>
                <p class="text-2xl font-black text-slate-900 font-mono mt-1">{{ managementData()?.fleet?.utilizationRate || '0%' }}</p>
                <span class="text-[10px] font-bold text-indigo-600 mt-1 inline-block">{{ managementData()?.fleet?.rented || 0 }} / {{ managementData()?.fleet?.total || 0 }} Active</span>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ 'REPORTS.AVG_TICKET_SIZE' | translate }}</p>
                <p class="text-2xl font-black text-slate-900 font-mono mt-1">{{ managementData()?.todaySummary?.averageTicket || '0.000' }} <span class="text-xs text-slate-400">KD</span></p>
                <span class="text-[10px] font-bold text-slate-500 mt-1 inline-block">Per Customer</span>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ 'REPORTS.CASH_VS_CARD' | translate }}</p>
                <p class="text-sm font-black text-slate-800 font-mono mt-1">Cash: {{ managementData()?.todaySummary?.cashTotal || '0.000' }} KD</p>
                <p class="text-sm font-black text-indigo-600 font-mono">KNET: {{ managementData()?.todaySummary?.knetTotal || '0.000' }} KD</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
              </div>
            </div>
          </div>

          <!-- Top Performing Cars & 7-Day Trend Tables -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                <span>🏎️</span>
                <span>{{ 'REPORTS.TOP_VEHICLES_TITLE' | translate }}</span>
              </h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                  <thead class="text-slate-400 font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th class="pb-2">Car No</th>
                      <th class="pb-2">Model</th>
                      <th class="pb-2 text-center">Total Trips</th>
                      <th class="pb-2 text-right">Revenue (KD)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr *ngFor="let car of managementData()?.topVehicles" class="hover:bg-slate-50">
                      <td class="py-2.5 font-bold text-slate-800">{{ car.car_no }}</td>
                      <td class="py-2.5 text-slate-600">{{ car.model }}</td>
                      <td class="py-2.5 text-center font-bold text-indigo-600">{{ car.trips }}</td>
                      <td class="py-2.5 text-right font-black font-mono text-slate-900">{{ car.revenue | number:'1.3-3' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                <span>📈</span>
                <span>{{ 'REPORTS.DAILY_TREND_7DAYS' | translate }}</span>
              </h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                  <thead class="text-slate-400 font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th class="pb-2">Date</th>
                      <th class="pb-2 text-center">Rentals</th>
                      <th class="pb-2 text-right">Gross Total (KD)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr *ngFor="let day of managementData()?.dailyTrend" class="hover:bg-slate-50">
                      <td class="py-2.5 font-mono font-bold text-slate-800">{{ day.date }}</td>
                      <td class="py-2.5 text-center font-bold text-slate-600">{{ day.rentals }}</td>
                      <td class="py-2.5 text-right font-black font-mono text-emerald-600">{{ day.revenue | number:'1.3-3' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: DAILY SALES SUMMARY -->
        <div *ngIf="!loading() && activeTab() === 'DAILY_SUMMARY'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">{{ 'REPORTS.DAILY_SALES_TITLE' | translate }} ({{ fromDate }})</h3>
            <span class="text-xs font-bold text-slate-500">{{ dailyData().length }} Transactions</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="p-3">Invoice</th>
                  <th class="p-3">Vehicle</th>
                  <th class="p-3">Customer</th>
                  <th class="p-3 text-center">Duration</th>
                  <th class="p-3 text-right">Deposit</th>
                  <th class="p-3 text-right">Discount</th>
                  <th class="p-3 text-right">Total Amount</th>
                  <th class="p-3 text-center">Method</th>
                  <th class="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let r of dailyData()" class="hover:bg-slate-50">
                  <td class="p-3 font-mono font-bold text-indigo-600">{{ r.invoice_no }}</td>
                  <td class="p-3 font-bold text-slate-800">{{ r.car_no }} ({{ r.model }})</td>
                  <td class="p-3 text-slate-600">{{ r.customer_name }}</td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ r.duration_minutes }}m</td>
                  <td class="p-3 text-right font-mono">{{ r.rental_amount | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono text-emerald-600">{{ r.discount ? '-' + (r.discount | number:'1.3-3') : '-' }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ r.total_amount | number:'1.3-3' }} KD</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold" [ngClass]="r.payment_method === 'CASH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'">{{ r.payment_method }}</span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : (r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700')">{{ r.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 3: PERIODIC REPORTS (Day-wise Date Range with Thermal & A4 Print) -->
        <div *ngIf="!loading() && activeTab() === 'PERIODIC_REPORT'" class="flex-1 min-h-0 flex flex-col gap-2.5">
          <!-- Summary Banner (Compact for 1024x768) -->
          <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-3.5 py-2 shadow-xs flex flex-wrap justify-between items-center gap-2 shrink-0">
            <div class="flex items-center gap-3">
              <h3 class="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
                <span>🖨️</span>
                <span>{{ 'REPORTS.PERIODIC_REPORT_TITLE' | translate }}</span>
              </h3>
              <span class="text-[11px] bg-white/20 px-2 py-0.5 rounded-full text-white font-bold">{{ 'REPORTS.PERIOD_FROM_TO' | translate }}: {{ fromDate }} → {{ toDate }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button 
                type="button" 
                (click)="printStandardPeriodic()"
                class="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span>{{ 'PRINT.PRINT_A4' | translate }}</span>
              </button>
              <button 
                type="button" 
                (click)="printThermalPeriodic()"
                class="px-3 py-1 bg-white text-orange-600 hover:bg-orange-50 font-black text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                <span>{{ 'REPORTS.PRINT_PERIODIC_THERMAL_BTN' | translate }}</span>
              </button>
            </div>
          </div>

          <!-- Navigation Tabs for the 6 Detailed Summaries (Single Horizontal Row) -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold overflow-x-auto shrink-0 whitespace-nowrap">
            <button type="button" (click)="periodicSubTab.set('DAYS')" [class]="periodicSubTab() === 'DAYS' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>📅 Day-by-Day Table</span>
            </button>
            <button type="button" (click)="periodicSubTab.set('CASHIER')" [class]="periodicSubTab() === 'CASHIER' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>👤 1. Cashier Wise</span>
              <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ periodicData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="periodicSubTab.set('BILLS')" [class]="periodicSubTab() === 'BILLS' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>🧾 2. Bill Wise</span>
              <span class="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-mono">{{ periodicData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="periodicSubTab.set('CARS')" [class]="periodicSubTab() === 'CARS' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>🚗 3. CAR Wise</span>
              <span class="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono">{{ periodicData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="periodicSubTab.set('HOURLY')" [class]="periodicSubTab() === 'HOURLY' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>⏰ 4. Hourly Sales</span>
              <span class="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{{ periodicData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="periodicSubTab.set('CANCELLATIONS')" [class]="periodicSubTab() === 'CANCELLATIONS' ? 'bg-white text-red-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>🚫 5. Cancellations</span>
              <span class="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-mono">{{ periodicData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="periodicSubTab.set('PAYMENTS')" [class]="periodicSubTab() === 'PAYMENTS' ? 'bg-white text-amber-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <span>💳 6. Payment Types</span>
              <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ periodicData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
            </button>
          </div>

          <!-- TAB 0: Day-by-Day Table -->
          <div *ngIf="periodicSubTab() === 'DAYS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table class="w-full text-xs text-left">
                <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2.5">Date (Day)</th>
                    <th class="px-3 py-2.5 text-center">Rentals</th>
                    <th class="px-3 py-2.5 text-right">Cash (KD)</th>
                    <th class="px-3 py-2.5 text-right">KNET / Card (KD)</th>
                    <th class="px-3 py-2.5 text-right">Discounts (KD)</th>
                    <th class="px-3 py-2.5 text-right">Refunds (KD)</th>
                    <th class="px-3 py-2.5 text-right font-black">Net Total (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let day of periodicData()?.days" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-mono font-bold text-slate-900">{{ day.date }}</td>
                    <td class="px-3 py-2 text-center font-bold text-slate-700">{{ day.rentals }}</td>
                    <td class="px-3 py-2 text-right font-mono">{{ day.cash | number:'1.3-3' }}</td>
                    <td class="px-3 py-2 text-right font-mono">{{ day.knet | number:'1.3-3' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-emerald-600">{{ day.discount ? '-' + (day.discount | number:'1.3-3') : '0.000' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-red-600">{{ day.refund ? '-' + (day.refund | number:'1.3-3') : '0.000' }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ day.total | number:'1.3-3' }} KD</td>
                  </tr>
                  <tr *ngIf="!periodicData()?.days?.length">
                    <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
                      No transactions found for the selected date range.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 1: CASHIER-WISE SUMMARY -->
          <div *ngIf="periodicSubTab() === 'CASHIER'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span class="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">1. Cashier-wise Summary</span>
                <h3 class="text-xs font-black text-slate-900">Total Sales Breakdown by Cashier</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="text-[9px] font-bold text-slate-400 uppercase block">Total Bills</span>
                  <span class="text-sm font-black text-slate-800 font-mono">{{ periodicData()?.summaries?.cashierSummary?.totalBills || 0 }}</span>
                </div>
                <div class="text-right bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span class="text-[9px] font-bold text-amber-700 uppercase block">Sales Total</span>
                  <span class="text-sm font-black text-amber-600 font-mono">{{ periodicData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
                </div>
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
                  <tr *ngFor="let item of periodicData()?.summaries?.cashierSummary?.items" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-bold text-slate-900">{{ item.cashier }}</td>
                    <td class="px-3 py-2 text-center font-bold text-slate-700">{{ item.billCount }}</td>
                    <td class="px-3 py-2 text-right font-mono text-amber-700">{{ item.cashTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono text-blue-700">{{ item.knetTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono text-emerald-600">-{{ item.discountTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ item.totalSales }} KD</td>
                  </tr>
                  <tr *ngIf="!periodicData()?.summaries?.cashierSummary?.items?.length">
                    <td colspan="6" class="p-6 text-center text-slate-400">No cashier records found for this period.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td class="px-3 py-2 text-slate-900">Sales Total (All Cashiers)</td>
                    <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ periodicData()?.summaries?.cashierSummary?.totalBills || 0 }} Bills</td>
                    <td colspan="3" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-amber-600 text-sm">{{ periodicData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- TAB 2: BILL-WISE SUMMARY -->
          <div *ngIf="periodicSubTab() === 'BILLS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span class="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">2. Bill-wise Summary</span>
                <h3 class="text-xs font-black text-slate-900">Itemized Rental Bills</h3>
              </div>
              <div class="flex items-center gap-2.5">
                <input type="text" [(ngModel)]="periodicBillFilterText" placeholder="Search invoice, car, customer..." class="bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div class="text-right bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs shrink-0">
                  <span class="text-[9px] font-bold text-blue-600 uppercase block">Sales Total</span>
                  <span class="text-sm font-black text-blue-600 font-mono">{{ periodicData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2.5">Invoice #</th>
                    <th class="px-3 py-2.5">Car # / Model</th>
                    <th class="px-3 py-2.5">Customer Phone & Name</th>
                    <th class="px-3 py-2.5 text-center">Duration</th>
                    <th class="px-3 py-2.5 text-center">Payment</th>
                    <th class="px-3 py-2.5 text-right">Cash (KD)</th>
                    <th class="px-3 py-2.5 text-right">KNET (KD)</th>
                    <th class="px-3 py-2.5 text-right">Discount (KD)</th>
                    <th class="px-3 py-2.5 text-right font-black">Net Sales (KD)</th>
                    <th class="px-3 py-2.5">Cashier</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let b of getFilteredPeriodicBills()" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-mono font-bold text-slate-800">{{ b.invoiceNo || b.id }}</td>
                    <td class="px-3 py-2">
                      <span class="font-bold text-slate-900">{{ b.carNo }}</span>
                      <span class="text-[10px] text-slate-400 block">{{ b.model }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <span *ngIf="b.customerPhone" class="font-mono font-bold text-indigo-700 block">{{ b.customerPhone }}</span>
                      <span class="font-medium text-slate-700">{{ b.customerName }}</span>
                    </td>
                    <td class="px-3 py-2 text-center font-bold text-slate-600">{{ b.durationMinutes }}m</td>
                    <td class="px-3 py-2 text-center font-bold text-indigo-700">{{ b.paymentMethod }}</td>
                    <td class="px-3 py-2 text-right font-mono">{{ b.cashAmount }}</td>
                    <td class="px-3 py-2 text-right font-mono">{{ b.knetAmount }}</td>
                    <td class="px-3 py-2 text-right font-mono text-emerald-600">{{ b.discount > 0 ? '-' + b.discount : '0.000' }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ b.totalSales }} KD</td>
                    <td class="px-3 py-2 text-slate-500">{{ b.cashier }}</td>
                  </tr>
                  <tr *ngIf="!getFilteredPeriodicBills().length">
                    <td colspan="10" class="p-6 text-center text-slate-400">No rental bills match the current filter.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td colspan="4" class="px-3 py-2 text-slate-900">Total Completed Bills: {{ periodicData()?.summaries?.billSummary?.totalBills || 0 }}</td>
                    <td colspan="4" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-blue-600 text-sm">{{ periodicData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- TAB 3: CAR-WISE SUMMARY -->
          <div *ngIf="periodicSubTab() === 'CARS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span class="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">3. CAR-wise Summary</span>
                <h3 class="text-xs font-black text-slate-900">Vehicle Utilization & Revenue</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="text-[9px] font-bold text-slate-400 uppercase block">Active Cars</span>
                  <span class="text-sm font-black text-slate-800 font-mono">{{ periodicData()?.summaries?.carSummary?.totalCars || 0 }}</span>
                </div>
                <div class="text-right">
                  <span class="text-[9px] font-bold text-slate-400 uppercase block">Total Trips</span>
                  <span class="text-sm font-black text-slate-800 font-mono">{{ periodicData()?.summaries?.carSummary?.totalTrips || 0 }}</span>
                </div>
                <div class="text-right bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                  <span class="text-[9px] font-bold text-emerald-600 uppercase block">Sales Total</span>
                  <span class="text-sm font-black text-emerald-600 font-mono">{{ periodicData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
                </div>
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
                    <th class="px-3 py-2.5 text-right font-black">Total Revenue (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let car of periodicData()?.summaries?.carSummary?.items" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-mono font-bold text-indigo-700">Car #{{ car.carNo }}</td>
                    <td class="px-3 py-2 font-semibold text-slate-800">{{ car.model }}</td>
                    <td class="px-3 py-2 text-center font-bold text-slate-700">{{ car.tripCount }}</td>
                    <td class="px-3 py-2 text-center font-mono">{{ car.totalMinutes }}m</td>
                    <td class="px-3 py-2 text-right font-mono text-amber-700">{{ car.cashTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono text-blue-700">{{ car.knetTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ car.totalSales }} KD</td>
                  </tr>
                  <tr *ngIf="!periodicData()?.summaries?.carSummary?.items?.length">
                    <td colspan="7" class="p-6 text-center text-slate-400">No vehicle rentals recorded for this period.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td colspan="2" class="px-3 py-2 text-slate-900">Total Fleet Active: {{ periodicData()?.summaries?.carSummary?.totalCars || 0 }} Cars</td>
                    <td class="px-3 py-2 text-center text-slate-900 font-mono">{{ periodicData()?.summaries?.carSummary?.totalTrips || 0 }} Trips</td>
                    <td colspan="3" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-emerald-600 text-sm">{{ periodicData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- TAB 4: HOURLY SALES SUMMARY -->
          <div *ngIf="periodicSubTab() === 'HOURLY'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="px-3.5 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span class="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">4. Hourly Sales Summary</span>
                <h3 class="text-xs font-black text-slate-900">Revenue Velocity by Hour Slot</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="text-[9px] font-bold text-slate-400 uppercase block">Peak Sales Hour</span>
                  <span class="text-xs font-bold text-purple-700">{{ periodicData()?.summaries?.hourlySummary?.peakHour || 'N/A' }}</span>
                </div>
                <div class="text-right bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                  <span class="text-[9px] font-bold text-purple-600 uppercase block">Sales Total</span>
                  <span class="text-sm font-black text-purple-600 font-mono">{{ periodicData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2.5">Hour Slot</th>
                    <th class="px-3 py-2.5 text-center">Transactions (Trips)</th>
                    <th class="px-3 py-2.5 text-right">Cash (KD)</th>
                    <th class="px-3 py-2.5 text-right">KNET (KD)</th>
                    <th class="px-3 py-2.5 text-right font-black">Hourly Sales Total (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let h of periodicData()?.summaries?.hourlySummary?.items" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-mono font-bold text-slate-800">{{ h.hourSlot }}</td>
                    <td class="px-3 py-2 text-center font-bold text-purple-700">{{ h.billCount }}</td>
                    <td class="px-3 py-2 text-right font-mono">{{ h.cashTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono">{{ h.knetTotal }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ h.totalSales }} KD</td>
                  </tr>
                  <tr *ngIf="!periodicData()?.summaries?.hourlySummary?.items?.length">
                    <td colspan="5" class="p-6 text-center text-slate-400">No hourly records found for this period.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td colspan="2" class="px-3 py-2 text-slate-900">Total Active Hours: {{ periodicData()?.summaries?.hourlySummary?.items?.length || 0 }}</td>
                    <td colspan="2" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-purple-600 text-sm">{{ periodicData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- TAB 5: CANCELLATIONS SUMMARY -->
          <div *ngIf="periodicSubTab() === 'CANCELLATIONS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="px-3.5 py-2 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span class="text-[9px] font-bold text-red-600 uppercase tracking-wider block">5. Cancellation Bills Summary</span>
                <h3 class="text-xs font-black text-slate-900">Voided Transactions & Reversals</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="text-[9px] font-bold text-slate-400 uppercase block">Cancelled Bills</span>
                  <span class="text-sm font-black text-red-700 font-mono">{{ periodicData()?.summaries?.cancellationSummary?.totalCount || 0 }}</span>
                </div>
                <div class="text-right bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs">
                  <span class="text-[9px] font-bold text-red-600 uppercase block">Sales Total (Voided)</span>
                  <span class="text-sm font-black text-red-600 font-mono">{{ periodicData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2.5">Invoice #</th>
                    <th class="px-3 py-2.5">Car # / Model</th>
                    <th class="px-3 py-2.5">Customer</th>
                    <th class="px-3 py-2.5 text-center">Cancelled At</th>
                    <th class="px-3 py-2.5">Reason</th>
                    <th class="px-3 py-2.5 text-right font-black">Voided Amount (KD)</th>
                    <th class="px-3 py-2.5">Cashier</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let c of periodicData()?.summaries?.cancellationSummary?.items" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-mono font-bold text-red-700">{{ c.invoiceNo || c.id }}</td>
                    <td class="px-3 py-2">
                      <span class="font-bold text-slate-900">{{ c.carNo }}</span>
                      <span class="text-[10px] text-slate-400 block">{{ c.model }}</span>
                    </td>
                    <td class="px-3 py-2 text-slate-700">{{ c.customerName }}</td>
                    <td class="px-3 py-2 text-center font-mono text-slate-500">{{ c.cancelledAt | date:'HH:mm:ss' }}</td>
                    <td class="px-3 py-2 text-slate-600 font-medium">{{ c.reason || 'Customer requested' }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-red-600">{{ c.amount }} KD</td>
                    <td class="px-3 py-2 text-slate-500">{{ c.cashier }}</td>
                  </tr>
                  <tr *ngIf="!periodicData()?.summaries?.cancellationSummary?.items?.length">
                    <td colspan="7" class="p-6 text-center text-slate-400">No cancelled transactions during this period.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td colspan="4" class="px-3 py-2 text-slate-900">Total Cancelled Invoices: {{ periodicData()?.summaries?.cancellationSummary?.totalCount || 0 }}</td>
                    <td class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Voided Sales Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-red-600 text-sm">{{ periodicData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- TAB 6: PAYMENT TYPE SUMMARY -->
          <div *ngIf="periodicSubTab() === 'PAYMENTS'" class="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 min-h-[260px] flex flex-col overflow-hidden">
            <div class="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span class="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">6. Payment Type-wise Summary</span>
                <h3 class="text-xs font-black text-slate-900">Settlements by Payment Gateway</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="text-[9px] font-bold text-slate-400 uppercase block">Total Settlements</span>
                  <span class="text-sm font-black text-slate-800 font-mono">{{ periodicData()?.summaries?.paymentTypeSummary?.totalCount || 0 }}</span>
                </div>
                <div class="text-right bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span class="text-[9px] font-bold text-amber-700 uppercase block">Sales Total</span>
                  <span class="text-sm font-black text-amber-600 font-mono">{{ periodicData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="px-3 py-2.5">Payment Method</th>
                    <th class="px-3 py-2.5 text-center">Transactions</th>
                    <th class="px-3 py-2.5 text-right font-black">Total Sales Settled (KD)</th>
                    <th class="px-3 py-2.5 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let p of periodicData()?.summaries?.paymentTypeSummary?.items" class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-bold text-slate-900 flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" [ngClass]="p.method === 'CASH' ? 'bg-amber-500' : (p.method === 'KNET' ? 'bg-blue-500' : 'bg-emerald-500')"></span>
                      {{ p.method }}
                    </td>
                    <td class="px-3 py-2 text-center font-bold text-slate-700">{{ p.count }}</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">{{ p.amount }} KD</td>
                    <td class="px-3 py-2 text-right font-mono font-bold text-indigo-600">{{ p.percentage }}%</td>
                  </tr>
                  <tr *ngIf="!periodicData()?.summaries?.paymentTypeSummary?.items?.length">
                    <td colspan="4" class="p-6 text-center text-slate-400">No payment records found for this period.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td class="px-3 py-2 text-slate-900">Total Transactions: {{ periodicData()?.summaries?.paymentTypeSummary?.totalCount || 0 }}</td>
                    <td colspan="1" class="px-3 py-2 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-amber-600 text-sm">{{ periodicData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-slate-900">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 4: LOCATION-WISE SALES -->
        <div *ngIf="!loading() && activeTab() === 'LOCATION_SALES'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Location-wise Sales & Utilization</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="p-3">Branch</th>
                  <th class="p-3">Location / Counter</th>
                  <th class="p-3 text-center">Total Trips</th>
                  <th class="p-3 text-center">Total Minutes</th>
                  <th class="p-3 text-right">Cash Revenue</th>
                  <th class="p-3 text-right">KNET Revenue</th>
                  <th class="p-3 text-right font-black">Total Revenue (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let loc of locationData()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-800">{{ loc.branch }}</td>
                  <td class="p-3 font-bold text-indigo-600">{{ loc.location }}</td>
                  <td class="p-3 text-center font-bold">{{ loc.total_trips }}</td>
                  <td class="p-3 text-center font-mono">{{ loc.total_duration_mins }}m</td>
                  <td class="p-3 text-right font-mono">{{ loc.cash_revenue | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono">{{ loc.knet_revenue | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ loc.total_revenue | number:'1.3-3' }} KD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 5: ITEM-WISE SALES (Single vs Double Seater) -->
        <div *ngIf="!loading() && activeTab() === 'ITEM_SALES'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Item & Model Sales Breakdown</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="p-3">Car Model</th>
                  <th class="p-3">Seater Category</th>
                  <th class="p-3 text-center">Rentals Count</th>
                  <th class="p-3 text-center">Total Track Time</th>
                  <th class="p-3 text-center">Avg Trip Duration</th>
                  <th class="p-3 text-right font-black">Gross Revenue (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let itm of itemData()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-900">{{ itm.model }}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold" [ngClass]="itm.seater_category === 'Single Seater' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">{{ itm.seater_category }}</span>
                  </td>
                  <td class="p-3 text-center font-bold text-indigo-600">{{ itm.total_rentals }}</td>
                  <td class="p-3 text-center font-mono">{{ itm.total_minutes }} mins</td>
                  <td class="p-3 text-center font-mono">{{ itm.avg_duration | number:'1.0-0' }} mins</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ itm.total_revenue | number:'1.3-3' }} KD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 6: PAYMENT & COLLECTION RECONCILIATION -->
        <div *ngIf="!loading() && activeTab() === 'PAYMENT_COLLECTION'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Payment Methods & Drawer Reconciliation</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="p-3">Payment Method</th>
                  <th class="p-3 text-center">Transactions</th>
                  <th class="p-3 text-right">Initial Deposits</th>
                  <th class="p-3 text-right">Overtime Charges</th>
                  <th class="p-3 text-right">Total Discounts</th>
                  <th class="p-3 text-right">Refunds Given</th>
                  <th class="p-3 text-right font-black">Net Settled (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let pay of paymentData()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" [ngClass]="pay.payment_method === 'CASH' ? 'bg-amber-500' : 'bg-blue-500'"></span>
                    {{ pay.payment_method }}
                  </td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ pay.transaction_count }}</td>
                  <td class="p-3 text-right font-mono">{{ pay.gross_deposit_amount | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono text-slate-700">+{{ pay.overtime_extra_amount | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono text-emerald-600">-{{ pay.total_discounts | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono text-red-600">-{{ pay.total_refunds | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ pay.net_collected_amount | number:'1.3-3' }} KD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 7: AGGREGATOR SALES & RECONCILIATION -->
        <div *ngIf="!loading() && activeTab() === 'AGGREGATOR_SALES'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Aggregator & Channel Settlement</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="p-3">Channel / Terminal</th>
                  <th class="p-3">Type</th>
                  <th class="p-3 text-center">Orders</th>
                  <th class="p-3 text-right">Cash Amount</th>
                  <th class="p-3 text-right">Digital / Card</th>
                  <th class="p-3 text-right font-black">Total Settlement (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let agg of aggregatorData()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-900">{{ agg.channel }}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">{{ agg.channel_type }}</span>
                  </td>
                  <td class="p-3 text-center font-bold text-indigo-600">{{ agg.total_orders }}</td>
                  <td class="p-3 text-right font-mono">{{ agg.cash_amount | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono">{{ agg.digital_amount | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ agg.total_settlement | number:'1.3-3' }} KD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 8: DISCOUNT ANALYSIS -->
        <div *ngIf="!loading() && activeTab() === 'DISCOUNT_ANALYSIS'" class="space-y-6">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Discount Types Analysis</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th class="p-3">Discount Type</th>
                    <th class="p-3 text-center">Usage Count</th>
                    <th class="p-3 text-right">Original Value</th>
                    <th class="p-3 text-right">Total Discount Given</th>
                    <th class="p-3 text-right font-black">Net Collected (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let d of discountData()?.summaryByType" class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {{ d.discount_name }}
                      </span>
                    </td>
                    <td class="p-3 text-center font-bold text-indigo-600">{{ d.usage_count }}</td>
                    <td class="p-3 text-right font-mono">{{ d.original_value | number:'1.3-3' }}</td>
                    <td class="p-3 text-right font-mono font-bold text-emerald-600">-{{ d.total_discount_given | number:'1.3-3' }}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ d.net_collected | number:'1.3-3' }} KD</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 9: CANCELLATION & REFUND ANALYSIS -->
        <div *ngIf="!loading() && activeTab() === 'CANCELLATION_ANALYSIS'" class="space-y-6">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Void Bills & Refund Audit by Reason</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th class="p-3">Reason for Cancellation</th>
                    <th class="p-3 text-center">Cancelled Bills</th>
                    <th class="p-3 text-right font-black">Total Voided Amount (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let c of cancellationData()?.summaryByReason" class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-slate-900">{{ c.reason }}</td>
                    <td class="p-3 text-center font-bold text-red-600">{{ c.count }}</td>
                    <td class="p-3 text-right font-mono font-black text-red-700">{{ c.voided_amount | number:'1.3-3' }} KD</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 10: CASHIER / EMPLOYEE PERFORMANCE -->
        <div *ngIf="!loading() && activeTab() === 'CASHIER_PERFORMANCE'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Cashier & Employee Performance</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="p-3">Cashier Name</th>
                  <th class="p-3 text-center">Transactions</th>
                  <th class="p-3 text-center">Completed</th>
                  <th class="p-3 text-center">Cancelled</th>
                  <th class="p-3 text-right">Cash Handled</th>
                  <th class="p-3 text-right">KNET Handled</th>
                  <th class="p-3 text-right font-black">Net Revenue Generated (KD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let emp of cashierData()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]">
                      {{ emp.cashier_name ? emp.cashier_name.charAt(0).toUpperCase() : 'C' }}
                    </div>
                    <span>{{ emp.cashier_name }}</span>
                  </td>
                  <td class="p-3 text-center font-bold text-slate-700">{{ emp.total_transactions }}</td>
                  <td class="p-3 text-center font-bold text-emerald-600">{{ emp.completed_count }}</td>
                  <td class="p-3 text-center font-bold text-red-600">{{ emp.cancelled_count }}</td>
                  <td class="p-3 text-right font-mono">{{ emp.cash_collected | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono">{{ emp.knet_collected | number:'1.3-3' }}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">{{ emp.net_sales_total | number:'1.3-3' }} KD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 10B: CUSTOMER-WISE SALES REPORT (PHONE NUMBER FIRST) -->
        <div *ngIf="!loading() && activeTab() === 'CUSTOMER_SALES'" class="space-y-6">
          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique Customers</span>
              <p class="text-2xl font-black text-indigo-600 font-mono mt-1">{{ customerSalesData()?.summary?.totalCustomers || 0 }}</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Customer Trips</span>
              <p class="text-2xl font-black text-slate-900 font-mono mt-1">{{ customerSalesData()?.summary?.totalTrips || 0 }}</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cash / KNET Split</span>
              <p class="text-sm font-black text-slate-800 font-mono mt-1.5">
                <span class="text-amber-600">{{ customerSalesData()?.summary?.totalCash || '0.000' }}</span> /
                <span class="text-blue-600">{{ customerSalesData()?.summary?.totalKnet || '0.000' }} KD</span>
              </p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 shadow-xs">
              <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Total Customer Revenue</span>
              <p class="text-2xl font-black text-indigo-700 font-mono mt-1">{{ customerSalesData()?.summary?.totalRevenue || '0.000' }} KD</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Customer-wise Sales Summary (Phone First)</h3>
                <p class="text-xs text-slate-500">Grouped by customer phone number to prevent duplicate/junk customer entries.</p>
              </div>
              <div class="relative w-full sm:w-72">
                <input
                  type="text"
                  [ngModel]="customerSearchFilter()"
                  (ngModelChange)="customerSearchFilter.set($event)"
                  placeholder="Search by Phone # or Customer Name..."
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-xs text-left">
                <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th class="p-3">{{ 'POS.MOBILE_NO' | translate }}</th>
                    <th class="p-3">{{ 'POS.CUSTOMER_NAME' | translate }}</th>
                    <th class="p-3 text-center">Trips Count</th>
                    <th class="p-3 text-center">Completed / Void</th>
                    <th class="p-3 text-center">Total Duration</th>
                    <th class="p-3 text-right">Cash (KD)</th>
                    <th class="p-3 text-right">KNET (KD)</th>
                    <th class="p-3 text-right">Discount (KD)</th>
                    <th class="p-3 text-right font-black">Total Revenue (KD)</th>
                    <th class="p-3 text-right">Last Visit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let cust of getFilteredCustomerSales()" class="hover:bg-slate-50">
                    <td class="p-3">
                      <span class="font-mono font-black text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {{ cust.customer_phone }}
                      </span>
                    </td>
                    <td class="p-3 font-bold text-slate-900">{{ cust.customer_name }}</td>
                    <td class="p-3 text-center font-bold text-indigo-600">{{ cust.total_trips }}</td>
                    <td class="p-3 text-center">
                      <span class="text-emerald-600 font-bold">{{ cust.completed_trips }}</span>
                      <span *ngIf="cust.cancelled_trips > 0" class="text-red-500 font-bold ml-1">/ {{ cust.cancelled_trips }} void</span>
                    </td>
                    <td class="p-3 text-center font-mono text-slate-600">{{ cust.total_minutes }}m</td>
                    <td class="p-3 text-right font-mono">{{ cust.cash_total | number:'1.3-3' }}</td>
                    <td class="p-3 text-right font-mono">{{ cust.knet_total | number:'1.3-3' }}</td>
                    <td class="p-3 text-right font-mono text-emerald-600">{{ cust.discount_total > 0 ? '-' + (cust.discount_total | number:'1.3-3') : '0.000' }}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ cust.total_revenue | number:'1.3-3' }} KD</td>
                    <td class="p-3 text-right font-mono text-slate-500">{{ cust.last_visit | date:'yyyy-MM-dd HH:mm' }}</td>
                  </tr>
                  <tr *ngIf="!getFilteredCustomerSales().length">
                    <td colspan="10" class="p-6 text-center text-slate-400">No customer sales records match the current date range or filter.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>


        <!-- TAB 11: SHIFT REPORT (Requirement 4) -->
        <div *ngIf="!loading() && activeTab() === 'SHIFT_REPORT'" class="space-y-6">
          <!-- Shift Filter Strip & Actions -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Shift:</span>
              <div class="flex bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-bold">
                <button 
                  type="button" 
                  (click)="onShiftFilterChange(1)" 
                  [class]="shiftNumberFilter() === 1 ? 'bg-white text-orange-600 shadow-xs px-3 py-1.5 rounded' : 'text-slate-600 px-3 py-1.5 cursor-pointer'">
                  Shift #1
                </button>
                <button 
                  type="button" 
                  (click)="onShiftFilterChange(2)" 
                  [class]="shiftNumberFilter() === 2 ? 'bg-white text-orange-600 shadow-xs px-3 py-1.5 rounded' : 'text-slate-600 px-3 py-1.5 cursor-pointer'">
                  Shift #2
                </button>
              </div>
              <span class="text-xs text-slate-400 font-medium">Date: <strong class="text-slate-700 font-mono">{{ fromDate }}</strong></span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                type="button" 
                (click)="printStandardShiftReport()" 
                [disabled]="!shiftReportData()"
                class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                <span>{{ 'PRINT.PRINT_A4' | translate }}</span>
              </button>
              <button 
                type="button" 
                (click)="printThermalShiftReport()" 
                [disabled]="!shiftReportData()"
                class="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span>{{ 'PRINT.THERMAL_PRINT' | translate }} (80mm)</span>
              </button>
            </div>
          </div>

          <!-- Shift Operational & Financial Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shift Cycle & Cashier</span>
              <p class="text-xl font-black text-slate-900 mt-1">Shift #{{ shiftReportData()?.shiftNumber || shiftNumberFilter() }}</p>
              <p class="text-xs font-semibold text-slate-600 mt-0.5">👤 {{ shiftReportData()?.cashierName || 'Not Started' }}</p>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded mt-2 inline-block" [ngClass]="shiftReportData()?.status === 'CLOSED' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'">
                {{ shiftReportData()?.status || 'Active' }}
              </span>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cars Used / Fleet Activity</span>
              <p class="text-2xl font-black text-indigo-700 font-mono mt-1">{{ shiftReportData()?.totalCarsUsed || 0 }} <span class="text-xs text-slate-400">Cars</span></p>
              <p class="text-xs font-semibold text-slate-600 mt-0.5">
                {{ shiftReportData()?.singleCarsUsed || 0 }} Single • {{ shiftReportData()?.doubleCarsUsed || 0 }} Double
              </p>
              <span class="text-[10px] font-bold text-indigo-600 mt-1 inline-block">{{ shiftReportData()?.totalRentals || 0 }} Total Trips</span>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Breakdown</span>
              <p class="text-xs font-bold text-slate-700 font-mono mt-1">Cash: <strong class="text-slate-900">{{ (shiftReportData()?.cashAmount || '0.000') | number:'1.3-3' }} KD</strong></p>
              <p class="text-xs font-bold text-indigo-700 font-mono mt-1">KNET: <strong class="text-indigo-900">{{ (shiftReportData()?.knetAmount || shiftReportData()?.cardAmount || '0.000') | number:'1.3-3' }} KD</strong></p>
              <p class="text-[11px] font-bold text-emerald-600 mt-1">Discounts: -{{ (shiftReportData()?.discountAmount || '0.000') | number:'1.3-3' }} KD</p>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Net Collection</span>
              <p class="text-2xl font-black text-slate-900 font-mono mt-1">{{ (shiftReportData()?.netRevenue || shiftReportData()?.totalRevenue || '0.000') | number:'1.3-3' }} <span class="text-xs text-indigo-600">KD</span></p>
              <span class="text-[10px] text-slate-400 mt-1 block">Started: {{ (shiftReportData()?.startTime | date:'HH:mm') || 'N/A' }} | Ended: {{ (shiftReportData()?.endTime | date:'HH:mm') || 'In Progress' }}</span>
            </div>
          </div>

          <!-- Navigation Tabs for Shift Detailed Summaries -->
          <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
            <button type="button" (click)="shiftSubTab.set('COMPLETED_BILLS')" [class]="shiftSubTab() === 'COMPLETED_BILLS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>🚗 Completed Rentals ({{ (shiftReportData()?.items || []).length }})</span>
            </button>
            <button type="button" (click)="shiftSubTab.set('CASHIER')" [class]="shiftSubTab() === 'CASHIER' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>👤 1. Cashier Wise</span>
              <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ shiftReportData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="shiftSubTab.set('BILLS')" [class]="shiftSubTab() === 'BILLS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>🧾 2. Bill Wise</span>
              <span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-mono">{{ shiftReportData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="shiftSubTab.set('CARS')" [class]="shiftSubTab() === 'CARS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>🚗 3. CAR Wise</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono">{{ shiftReportData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="shiftSubTab.set('HOURLY')" [class]="shiftSubTab() === 'HOURLY' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>⏰ 4. Hourly Sales</span>
              <span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{{ shiftReportData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="shiftSubTab.set('CANCELLATIONS')" [class]="shiftSubTab() === 'CANCELLATIONS' ? 'bg-white text-red-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>🚫 5. Cancellations</span>
              <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-mono">{{ shiftReportData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
            </button>
            <button type="button" (click)="shiftSubTab.set('PAYMENTS')" [class]="shiftSubTab() === 'PAYMENTS' ? 'bg-white text-orange-600 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'" class="px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0">
              <span>💳 6. Payment Types</span>
              <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">{{ shiftReportData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
            </button>
          </div>

          <!-- SUB-TAB 0: Itemized Rentals in this Shift -->
          <div *ngIf="shiftSubTab() === 'COMPLETED_BILLS'" class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <span>🚗</span>
                <span>Completed Rentals in Shift #{{ shiftReportData()?.shiftNumber || shiftNumberFilter() }}</span>
              </h3>
              <span class="text-xs font-bold text-slate-400">{{ (shiftReportData()?.items || []).length }} Records</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="text-slate-400 font-bold uppercase border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th class="p-3">Invoice</th>
                    <th class="p-3">Car</th>
                    <th class="p-3">Customer</th>
                    <th class="p-3">Start Time</th>
                    <th class="p-3">End Time</th>
                    <th class="p-3">Duration</th>
                    <th class="p-3">Method</th>
                    <th class="p-3 text-right">Discount</th>
                    <th class="p-3 text-right font-black">Net Paid (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let item of (shiftReportData()?.items || [])" class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-slate-900">{{ item.invoice_no || item.invoiceNo }}</td>
                    <td class="p-3 font-semibold text-slate-800">Car #{{ item.car_no || item.carNo }} <span class="text-slate-400 font-normal">({{ item.model }})</span></td>
                    <td class="p-3 text-slate-700">{{ item.customer_name || item.customerName || 'Walk-in' }}</td>
                    <td class="p-3 font-mono text-slate-600">{{ (item.start_time || item.startTime) | date:'HH:mm:ss' }}</td>
                    <td class="p-3 font-mono text-slate-600">{{ (item.actual_end_time || item.actualEndTime) | date:'HH:mm:ss' }}</td>
                    <td class="p-3 font-mono font-bold text-indigo-700">{{ item.elapsed_duration || item.elapsedDuration || ((item.duration_minutes || item.durationMinutes) + 'm') }}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold" [ngClass]="item.payment_method === 'KNET' ? 'bg-indigo-50 text-indigo-700' : (item.payment_method === 'SPLIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700')">
                        {{ item.payment_method || 'CASH' }}
                      </span>
                    </td>
                    <td class="p-3 text-right font-mono text-emerald-600">
                      {{ item.discount && +item.discount > 0 ? ('-' + (item.discount | number:'1.3-3')) : '0.000' }}
                    </td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ (item.total_amount || item.totalAmount || '0.000') | number:'1.3-3' }} KD</td>
                  </tr>
                  <tr *ngIf="!(shiftReportData()?.items?.length)">
                    <td colspan="9" class="p-8 text-center text-slate-400 font-medium">
                      No completed rental transactions found for this shift on {{ fromDate }}.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SUB-TAB 1: CASHIER-WISE SUMMARY -->
          <div *ngIf="shiftSubTab() === 'CASHIER'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">1. Cashier-wise Summary</span>
                <h3 class="text-base font-black text-slate-900">Total Sales Breakdown by Cashier</h3>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Bills</span>
                  <span class="text-lg font-black text-slate-800 font-mono">{{ shiftReportData()?.summaries?.cashierSummary?.totalBills || 0 }}</span>
                </div>
                <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-amber-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-amber-700 uppercase block">Sales Total</span>
                  <span class="text-xl font-black text-amber-600 font-mono">{{ shiftReportData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
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
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let item of shiftReportData()?.summaries?.cashierSummary?.items" class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-slate-900">{{ item.cashier }}</td>
                    <td class="p-3 text-center font-bold text-slate-700">{{ item.billCount }}</td>
                    <td class="p-3 text-right font-mono text-amber-700">{{ item.cashTotal }}</td>
                    <td class="p-3 text-right font-mono text-blue-700">{{ item.knetTotal }}</td>
                    <td class="p-3 text-right font-mono text-emerald-600">-{{ item.discountTotal }}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ item.totalSales }} KD</td>
                  </tr>
                  <tr *ngIf="!shiftReportData()?.summaries?.cashierSummary?.items?.length">
                    <td colspan="6" class="p-6 text-center text-slate-400">No cashier records found for this shift.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td class="p-3 text-slate-900">Sales Total (All Cashiers)</td>
                    <td class="p-3 text-center text-slate-900 font-mono">{{ shiftReportData()?.summaries?.cashierSummary?.totalBills || 0 }} Bills</td>
                    <td colspan="3" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="p-3 text-right font-mono font-black text-amber-600 text-sm">{{ shiftReportData()?.summaries?.cashierSummary?.salesTotal || '0.000' }} KD</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- SUB-TAB 2: BILL-WISE SUMMARY -->
          <div *ngIf="shiftSubTab() === 'BILLS'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">2. Bill-wise Summary</span>
                <h3 class="text-base font-black text-slate-900">Itemized Rental Bills</h3>
              </div>
              <div class="flex items-center gap-3">
                <input type="text" [(ngModel)]="shiftBillFilterText" placeholder="Search invoice, car, customer..." class="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-2xs shrink-0">
                  <span class="text-[10px] font-bold text-blue-600 uppercase block">Sales Total</span>
                  <span class="text-xl font-black text-blue-600 font-mono">{{ shiftReportData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto">
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
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let b of getFilteredShiftBills()" class="hover:bg-slate-50">
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
                  <tr *ngIf="!getFilteredShiftBills().length">
                    <td colspan="10" class="p-6 text-center text-slate-400">No rental bills match the current filter.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold sticky bottom-0 z-10">
                  <tr>
                    <td colspan="4" class="p-3 text-slate-900">Total Completed Bills: {{ shiftReportData()?.summaries?.billSummary?.totalBills || 0 }}</td>
                    <td colspan="4" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="p-3 text-right font-mono font-black text-blue-600 text-sm">{{ shiftReportData()?.summaries?.billSummary?.salesTotal || '0.000' }} KD</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- SUB-TAB 3: CAR-WISE SUMMARY -->
          <div *ngIf="shiftSubTab() === 'CARS'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div class="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">3. CAR-wise Summary</span>
                <h3 class="text-base font-black text-slate-900">Vehicle Utilization & Revenue</h3>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Active Cars</span>
                  <span class="text-lg font-black text-slate-800 font-mono">{{ shiftReportData()?.summaries?.carSummary?.totalCars || 0 }}</span>
                </div>
                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Trips</span>
                  <span class="text-lg font-black text-slate-800 font-mono">{{ shiftReportData()?.summaries?.carSummary?.totalTrips || 0 }}</span>
                </div>
                <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-emerald-600 uppercase block">Sales Total</span>
                  <span class="text-xl font-black text-emerald-600 font-mono">{{ shiftReportData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
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
                    <th class="p-3 text-right font-black">Total Revenue (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let car of shiftReportData()?.summaries?.carSummary?.items" class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-indigo-700">Car #{{ car.carNo }}</td>
                    <td class="p-3 font-semibold text-slate-800">{{ car.model }}</td>
                    <td class="p-3 text-center font-bold text-slate-700">{{ car.tripCount }}</td>
                    <td class="p-3 text-center font-mono">{{ car.totalMinutes }}m</td>
                    <td class="p-3 text-right font-mono text-amber-700">{{ car.cashTotal }}</td>
                    <td class="p-3 text-right font-mono text-blue-700">{{ car.knetTotal }}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ car.totalSales }} KD</td>
                  </tr>
                  <tr *ngIf="!shiftReportData()?.summaries?.carSummary?.items?.length">
                    <td colspan="7" class="p-6 text-center text-slate-400">No vehicle rentals recorded for this shift.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td colspan="2" class="p-3 text-slate-900">Total Fleet Active: {{ shiftReportData()?.summaries?.carSummary?.totalCars || 0 }} Cars</td>
                    <td class="p-3 text-center text-slate-900 font-mono">{{ shiftReportData()?.summaries?.carSummary?.totalTrips || 0 }} Trips</td>
                    <td colspan="3" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="p-3 text-right font-mono font-black text-emerald-600 text-sm">{{ shiftReportData()?.summaries?.carSummary?.salesTotal || '0.000' }} KD</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- SUB-TAB 4: HOURLY SALES SUMMARY -->
          <div *ngIf="shiftSubTab() === 'HOURLY'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div class="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">4. Hourly Sales Summary</span>
                <h3 class="text-base font-black text-slate-900">Revenue Velocity by Hour Slot</h3>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Peak Sales Hour</span>
                  <span class="text-sm font-bold text-purple-700">{{ shiftReportData()?.summaries?.hourlySummary?.peakHour || 'N/A' }}</span>
                </div>
                <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-purple-600 uppercase block">Sales Total</span>
                  <span class="text-xl font-black text-purple-600 font-mono">{{ shiftReportData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th class="p-3">Hour Slot</th>
                    <th class="p-3 text-center">Transactions (Trips)</th>
                    <th class="p-3 text-right">Cash (KD)</th>
                    <th class="p-3 text-right">KNET (KD)</th>
                    <th class="p-3 text-right font-black">Hourly Sales Total (KD)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let h of shiftReportData()?.summaries?.hourlySummary?.items" class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-slate-800">{{ h.hourSlot }}</td>
                    <td class="p-3 text-center font-bold text-purple-700">{{ h.billCount }}</td>
                    <td class="p-3 text-right font-mono">{{ h.cashTotal }}</td>
                    <td class="p-3 text-right font-mono">{{ h.knetTotal }}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ h.totalSales }} KD</td>
                  </tr>
                  <tr *ngIf="!shiftReportData()?.summaries?.hourlySummary?.items?.length">
                    <td colspan="5" class="p-6 text-center text-slate-400">No hourly records found for this shift.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td colspan="2" class="p-3 text-slate-900">Total Active Hours: {{ shiftReportData()?.summaries?.hourlySummary?.items?.length || 0 }}</td>
                    <td colspan="2" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="p-3 text-right font-mono font-black text-purple-600 text-sm">{{ shiftReportData()?.summaries?.hourlySummary?.salesTotal || '0.000' }} KD</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- SUB-TAB 5: CANCELLATIONS SUMMARY -->
          <div *ngIf="shiftSubTab() === 'CANCELLATIONS'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div class="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-red-600 uppercase tracking-wider block">5. Cancellation Bills Summary</span>
                <h3 class="text-base font-black text-slate-900">Voided Transactions & Reversals</h3>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Cancelled Bills</span>
                  <span class="text-lg font-black text-red-700 font-mono">{{ shiftReportData()?.summaries?.cancellationSummary?.totalCount || 0 }}</span>
                </div>
                <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-red-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-red-600 uppercase block">Sales Total (Voided)</span>
                  <span class="text-xl font-black text-red-600 font-mono">{{ shiftReportData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th class="p-3">Invoice #</th>
                    <th class="p-3">Car # / Model</th>
                    <th class="p-3">Customer</th>
                    <th class="p-3 text-center">Cancelled At</th>
                    <th class="p-3">Reason</th>
                    <th class="p-3 text-right font-black">Voided Amount (KD)</th>
                    <th class="p-3">Cashier</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let c of shiftReportData()?.summaries?.cancellationSummary?.items" class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-red-700">{{ c.invoiceNo || c.id }}</td>
                    <td class="p-3">
                      <span class="font-bold text-slate-900">{{ c.carNo }}</span>
                      <span class="text-[10px] text-slate-400 block">{{ c.model }}</span>
                    </td>
                    <td class="p-3 text-slate-700">{{ c.customerName }}</td>
                    <td class="p-3 text-center font-mono text-slate-500">{{ c.cancelledAt | date:'HH:mm:ss' }}</td>
                    <td class="p-3 text-slate-600 font-medium">{{ c.reason || 'Customer requested' }}</td>
                    <td class="p-3 text-right font-mono font-black text-red-600">{{ c.amount }} KD</td>
                    <td class="p-3 text-slate-500">{{ c.cashier }}</td>
                  </tr>
                  <tr *ngIf="!shiftReportData()?.summaries?.cancellationSummary?.items?.length">
                    <td colspan="7" class="p-6 text-center text-slate-400">No cancelled transactions during this shift.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td colspan="4" class="p-3 text-slate-900">Total Cancelled Invoices: {{ shiftReportData()?.summaries?.cancellationSummary?.totalCount || 0 }}</td>
                    <td class="p-3 text-right text-slate-500 uppercase text-[10px]">Voided Sales Total:</td>
                    <td class="p-3 text-right font-mono font-black text-red-600 text-sm">{{ shiftReportData()?.summaries?.cancellationSummary?.salesTotal || '0.000' }} KD</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- SUB-TAB 6: PAYMENT TYPE SUMMARY -->
          <div *ngIf="shiftSubTab() === 'PAYMENTS'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div class="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">6. Payment Type-wise Summary</span>
                <h3 class="text-base font-black text-slate-900">Settlements by Payment Gateway</h3>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Settlements</span>
                  <span class="text-lg font-black text-slate-800 font-mono">{{ shiftReportData()?.summaries?.paymentTypeSummary?.totalCount || 0 }}</span>
                </div>
                <div class="text-right bg-white px-3.5 py-1.5 rounded-lg border border-amber-200 shadow-2xs">
                  <span class="text-[10px] font-bold text-amber-700 uppercase block">Sales Total</span>
                  <span class="text-xl font-black text-amber-600 font-mono">{{ shiftReportData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</span>
                </div>
              </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th class="p-3">Payment Method</th>
                    <th class="p-3 text-center">Transactions</th>
                    <th class="p-3 text-right font-black">Total Sales Settled (KD)</th>
                    <th class="p-3 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let p of shiftReportData()?.summaries?.paymentTypeSummary?.items" class="hover:bg-slate-50">
                    <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" [ngClass]="p.method === 'CASH' ? 'bg-amber-500' : (p.method === 'KNET' ? 'bg-blue-500' : 'bg-emerald-500')"></span>
                      {{ p.method }}
                    </td>
                    <td class="p-3 text-center font-bold text-slate-700">{{ p.count }}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">{{ p.amount }} KD</td>
                    <td class="p-3 text-right font-mono font-bold text-indigo-600">{{ p.percentage }}%</td>
                  </tr>
                  <tr *ngIf="!shiftReportData()?.summaries?.paymentTypeSummary?.items?.length">
                    <td colspan="4" class="p-6 text-center text-slate-400">No payment records found for this shift.</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td class="p-3 text-slate-900">Total Transactions: {{ shiftReportData()?.summaries?.paymentTypeSummary?.totalCount || 0 }}</td>
                    <td colspan="1" class="p-3 text-right text-slate-500 uppercase text-[10px]">Sales Total:</td>
                    <td class="p-3 text-right font-mono font-black text-amber-600 text-sm">{{ shiftReportData()?.summaries?.paymentTypeSummary?.salesTotal || '0.000' }} KD</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

      </div>

      <!-- Individual Page Access Denied State (Shown if user lacks page rights for the specific report) -->
      <ng-template #pageAccessDenied>
        <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-[400px]">
          <div class="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center mb-4 shadow-sm">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m7-7V7a5 5 0 00-10 0v3M5 10h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"></path></svg>
          </div>
          <h2 class="text-xl font-black text-slate-800 tracking-tight mb-1">{{ 'REPORTS.ACCESS_DENIED_TITLE' | translate }}: {{ currentReport().labelKey | translate }}</h2>
          <p class="text-xs text-slate-500 max-w-md mb-4">{{ 'REPORTS.ACCESS_DENIED_DESC' | translate }}</p>
          <div class="p-4 bg-white border border-slate-200 rounded-xl max-w-md text-xs text-slate-600 mb-6 shadow-xs text-start">
            <p class="font-bold text-slate-700 mb-1">Required Page Permission:</p>
            <div class="flex items-center gap-2">
              <code class="px-2 py-0.5 bg-slate-100 rounded font-mono text-indigo-600 font-bold text-xs">{{ currentReport().moduleKey }} (VIEW)</code>
              <span class="text-[11px] text-slate-400">(Your Role: <strong class="text-slate-700">{{ perm.userRole() }}</strong>)</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">{{ 'REPORTS.PAGE_RIGHTS_REQUIRED' | translate }}</p>
          </div>
          <div class="flex items-center gap-3">
            <button *ngIf="accessibleReports().length > 0" (click)="navigateToReport(accessibleReports()[0])" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer">
              Go to {{ accessibleReports()[0].labelKey | translate }}
            </button>
            <a routerLink="/" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition">
              {{ 'NAV.POS' | translate }}
            </a>
          </div>
        </div>
      </ng-template>

    </div>
    </ng-container>

    <ng-template #noReportsAccess>
      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-full">
        <div class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">{{ 'COMMON.ACCESS_DENIED' | translate }}</h2>
        <p class="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {{ 'COMMON.NO_PERMISSION_REPORTS' | translate }}
        </p>
        <a routerLink="/" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition inline-flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          {{ 'NAV.POS' | translate }}
        </a>
      </div>
    </ng-template>
  `
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  private printService = inject(PrintService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  reportPages = REPORT_PAGES;
  activeTab = signal<ReportTab>('MANAGEMENT_DASHBOARD');
  loading = signal(false);
  toastMessage = signal<string | null>(null);

  fromDate = new Date().toISOString().split('T')[0];
  toDate = new Date().toISOString().split('T')[0];

  // Data Signals
  managementData = signal<any>(null);
  dailyData = signal<any[]>([]);
  periodicData = signal<any>(null);
  locationData = signal<any[]>([]);
  itemData = signal<any[]>([]);
  paymentData = signal<any[]>([]);
  aggregatorData = signal<any[]>([]);
  discountData = signal<any>(null);
  cancellationData = signal<any>(null);
  cashierData = signal<any[]>([]);
  customerSalesData = signal<any>(null);
  customerSearchFilter = signal<string>('');
  shiftReportData = signal<any>(null);
  shiftNumberFilter = signal<number>(1);
  shiftSubTab = signal<'COMPLETED_BILLS' | 'CASHIER' | 'BILLS' | 'CARS' | 'HOURLY' | 'CANCELLATIONS' | 'PAYMENTS'>('COMPLETED_BILLS');
  periodicSubTab = signal<'DAYS' | 'CASHIER' | 'BILLS' | 'CARS' | 'HOURLY' | 'CANCELLATIONS' | 'PAYMENTS'>('DAYS');
  shiftBillFilterText = signal<string>('');
  periodicBillFilterText = signal<string>('');

  accessibleReports = computed(() => {
    return this.reportPages.filter(p => this.perm.can(p.moduleKey, 'VIEW'));
  });

  currentReport = computed(() => {
    return this.reportPages.find(p => p.id === this.activeTab()) || this.reportPages[0];
  });

  hasCurrentPageAccess = computed(() => {
    const cur = this.currentReport();
    return this.perm.can(cur.moduleKey, 'VIEW');
  });

  canPrintCurrentReport = computed(() => {
    const cur = this.currentReport();
    return this.perm.can(cur.moduleKey, 'PRINT');
  });

  canExportCurrentReport = computed(() => {
    const cur = this.currentReport();
    return this.perm.can(cur.moduleKey, 'EXPORT');
  });

  hasAnyAccess = computed(() => {
    if (this.perm.isAdmin() || this.perm.can('REPORTS', 'VIEW')) return true;
    return this.accessibleReports().length > 0;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const tabParam = params.get('tab');
      if (tabParam) {
        const found = this.reportPages.find(p => 
          p.slug.toLowerCase() === tabParam.toLowerCase() || 
          p.id.toLowerCase() === tabParam.toLowerCase()
        );
        if (found) {
          this.activeTab.set(found.id);
          if (this.perm.can(found.moduleKey, 'VIEW')) {
            this.loadCurrentTab(true);
          } else {
            this.loading.set(false);
          }
          return;
        }
      }

      // If no valid tab parameter, pick first accessible report page
      const allowed = this.accessibleReports();
      if (allowed.length > 0) {
        this.activeTab.set(allowed[0].id);
        if (tabParam !== allowed[0].slug) {
          this.router.navigate(['/reports', allowed[0].slug], { replaceUrl: true });
        } else {
          this.loadCurrentTab(true);
        }
      } else {
        this.activeTab.set('MANAGEMENT_DASHBOARD');
        this.loading.set(false);
      }
    });
  }

  navigateToReport(report: ReportPageConfig) {
    this.activeTab.set(report.id);
    this.router.navigate(['/reports', report.slug]);
  }

  setTab(tab: ReportTab) {
    const config = this.reportPages.find(p => p.id === tab);
    if (config) {
      this.navigateToReport(config);
    } else {
      this.activeTab.set(tab);
      this.loadCurrentTab();
    }
  }

  onDateChange() {
    if (this.hasCurrentPageAccess()) {
      this.loadCurrentTab(false);
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
    if (this.hasCurrentPageAccess()) {
      this.loadCurrentTab(false);
    }
  }

  loadCurrentTab(fallbackIfEmpty = false) {
    if (!this.hasCurrentPageAccess()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const tab = this.activeTab();

    switch (tab) {
      case 'MANAGEMENT_DASHBOARD':
        this.api.getManagementDashboard().subscribe({
          next: (data) => { this.managementData.set(data); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'DAILY_SUMMARY':
        this.api.getDailySalesSummary(this.fromDate).subscribe({
          next: (data) => { this.dailyData.set(data || []); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'PERIODIC_REPORT':
        this.api.getPeriodicReport({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => {
            if (fallbackIfEmpty && (!data?.days || data.days.length === 0) && this.fromDate !== '2026-01-01') {
              this.fromDate = '2026-01-01';
              this.loadCurrentTab(false);
              return;
            }
            this.periodicData.set(data);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
        break;

      case 'LOCATION_SALES':
        this.api.getLocationSales({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.locationData.set(data || []); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'ITEM_SALES':
        this.api.getItemSales({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.itemData.set(data || []); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'PAYMENT_COLLECTION':
        this.api.getPaymentCollection({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.paymentData.set(data || []); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'AGGREGATOR_SALES':
        this.api.getAggregatorSales({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.aggregatorData.set(data || []); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'DISCOUNT_ANALYSIS':
        this.api.getDiscountAnalysis({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.discountData.set(data); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'CANCELLATION_ANALYSIS':
        this.api.getCancellationAnalysis({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.cancellationData.set(data); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'CASHIER_PERFORMANCE':
        this.api.getCashierPerformance({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.cashierData.set(data || []); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'CUSTOMER_SALES':
        this.api.getCustomerSales({ fromDate: this.fromDate, toDate: this.toDate }).subscribe({
          next: (data) => { this.customerSalesData.set(data); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;

      case 'SHIFT_REPORT':
        this.api.getShiftReport({ date: this.fromDate, shiftNumber: this.shiftNumberFilter() }).subscribe({
          next: (data) => { this.shiftReportData.set(data); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
        break;
    }
  }

  printThermalPeriodic() {
    this.api.printPeriodicReportThermal({
      fromDate: this.fromDate,
      toDate: this.toDate,
      branch: localStorage.getItem('currentBranch') || 'Kiddie Kruzzer',
      location: localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25',
      terminal: 'POS-Terminal-1',
      language: this.translateService.currentLang().toUpperCase() === 'AR' ? 'AR' : 'BOTH'
    }).subscribe({
      next: (res) => {
        this.toastMessage.set('✅ Periodic report sent to thermal printer successfully!');
        setTimeout(() => this.toastMessage.set(null), 4000);
      },
      error: (err) => {
        alert('Thermal print error: ' + (err.error?.error || err.message));
      }
    });
  }

  printStandardPeriodic() {
    const p = this.periodicData();
    if (p) {
      const reportObj = {
        date: `${this.fromDate} to ${this.toDate}`,
        totalRentals: p.grandTotal?.totalRentals || p.totals?.totalRentals || 0,
        totalCarsUsed: p.grandTotal?.totalCarsUsed || p.totals?.totalCarsUsed || 0,
        cashAmount: p.grandTotal?.totalCash || p.totals?.totalCash || 0,
        cardAmount: p.grandTotal?.totalKnet || p.totals?.totalKnet || 0,
        discountAmount: p.grandTotal?.totalDiscount || p.totals?.totalDiscount || 0,
        totalRevenue: p.grandTotal?.totalRevenue || p.totals?.totalRevenue || 0,
        closedBy: 'Auditor',
        notes: `Periodic sales audit: ${this.fromDate} to ${this.toDate}`,
        summaries: p.summaries
      };
      this.printService.printClosingReport(reportObj, false);
    }
  }

  getFilteredShiftBills() {
    const items = this.shiftReportData()?.summaries?.billSummary?.items || [];
    const q = this.shiftBillFilterText().trim().toLowerCase();
    if (!q) return items;
    return items.filter((b: any) => 
      (b.invoiceNo && String(b.invoiceNo).toLowerCase().includes(q)) ||
      (b.carNo && String(b.carNo).toLowerCase().includes(q)) ||
      (b.customerPhone && String(b.customerPhone).toLowerCase().includes(q)) ||
      (b.customerName && String(b.customerName).toLowerCase().includes(q)) ||
      (b.cashier && String(b.cashier).toLowerCase().includes(q))
    );
  }

  getFilteredPeriodicBills() {
    const items = this.periodicData()?.summaries?.billSummary?.items || [];
    const q = this.periodicBillFilterText().trim().toLowerCase();
    if (!q) return items;
    return items.filter((b: any) => 
      (b.invoiceNo && String(b.invoiceNo).toLowerCase().includes(q)) ||
      (b.carNo && String(b.carNo).toLowerCase().includes(q)) ||
      (b.customerPhone && String(b.customerPhone).toLowerCase().includes(q)) ||
      (b.customerName && String(b.customerName).toLowerCase().includes(q)) ||
      (b.cashier && String(b.cashier).toLowerCase().includes(q))
    );
  }

  getFilteredCustomerSales() {
    const items = this.customerSalesData()?.items || [];
    const q = this.customerSearchFilter().trim().toLowerCase();
    if (!q) return items;
    return items.filter((c: any) =>
      (c.customer_phone && String(c.customer_phone).toLowerCase().includes(q)) ||
      (c.customer_name && String(c.customer_name).toLowerCase().includes(q))
    );
  }

  onShiftFilterChange(shiftNum: number) {
    this.shiftNumberFilter.set(shiftNum);
    this.loadCurrentTab();
  }

  printStandardShiftReport() {
    const s = this.shiftReportData();
    if (s) {
      this.printService.printShiftReport(s, false);
    }
  }

  printThermalShiftReport() {
    const s = this.shiftReportData();
    if (s && s.id) {
      this.api.printShiftReportThermal(s.id, '80mm').subscribe({
        next: () => {
          this.toastMessage.set('✅ Shift report sent to thermal printer!');
          setTimeout(() => this.toastMessage.set(null), 4000);
        },
        error: (err) => {
          this.printService.printShiftReport(s, true, '80mm');
        }
      });
    } else if (s) {
      this.printService.printShiftReport(s, true, '80mm');
    }
  }

  printThermalCurrentReport() {
    if (!this.canPrintCurrentReport()) {
      alert('You do not have permission to print this report page.');
      return;
    }
    if (this.activeTab() === 'PERIODIC_REPORT') {
      this.printThermalPeriodic();
    } else if (this.activeTab() === 'SHIFT_REPORT') {
      this.printThermalShiftReport();
    } else {
      // Print closing style thermal report for current range
      this.printThermalPeriodic();
    }
  }

  exportCurrentReport() {
    if (!this.canExportCurrentReport()) {
      alert('You do not have permission to export this report page.');
      return;
    }
    const tab = this.activeTab();
    let exportData: any[] = [];
    let filename = `report-${tab.toLowerCase()}-${this.fromDate}`;

    if (tab === 'DAILY_SUMMARY') exportData = this.dailyData();
    else if (tab === 'LOCATION_SALES') exportData = this.locationData();
    else if (tab === 'ITEM_SALES') exportData = this.itemData();
    else if (tab === 'PAYMENT_COLLECTION') exportData = this.paymentData();
    else if (tab === 'AGGREGATOR_SALES') exportData = this.aggregatorData();
    else if (tab === 'CASHIER_PERFORMANCE') exportData = this.cashierData();
    else if (tab === 'CUSTOMER_SALES') exportData = this.getFilteredCustomerSales();
    else if (tab === 'PERIODIC_REPORT') exportData = this.periodicData()?.days || [];

    if (!exportData || exportData.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
