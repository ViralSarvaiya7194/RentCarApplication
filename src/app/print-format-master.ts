import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { ExportDropdownComponent } from './export-dropdown.component';
import { PermissionService } from './permission.service';

export interface PrintFormatItem {
  id: string;
  format_name?: string;
  formatName?: string;
  branch_id?: string;
  branchId?: string;
  branch_name?: string;
  branchName?: string;
  location_id?: string;
  locationId?: string;
  location_name?: string;
  locationName?: string;
  terminal?: string;
  printer_id?: string;
  printerId?: string;
  printer_name?: string;
  printerName?: string;
  print_type?: string;
  printType?: string;
  language?: 'EN' | 'AR' | 'BOTH';
  paper_width?: '80mm' | '58mm';
  paperWidth?: '80mm' | '58mm';
  font_size?: string;
  fontSize?: string;
  font_family?: string;
  fontFamily?: string;
  font_style?: string;
  fontStyle?: string;
  header_title?: string;
  headerTitle?: string;
  header_subtitle?: string;
  headerSubtitle?: string;
  show_logo?: boolean;
  showLogo?: boolean;
  show_company_header?: boolean;
  showCompanyHeader?: boolean;
  show_branch_info?: boolean;
  showBranchInfo?: boolean;
  show_customer_info?: boolean;
  showCustomerInfo?: boolean;
  show_car_details?: boolean;
  showCarDetails?: boolean;
  show_pricing_breakdown?: boolean;
  showPricingBreakdown?: boolean;
  show_payment_method?: boolean;
  showPaymentMethod?: boolean;
  show_cashier?: boolean;
  showCashier?: boolean;
  show_barcode?: boolean;
  showBarcode?: boolean;
  footer_notes?: string;
  footerNotes?: string;
  terms_conditions?: string;
  termsConditions?: string;
  is_default?: boolean;
  isDefault?: boolean;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-print-format-master',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExportDropdownComponent],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6 w-full min-h-0">
      
      <!-- Action Notification Banner -->
      <div *ngIf="toastMsg()" class="p-4 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-150"
           [ngClass]="toastType() === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'">
        <div class="flex items-center gap-2">
          <span>{{ toastType() === 'success' ? '✓' : '⚠️' }}</span>
          <span>{{ toastMsg() }}</span>
        </div>
        <button (click)="toastMsg.set(null)" class="text-slate-400 hover:text-slate-700 text-base font-bold cursor-pointer">&times;</button>
      </div>

      <!-- ==================================================================== -->
      <!-- VIEW 1: PRINT FORMAT MASTER LIST (Visible when NOT creating/editing)  -->
      <!-- ==================================================================== -->
      <ng-container *ngIf="!isFormOpen()">
        <!-- Top Header & Action Controls -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-2xl font-bold text-slate-800">{{ 'FORMAT.TITLE' | translate }}</h2>
              <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
              </span>
            </div>
            <p class="text-slate-500 text-sm mt-1">{{ 'FORMAT.SUBTITLE' | translate }}</p>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <!-- Universal Master Export Dropdown -->
            <app-export-dropdown 
              [masterKey]="'print-formats'" 
              [title]="'FORMAT.TITLE' | translate" 
              [items]="filteredItems()" 
              [filename]="'Print_Formats_Master'">
            </app-export-dropdown>
            
            <!-- Refresh Button -->
            <button (click)="load()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition" [title]="'COMMON.REFRESH' | translate">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            
            <!-- Add Print Format Button -->
            <button *ngIf="perm.can('PRINT_FORMAT_MASTER', 'ADD')" (click)="openForm()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer text-xs transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>{{ 'FORMAT.ADD_TITLE' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Quick Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Formats</p>
              <p class="text-xl font-black text-slate-800 mt-1">{{ items().length }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base">🖨️</div>
          </div>

          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Formats</p>
              <p class="text-xl font-black text-emerald-600 mt-1">{{ activeCount() }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">✓</div>
          </div>

          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Default Assigned</p>
              <p class="text-xl font-black text-purple-600 mt-1">{{ defaultCount() }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base">★</div>
          </div>

          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Roll Standard</p>
              <p class="text-xs font-bold text-slate-700 mt-1">80mm POS & 58mm</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">📄</div>
          </div>
        </div>

        <!-- Filters Toolbar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div class="relative w-full md:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              [placeholder]="'COMMON.SEARCH' | translate" 
              class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition">
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <!-- Print Type Filter -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-500">{{ 'PRINTER.PRINT_TYPE' | translate }}:</label>
              <select [(ngModel)]="printTypeFilter" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white">
                <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
                <option value="SETTLEMENT">SETTLEMENT</option>
                <option value="RECEIPT">RECEIPT</option>
                <option value="DUPLICATE">DUPLICATE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <!-- Language Filter -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-500">{{ 'FORMAT.LANGUAGE' | translate }}:</label>
              <select [(ngModel)]="languageFilter" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white">
                <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
                <option value="BOTH">Bilingual (EN + AR)</option>
                <option value="AR">Arabic (RTL)</option>
                <option value="EN">English (LTR)</option>
              </select>
            </div>

            <!-- Status Filter -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-500">{{ 'COMMON.STATUS' | translate }}:</label>
              <select [(ngModel)]="statusFilter" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white">
                <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
                <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
                <option value="INACTIVE">{{ 'COMMON.INACTIVE' | translate }}</option>
              </select>
            </div>

            <!-- Total Count Badge -->
            <span class="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              {{ filteredItems().length }} {{ 'COMMON.ALL' | translate }}
            </span>
          </div>
        </div>

        <!-- Master Data Table -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">{{ 'FORMAT.NAME' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PRINTER.PRINT_TYPE' | translate }}</th>
                  <th class="px-4 py-3">{{ 'FORMAT.LANGUAGE' | translate }}</th>
                  <th class="px-4 py-3">{{ 'NAV.BRANCH' | translate }} / {{ 'PRINTER.TERMINAL' | translate }}</th>
                  <th class="px-4 py-3">{{ 'PRINTER.PAPER_WIDTH' | translate }}</th>
                  <th class="px-4 py-3">{{ 'FORMAT.FONT_SIZE' | translate }} & Typography</th>
                  <th class="px-4 py-3">Default</th>
                  <th class="px-4 py-3">{{ 'COMMON.STATUS' | translate }}</th>
                  <th class="px-4 py-3 text-right">{{ 'COMMON.ACTIONS' | translate }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let item of filteredItems()" class="hover:bg-slate-50 transition">
                  <td class="px-4 py-3 font-mono font-bold text-slate-800">{{ item.id }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900">{{ item.format_name || item.formatName }}</div>
                    <div class="text-[10px] text-slate-400 truncate max-w-xs">{{ item.header_title || item.headerTitle }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                          [ngClass]="(item.print_type || item.printType) === 'SETTLEMENT' ? 'bg-amber-100 text-amber-800' : ((item.print_type || item.printType) === 'RECEIPT' ? 'bg-blue-100 text-blue-800' : ((item.print_type || item.printType) === 'DUPLICATE' ? 'bg-purple-100 text-purple-800' : ((item.print_type || item.printType) === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700')))">
                      {{ item.print_type || item.printType || 'ALL' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="(item.language) === 'BOTH' ? 'bg-purple-100 text-purple-800' : ((item.language) === 'AR' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')">
                      {{ item.language === 'BOTH' ? 'Bilingual (EN+AR)' : (item.language === 'AR' ? 'Arabic (RTL)' : 'English (LTR)') }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-slate-700 font-semibold">{{ item.branch_name || item.branchName || 'All Branches' }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ item.terminal || 'ALL' }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono text-slate-500 font-bold">{{ item.paper_width || item.paperWidth || '80mm' }}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-1">
                      <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase w-fit"
                            [ngClass]="(item.font_size || item.fontSize) === 'XLARGE' ? 'bg-purple-100 text-purple-800' : ((item.font_size || item.fontSize) === 'MEDIUM' ? 'bg-blue-100 text-blue-800' : ((item.font_size || item.fontSize) === 'SMALL' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'))">
                        {{ (item.font_size || item.fontSize || 'LARGE') }}
                      </span>
                      <span class="text-[9px] font-mono text-slate-500">
                        {{ item.font_family || item.fontFamily || 'MONOSPACE' }} • {{ item.font_style || item.fontStyle || 'BOLD' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <button *ngIf="item.is_default || item.isDefault" class="px-2.5 py-0.5 bg-indigo-600 text-white font-bold rounded-full text-[9px] flex items-center gap-1 shadow-sm">
                      ★ {{ 'FORMAT.IS_DEFAULT' | translate }}
                    </button>
                    <button *ngIf="!(item.is_default || item.isDefault)" (click)="setDefault(item)" class="text-slate-400 hover:text-indigo-600 hover:underline text-[10px] cursor-pointer">
                      {{ 'FORMAT.SET_DEFAULT' | translate }}
                    </button>
                  </td>
                  <td class="px-4 py-3">
                    <button (click)="toggleStatus(item)" class="cursor-pointer">
                      <span *ngIf="item.is_active || item.isActive" class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[9px]">
                        {{ 'COMMON.ACTIVE' | translate }}
                      </span>
                      <span *ngIf="!(item.is_active || item.isActive)" class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold text-[9px]">
                        {{ 'COMMON.INACTIVE' | translate }}
                      </span>
                    </button>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button *ngIf="perm.can('PRINT_FORMAT_MASTER', 'EDIT')" (click)="edit(item)" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer transition" [title]="'COMMON.EDIT' | translate">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <button *ngIf="perm.can('PRINT_FORMAT_MASTER', 'DELETE')" (click)="deleteItem(item.id)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition" [title]="'COMMON.DELETE' | translate">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="filteredItems().length === 0">
                  <td colspan="10" class="px-6 py-12 text-center text-slate-400">
                    {{ 'COMMON.NO_RECORDS' | translate }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- ==================================================================== -->
      <!-- VIEW 2: DEDICATED FULL-PAGE ADD / EDIT PRINT FORMAT VIEW             -->
      <!-- ==================================================================== -->
      <ng-container *ngIf="isFormOpen()">
        
        <!-- Breadcrumb / Back Navigation Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <button (click)="closeForm()" class="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold">
              <svg class="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              <span>Back to Formats List</span>
            </button>
            <div class="h-5 w-px bg-slate-200"></div>
            <div>
              <h2 class="text-xl font-bold text-slate-900">
                {{ editingId() ? ('FORMAT.EDIT_TITLE' | translate) : ('FORMAT.ADD_TITLE' | translate) }}
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ editingId() ? 'Update configuration, font styles, and header parameters.' : 'Configure a new direct thermal print layout with live slip preview.' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button (click)="closeForm()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="save()" [disabled]="saving()" class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition">
              <span *ngIf="saving()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <svg *ngIf="!saving()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span>{{ 'COMMON.SAVE_TO_POSTGRES' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Main Form & Live Preview Layout Grid (12 cols) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- Left Column: Structured Form Cards (7 cols) -->
          <div class="lg:col-span-7 flex flex-col gap-5">
            
            <!-- Card 1: Basic Identity & Format Profile -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span class="p-1 bg-indigo-50 text-indigo-600 rounded">📋</span>
                  <span>1. Format Identity & Target Binding</span>
                </h3>
                <span class="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{{ formData.id }}</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2 flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'FORMAT.NAME' | translate }} *</label>
                  <input type="text" [(ngModel)]="formData.formatName" required placeholder="e.g. Standard 80mm Bilingual Receipt" class="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'PRINTER.PRINT_TYPE' | translate }}</label>
                  <select [(ngModel)]="formData.printType" class="border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white font-bold text-indigo-700">
                    <option value="ALL">ALL (Universal)</option>
                    <option value="SETTLEMENT">SETTLEMENT (Close Bill)</option>
                    <option value="RECEIPT">RECEIPT (Start Rental)</option>
                    <option value="DUPLICATE">DUPLICATE (Reprint)</option>
                    <option value="CANCELLED">CANCELLED (Void Bill)</option>
                  </select>
                </div>
              </div>

              <!-- Hardware Target Binding Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'NAV.BRANCH' | translate }}</label>
                  <select [(ngModel)]="formData.branchName" class="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white">
                    <option value="All Branches">{{ 'COMMON.ALL' | translate }}</option>
                    <option *ngFor="let b of branches()" [value]="b.name">{{ b.name }}</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.TERMINAL' | translate }}</label>
                  <input type="text" [(ngModel)]="formData.terminal" placeholder="ALL, POS-1" class="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white font-mono">
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-500 uppercase">Target Printer</label>
                  <select [(ngModel)]="formData.printerId" class="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white font-mono">
                    <option value="ALL">ALL (Dynamic Resolution)</option>
                    <option *ngFor="let p of printers()" [value]="p.id">{{ p.printer_name || p.printerName }} ({{ p.id }})</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Card 2: Typography, Font Style & Paper Dimensions -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span class="p-1 bg-emerald-50 text-emerald-600 rounded">🔤</span>
                  <span>2. Typography & Direct Thermal Font Customization</span>
                </h3>
                <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">High Clarity</span>
              </div>

              <!-- Typography Grid: 4 Selectors -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/40 p-3.5 rounded-lg border border-emerald-200">
                <!-- Font Family Selector -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>{{ 'FORMAT.FONT_FAMILY' | translate }} (Font Type)</span>
                    <span class="text-[8px] text-emerald-700 font-bold">Direct Thermal</span>
                  </label>
                  <select [(ngModel)]="formData.fontFamily" class="border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500">
                    <option value="MONOSPACE">Monospace / Courier (Standard POS)</option>
                    <option value="SANS_SERIF">Sans-Serif / Clean (Modern Bold)</option>
                    <option value="CONSOLAS">Consolas / High Density</option>
                    <option value="ROBOTO">Roboto / Crisp Clean</option>
                  </select>
                </div>

                <!-- Font Style / Weight Selector -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>{{ 'FORMAT.FONT_STYLE' | translate }} (Weight)</span>
                    <span class="text-[8px] text-emerald-700 font-bold">Contrast</span>
                  </label>
                  <select [(ngModel)]="formData.fontStyle" class="border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500">
                    <option value="BOLD">Bold (High Contrast - Recommended)</option>
                    <option value="BLACK">Black / Extra Bold (Deep Ink Density)</option>
                    <option value="NORMAL">Regular / Normal</option>
                  </select>
                </div>

                <!-- Font Size Selector -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>{{ 'FORMAT.FONT_SIZE' | translate }}</span>
                    <span class="text-[8px] text-emerald-700 font-bold">Thermal Head</span>
                  </label>
                  <select [(ngModel)]="formData.fontSize" class="border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500">
                    <option value="LARGE">Large (Recommended - High Visibility)</option>
                    <option value="XLARGE">Extra Large (Maximum Size)</option>
                    <option value="MEDIUM">Medium / Standard</option>
                    <option value="SMALL">Small / Compact</option>
                  </select>
                </div>

                <!-- Paper Width Selector -->
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>{{ 'PRINTER.PAPER_WIDTH' | translate }}</span>
                    <span class="text-[8px] text-slate-500 font-bold">Roll</span>
                  </label>
                  <select [(ngModel)]="formData.paperWidth" class="border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500">
                    <option value="80mm">80mm (Standard POS Roll)</option>
                    <option value="58mm">58mm (Compact Mobile Roll)</option>
                  </select>
                </div>
              </div>

              <!-- Language Selection -->
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'FORMAT.LANGUAGE' | translate }}</label>
                <select [(ngModel)]="formData.language" class="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-bold text-indigo-700">
                  <option value="BOTH">Bilingual (English + Arabic / ثنائي اللغة)</option>
                  <option value="AR">Arabic Only (RTL / عربي فقط)</option>
                  <option value="EN">English Only (LTR / إنجليزي فقط)</option>
                </select>
              </div>
            </div>

            <!-- Card 3: Headers & Field Visibility Toggles -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span class="p-1 bg-purple-50 text-purple-600 rounded">🏷️</span>
                  <span>3. Headers & Field Visibility</span>
                </h3>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'FORMAT.HEADER_TITLE' | translate }}</label>
                  <input type="text" [(ngModel)]="formData.headerTitle" class="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-bold">
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'FORMAT.HEADER_SUBTITLE' | translate }}</label>
                  <input type="text" [(ngModel)]="formData.headerSubtitle" class="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white">
                </div>
              </div>

              <!-- Field Toggles Checkbox Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showLogo" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_LOGO' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showCompanyHeader" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_COMPANY' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showBranchInfo" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_BRANCH' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showCustomerInfo" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_CUSTOMER' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showCarDetails" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_CAR' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showPricingBreakdown" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_PRICING' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showPaymentMethod" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_PAYMENT' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showCashier" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_CASHIER' | translate }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-indigo-600">
                  <input type="checkbox" [(ngModel)]="formData.showBarcode" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.SHOW_BARCODE' | translate }}</span>
                </label>
              </div>
            </div>

            <!-- Card 4: Footer Notes, Terms & Status -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span class="p-1 bg-amber-50 text-amber-600 rounded">📝</span>
                  <span>4. Footer Notes, Terms & Activation</span>
                </h3>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'FORMAT.FOOTER_NOTES' | translate }}</label>
                  <textarea rows="2" [(ngModel)]="formData.footerNotes" class="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"></textarea>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-slate-600 uppercase">{{ 'FORMAT.TERMS' | translate }}</label>
                  <textarea rows="2" [(ngModel)]="formData.termsConditions" class="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"></textarea>
                </div>
              </div>

              <div class="flex items-center gap-6 pt-3 border-t border-slate-100">
                <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input type="checkbox" [(ngModel)]="formData.isDefault" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'FORMAT.IS_DEFAULT' | translate }}</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input type="checkbox" [(ngModel)]="formData.isActive" class="rounded text-indigo-600 w-4 h-4">
                  <span>{{ 'COMMON.ACTIVE' | translate }}</span>
                </label>
              </div>
            </div>

            <!-- Bottom Action Controls -->
            <div class="flex items-center justify-end gap-3 py-2">
              <button (click)="closeForm()" class="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg cursor-pointer transition">
                {{ 'COMMON.CANCEL' | translate }}
              </button>
              <button (click)="save()" [disabled]="saving()" class="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition">
                <span *ngIf="saving()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ 'COMMON.SAVE_TO_POSTGRES' | translate }}</span>
              </button>
            </div>

          </div>

          <!-- Right Column: Live Interactive Thermal Slip Preview (5 cols) -->
          <div class="lg:col-span-5 bg-slate-200/70 p-6 rounded-2xl border border-slate-300 flex flex-col items-center justify-start sticky top-4">
            <div class="w-full flex items-center justify-between mb-3 text-xs font-bold text-slate-700 uppercase">
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                <span>{{ 'FORMAT.PREVIEW' | translate }}</span>
              </span>
              <span class="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-mono">
                {{ formData.paperWidth }} • {{ formData.fontSize || 'LARGE' }} • {{ formData.fontFamily || 'MONOSPACE' }}
              </span>
            </div>

            <!-- Virtual Thermal Paper Slip with Scaled Typography & Selected Font -->
            <div class="w-full max-w-[320px] bg-white shadow-2xl rounded-lg p-5 text-slate-800 border-t-4 border-indigo-600 flex flex-col gap-2 relative transition-all"
                 [ngClass]="[
                   formData.language === 'AR' ? 'text-right' : (formData.language === 'EN' ? 'text-left' : 'text-center'),
                   formData.fontSize === 'XLARGE' ? 'text-[12px]' : (formData.fontSize === 'LARGE' ? 'text-[11px]' : (formData.fontSize === 'MEDIUM' ? 'text-[10px]' : 'text-[9px]')),
                   formData.fontFamily === 'SANS_SERIF' ? 'font-sans' : (formData.fontFamily === 'ROBOTO' ? 'font-sans tracking-tight' : 'font-mono'),
                   formData.fontStyle === 'BLACK' ? 'font-black' : (formData.fontStyle === 'NORMAL' ? 'font-medium' : 'font-bold')
                 ]">
              
              <!-- Header -->
              <div *ngIf="formData.showLogo" class="text-center text-slate-900 border-b border-slate-200 pb-1"
                   [ngClass]="formData.fontSize === 'XLARGE' ? 'text-sm font-black' : (formData.fontSize === 'LARGE' ? 'text-xs font-bold' : 'text-[11px] font-bold')">
                <div>{{ formData.headerTitle || 'KIDDIE KRUZZER ENTERTAINMENT' }}</div>
                <div class="text-slate-700 font-semibold text-[10px] font-arabic" dir="rtl">كيدي كروزر للتأجير والترفيه</div>
              </div>
              <div *ngIf="formData.showCompanyHeader" class="text-center text-slate-500"
                   [ngClass]="formData.fontSize === 'XLARGE' ? 'text-[11px] font-bold' : 'text-[9px]'">
                {{ formData.headerSubtitle || 'Car Rental Tax Invoice / فاتورة ضريبية' }}
              </div>
              <div *ngIf="formData.showBranchInfo" class="text-center text-slate-500 font-medium border-b border-dashed border-slate-200 pb-1"
                   [ngClass]="formData.fontSize === 'XLARGE' ? 'text-[11px]' : 'text-[9px]'">
                {{ formData.branchName || 'Avenues Mall' }} - Main Counter / مجمع الأفنيوز
              </div>

              <!-- Banner -->
              <div class="text-center font-bold bg-slate-900 text-white py-1.5 rounded my-1 flex flex-col gap-0.5"
                   [ngClass]="formData.fontSize === 'XLARGE' ? 'text-[12px]' : (formData.fontSize === 'LARGE' ? 'text-[11px]' : 'text-[10px]')">
                <div>*** {{ formData.printType || 'SETTLEMENT RECEIPT' }} ***</div>
                <div class="text-[9px] font-arabic" dir="rtl">*** إيصال تسوية نهائية وتصفية حساب ***</div>
              </div>

              <!-- Metadata -->
              <div class="flex flex-col gap-1 border-b border-dashed border-slate-200 pb-1">
                <div class="flex justify-between">
                  <span class="text-slate-500 font-semibold">Invoice No / رقم الفاتورة:</span>
                  <span class="font-bold text-slate-900" [ngClass]="formData.fontSize === 'XLARGE' ? 'text-xs font-black' : ''">INV-953335</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Date & Time / التاريخ:</span>
                  <span>{{ previewDate }}</span>
                </div>
                <div *ngIf="formData.showCustomerInfo" class="flex justify-between">
                  <span class="text-slate-500">Customer / العميل:</span>
                  <span>Ahmed Al-Sabah</span>
                </div>
                <div *ngIf="formData.showCarDetails" class="flex justify-between">
                  <span class="text-slate-500">Vehicle / السيارة:</span>
                  <span class="font-bold">KD-01 (Single)</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Duration / المدة:</span>
                  <span>30 Mins / دقيقة</span>
                </div>
              </div>

              <!-- Pricing -->
              <div *ngIf="formData.showPricingBreakdown" class="flex flex-col gap-1 border-b border-dashed border-slate-200 pb-1">
                <div class="flex justify-between">
                  <span class="text-slate-600">Deposit / المدفوع:</span>
                  <span>3.000 KWD</span>
                </div>
                <div class="flex justify-between text-amber-700">
                  <span>Extra Fee / إضافي:</span>
                  <span>+1.500 KWD</span>
                </div>
                <div class="flex justify-between text-emerald-700">
                  <span>Discount / خصم:</span>
                  <span>-0.500 KWD</span>
                </div>
                <div class="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1"
                     [ngClass]="formData.fontSize === 'XLARGE' ? 'text-xs font-black' : (formData.fontSize === 'LARGE' ? 'text-[11px] font-bold' : 'text-[10px]')">
                  <span>TOTAL / الإجمالي:</span>
                  <span>4.000 KWD</span>
                </div>
                <div class="flex justify-between font-bold text-emerald-800"
                     [ngClass]="formData.fontSize === 'XLARGE' ? 'text-xs font-black' : (formData.fontSize === 'LARGE' ? 'text-[11px] font-bold' : 'text-[10px]')">
                  <span>CHANGE / المتبقي:</span>
                  <span>1.000 KWD</span>
                </div>
              </div>

              <!-- Payment & Cashier -->
              <div class="flex flex-col gap-1 border-b border-dashed border-slate-200 pb-1">
                <div *ngIf="formData.showPaymentMethod" class="flex justify-between">
                  <span class="text-slate-500">Payment / الدفع:</span>
                  <span class="font-bold">CASH / نقداً</span>
                </div>
                <div *ngIf="formData.showCashier" class="flex justify-between">
                  <span class="text-slate-500">Cashier / الكاشير:</span>
                  <span>Sarah ({{ formData.terminal || 'POS-1' }})</span>
                </div>
              </div>

              <!-- Barcode -->
              <div *ngIf="formData.showBarcode" class="text-center py-1">
                <div class="h-6 bg-slate-800 w-3/4 mx-auto flex items-center justify-center text-white text-[8px] font-mono tracking-widest">
                  ||||| | |||| |||
                </div>
                <span class="text-[8px] text-slate-400 font-mono">* INV-953335 *</span>
              </div>

              <!-- Footers -->
              <div class="text-center mt-1 flex flex-col gap-0.5 border-t border-slate-200 pt-1"
                   [ngClass]="formData.fontSize === 'XLARGE' ? 'text-[10px]' : 'text-[8px]'">
                <span class="font-bold text-slate-700">{{ formData.footerNotes || 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر' }}</span>
                <span class="text-slate-400">{{ formData.termsConditions || 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد 5 دقائق' }}</span>
              </div>

            </div>
          </div>

        </div>
      </ng-container>

    </div>
  `
})
export class PrintFormatMasterComponent implements OnInit {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);

  items = signal<PrintFormatItem[]>([]);
  branches = signal<any[]>([]);
  printers = signal<any[]>([]);

  isFormOpen = signal<boolean>(false);
  editingId = signal<string | null>(null);
  saving = signal<boolean>(false);

  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');
  printTypeFilter = signal<string>('ALL');
  languageFilter = signal<string>('ALL');

  toastMsg = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');
  previewDate = new Date().toLocaleTimeString();

  formData: any = {
    id: '',
    formatName: '',
    branchName: 'All Branches',
    terminal: 'ALL',
    printerId: 'ALL',
    printType: 'SETTLEMENT',
    language: 'BOTH',
    paperWidth: '80mm',
    fontSize: 'LARGE',
    fontFamily: 'MONOSPACE',
    fontStyle: 'BOLD',
    headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
    headerSubtitle: 'Car Rental Tax Invoice / فاتورة ضريبية',
    showLogo: true,
    showCompanyHeader: true,
    showBranchInfo: true,
    showCustomerInfo: true,
    showCarDetails: true,
    showPricingBreakdown: true,
    showPaymentMethod: true,
    showCashier: true,
    showBarcode: true,
    footerNotes: 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
    termsConditions: 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
    isDefault: false,
    isActive: true,
  };

  activeCount = computed(() => {
    return this.items().filter(i => (i.is_active !== undefined ? i.is_active : i.isActive) !== false).length;
  });

  defaultCount = computed(() => {
    return this.items().filter(i => (i.is_default !== undefined ? i.is_default : i.isDefault) === true).length;
  });

  filteredItems = computed(() => {
    let list = this.items();
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const pt = this.printTypeFilter();
    const lf = this.languageFilter();

    if (st !== 'ALL') {
      list = list.filter(i => {
        const active = i.is_active !== undefined ? i.is_active : i.isActive;
        return st === 'ACTIVE' ? active : !active;
      });
    }

    if (pt !== 'ALL') {
      list = list.filter(i => (i.print_type || i.printType) === pt || (i.print_type || i.printType) === 'ALL');
    }

    if (lf !== 'ALL') {
      list = list.filter(i => i.language === lf || i.language === 'BOTH');
    }

    if (q) {
      list = list.filter(i => {
        const name = (i.format_name || i.formatName || '').toLowerCase();
        const id = (i.id || '').toLowerCase();
        const header = (i.header_title || i.headerTitle || '').toLowerCase();
        return name.includes(q) || id.includes(q) || header.includes(q);
      });
    }

    return list;
  });

  ngOnInit() {
    this.load();
    this.api.getBranches().subscribe({ next: b => this.branches.set(b || []) });
    this.api.getPrinters().subscribe({ next: p => this.printers.set(p || []) });
  }

  load() {
    this.api.getPrintFormats().subscribe({
      next: (data) => this.items.set(data || []),
      error: (err) => console.error('Error loading print formats:', err)
    });
  }

  openForm() {
    this.editingId.set(null);
    this.formData = {
      id: `FMT-${Math.floor(100 + Math.random() * 900)}`,
      formatName: '',
      branchName: 'All Branches',
      terminal: 'ALL',
      printerId: 'ALL',
      printType: 'SETTLEMENT',
      language: 'BOTH',
      paperWidth: '80mm',
      fontSize: 'LARGE',
      fontFamily: 'MONOSPACE',
      fontStyle: 'BOLD',
      headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
      headerSubtitle: 'Car Rental Tax Invoice / فاتورة ضريبية',
      showLogo: true,
      showCompanyHeader: true,
      showBranchInfo: true,
      showCustomerInfo: true,
      showCarDetails: true,
      showPricingBreakdown: true,
      showPaymentMethod: true,
      showCashier: true,
      showBarcode: true,
      footerNotes: 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
      termsConditions: 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
      isDefault: false,
      isActive: true,
    };
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.editingId.set(null);
  }

  edit(item: PrintFormatItem) {
    this.editingId.set(item.id);
    this.formData = {
      id: item.id,
      formatName: item.format_name || item.formatName || '',
      branchName: item.branch_name || item.branchName || 'All Branches',
      terminal: item.terminal || 'ALL',
      printerId: item.printer_id || item.printerId || 'ALL',
      printType: item.print_type || item.printType || 'SETTLEMENT',
      language: item.language || 'BOTH',
      paperWidth: item.paper_width || item.paperWidth || '80mm',
      fontSize: item.font_size || item.fontSize || 'LARGE',
      fontFamily: item.font_family || item.fontFamily || 'MONOSPACE',
      fontStyle: item.font_style || item.fontStyle || 'BOLD',
      headerTitle: item.header_title || item.headerTitle || 'KIDDIE KRUZZER ENTERTAINMENT',
      headerSubtitle: item.header_subtitle || item.headerSubtitle || '',
      showLogo: item.show_logo !== undefined ? item.show_logo : (item.showLogo !== false),
      showCompanyHeader: item.show_company_header !== undefined ? item.show_company_header : (item.showCompanyHeader !== false),
      showBranchInfo: item.show_branch_info !== undefined ? item.show_branch_info : (item.showBranchInfo !== false),
      showCustomerInfo: item.show_customer_info !== undefined ? item.show_customer_info : (item.showCustomerInfo !== false),
      showCarDetails: item.show_car_details !== undefined ? item.show_car_details : (item.showCarDetails !== false),
      showPricingBreakdown: item.show_pricing_breakdown !== undefined ? item.show_pricing_breakdown : (item.showPricingBreakdown !== false),
      showPaymentMethod: item.show_payment_method !== undefined ? item.show_payment_method : (item.showPaymentMethod !== false),
      showCashier: item.show_cashier !== undefined ? item.show_cashier : (item.showCashier !== false),
      showBarcode: item.show_barcode !== undefined ? item.show_barcode : (item.showBarcode !== false),
      footerNotes: item.footer_notes || item.footerNotes || 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
      termsConditions: item.terms_conditions || item.termsConditions || '',
      isDefault: item.is_default !== undefined ? item.is_default : (item.isDefault === true),
      isActive: item.is_active !== undefined ? item.is_active : (item.isActive !== false),
    };
    this.isFormOpen.set(true);
  }

  save() {
    if (!this.formData.formatName || !this.formData.formatName.trim()) {
      alert('Please enter a Format Name.');
      return;
    }

    this.saving.set(true);
    if (this.editingId()) {
      this.api.updatePrintFormat(this.editingId()!, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeForm();
          this.load();
          this.showToast('success', `Print format "${this.formData.formatName}" updated successfully.`);
        },
        error: (err) => {
          this.saving.set(false);
          alert('Error updating format: ' + (err.error?.error || err.message));
        }
      });
    } else {
      this.api.createPrintFormat(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeForm();
          this.load();
          this.showToast('success', `Print format "${this.formData.formatName}" created successfully.`);
        },
        error: (err) => {
          this.saving.set(false);
          alert('Error creating format: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  deleteItem(id: string) {
    if (confirm('Are you sure you want to delete this print format?')) {
      this.api.deletePrintFormat(id).subscribe({
        next: () => {
          this.load();
          this.showToast('success', `Print format deleted.`);
        },
        error: (err) => alert('Error deleting format: ' + (err.error?.error || err.message))
      });
    }
  }

  setDefault(item: PrintFormatItem) {
    this.api.setDefaultPrintFormat(item.id).subscribe({
      next: () => {
        this.load();
        this.showToast('success', `Format "${item.format_name || item.formatName}" set as default for ${item.print_type || item.printType}.`);
      },
      error: (err) => alert('Error setting default: ' + (err.error?.error || err.message))
    });
  }

  toggleStatus(item: PrintFormatItem) {
    this.api.togglePrintFormatStatus(item.id).subscribe({
      next: () => {
        this.load();
        this.showToast('success', `Format status updated.`);
      },
      error: (err) => alert('Error updating status: ' + (err.error?.error || err.message))
    });
  }

  showToast(type: 'success' | 'error', msg: string) {
    this.toastType.set(type);
    this.toastMsg.set(msg);
    setTimeout(() => {
      if (this.toastMsg() === msg) this.toastMsg.set(null);
    }, 4500);
  }
}
