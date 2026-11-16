import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { ExportDropdownComponent } from './export-dropdown.component';

export interface PrinterItem {
  id: string;
  printer_name?: string;
  printerName?: string;
  interface_type?: string;
  interfaceType?: string;
  ip_address?: string;
  ipAddress?: string;
  port?: number;
  branch_id?: string;
  branchId?: string;
  branch_name?: string;
  branchName?: string;
  location_id?: string;
  locationId?: string;
  location_name?: string;
  locationName?: string;
  terminal?: string;
  printer_type?: string;
  printerType?: string;
  print_type?: string;
  printType?: string;
  paper_width?: string;
  paperWidth?: string;
  encoding?: string;
  auto_cut?: boolean;
  autoCut?: boolean;
  cash_drawer?: boolean;
  cashDrawer?: boolean;
  is_active?: boolean;
  isActive?: boolean;
  windows_printer_name?: string;
  windowsPrinterName?: string;
  is_default?: boolean;
  isDefault?: boolean;
  print_on_start?: boolean;
  printOnStart?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-printer-master',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExportDropdownComponent],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
      
      <!-- Top Header & Action Controls -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">{{ 'PRINTER.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">{{ 'PRINTER.SUBTITLE' | translate }}</p>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <!-- Universal Master Export Dropdown -->
          <app-export-dropdown 
            [masterKey]="'printers'" 
            [title]="'PRINTER.TITLE' | translate" 
            [items]="filteredItems()" 
            [filename]="'Printer_Master'">
          </app-export-dropdown>
          
          <!-- Refresh Button -->
          <button (click)="load()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          
          <!-- Add Printer Button -->
          <button (click)="openForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 cursor-pointer text-xs transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            {{ 'PRINTER.ADD_TITLE' | translate }}
          </button>
        </div>
      </div>

      <!-- Quick Test / Toast Status Bar -->
      <div *ngIf="actionToast()" class="p-4 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150"
           [ngClass]="actionToast()?.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : (actionToast()?.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-800 border-red-200')">
        <div class="flex items-center gap-2">
          <span>{{ actionToast()?.message }}</span>
          <span *ngIf="actionToast()?.latencyMs" class="font-mono bg-white/60 px-2 py-0.5 rounded text-[11px]">
            {{ actionToast()?.latencyMs }}ms
          </span>
        </div>
        <button (click)="actionToast.set(null)" class="text-slate-400 hover:text-slate-700 text-base font-bold cursor-pointer">&times;</button>
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
          <!-- Branch Filter -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500">{{ 'NAV.BRANCH' | translate }}:</label>
            <select 
              [(ngModel)]="branchFilter" 
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option *ngFor="let b of branches()" [value]="b.name">{{ b.name }}</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500">{{ 'COMMON.STATUS' | translate }}:</label>
            <select 
              [(ngModel)]="statusFilter" 
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
              <option value="INACTIVE">{{ 'COMMON.INACTIVE' | translate }}</option>
            </select>
          </div>

          <span class="text-xs font-bold text-slate-400">
            {{ filteredItems().length }} {{ 'COMMON.TOTAL_COUNT' | translate }}
          </span>
        </div>
      </div>
      
      <!-- Table & Form -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        <!-- Add / Edit Modal Form -->
        <div *ngIf="isFormOpen()" class="bg-slate-50 p-6 border-b border-slate-200 animate-in fade-in duration-150">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              {{ (editingId() ? 'PRINTER.EDIT_TITLE' : 'PRINTER.ADD_TITLE') | translate }}
            </h3>
            <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">&times;</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <!-- Printer ID -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.PRINTER_ID' | translate }}</label>
              <input type="text" [(ngModel)]="formData.id" [disabled]="!!editingId()" placeholder="PRN-101" class="border border-slate-300 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100">
            </div>

            <!-- Printer Name -->
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.NAME' | translate }} *</label>
              <input type="text" [(ngModel)]="formData.printerName" placeholder="e.g. Counter 1 Thermal Printer" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-slate-800">
            </div>

            <!-- Interface Type -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.INTERFACE' | translate }}</label>
              <select [(ngModel)]="formData.interfaceType" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="LAN">LAN (Network TCP)</option>
                <option value="USB">USB Direct</option>
                <option value="VIRTUAL">VIRTUAL (Simulator)</option>
              </select>
            </div>

            <!-- Windows Printer Queue (USB Direct) -->
            <div *ngIf="formData.interfaceType === 'USB'" class="flex flex-col gap-1 md:col-span-3">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-bold text-indigo-700 uppercase">
                  {{ 'PRINTER.WINDOWS_QUEUE' | translate }} (Windows Spooler) *
                </label>
                <button type="button" (click)="loadSystemPrinters()" [disabled]="detectingPrinters()" class="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer">
                  <span *ngIf="detectingPrinters()" class="w-2.5 h-2.5 border border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  <span>🔄 {{ 'PRINTER.DETECT_PRINTERS' | translate }}</span>
                </button>
              </div>
              <div class="flex gap-2">
                <select [(ngModel)]="formData.windowsPrinterName" class="border border-indigo-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-slate-800 flex-1">
                  <option value="POS-80">POS-80 (Default USB Thermal)</option>
                  <option *ngFor="let p of systemPrinters()" [value]="p.name">
                    {{ p.name }} (Port: {{ p.port }}) {{ p.isUsb ? '• USB' : '' }}
                  </option>
                </select>
                <input type="text" [(ngModel)]="formData.windowsPrinterName" placeholder="Or type queue name" class="border border-slate-300 rounded px-2.5 py-1.5 text-xs w-44 font-mono">
              </div>
              <p class="text-[10px] text-slate-400">Direct RAW ESC/POS USB spooling (Instant connection check, zero network timeouts).</p>
            </div>

            <!-- IP Address (LAN Network Only) -->
            <div *ngIf="formData.interfaceType === 'LAN'" class="flex flex-col gap-1 md:col-span-2">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.IP_ADDRESS' | translate }} *</label>
              <input type="text" [(ngModel)]="formData.ipAddress" placeholder="192.168.1.200" class="border border-slate-300 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            </div>

            <!-- Port (LAN Network Only) -->
            <div *ngIf="formData.interfaceType === 'LAN'" class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.PORT' | translate }}</label>
              <input type="number" [(ngModel)]="formData.port" placeholder="9100" class="border border-slate-300 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            </div>

            <!-- Paper Width -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.PAPER_WIDTH' | translate }}</label>
              <select [(ngModel)]="formData.paperWidth" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="80mm">80mm (Standard POS)</option>
                <option value="58mm">58mm (Compact Roll)</option>
              </select>
            </div>

            <!-- Branch Binding -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'NAV.BRANCH' | translate }}</label>
              <select [(ngModel)]="formData.branchName" (change)="onBranchChange()" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="All Branches">{{ 'COMMON.ALL' | translate }}</option>
                <option *ngFor="let b of branches()" [value]="b.name">{{ b.name }}</option>
              </select>
            </div>

            <!-- Location Binding -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'NAV.LOCATION' | translate }}</label>
              <select [(ngModel)]="formData.locationName" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="All Locations">{{ 'COMMON.ALL' | translate }}</option>
                <option *ngFor="let l of filteredLocations()" [value]="l.name">{{ l.name }}</option>
              </select>
            </div>

            <!-- Terminal Binding -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.TERMINAL' | translate }}</label>
              <input type="text" [(ngModel)]="formData.terminal" placeholder="e.g. POS-Terminal-1, ALL" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono">
            </div>

            <!-- Print Type Role -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'PRINTER.PRINT_TYPE' | translate }}</label>
              <select [(ngModel)]="formData.printType" class="border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold">
                <option value="ALL">ALL (Universal)</option>
                <option value="SETTLEMENT">SETTLEMENT (Settlement & Close)</option>
                <option value="RECEIPT">RECEIPT (Start & Sale)</option>
                <option value="DUPLICATE">DUPLICATE (Reprint)</option>
                <option value="REPORT">REPORT (Shift/Day Close)</option>
              </select>
            </div>

            <!-- Hardware Switches -->
            <div class="flex items-center gap-4 md:col-span-3 pt-2">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input type="checkbox" [(ngModel)]="formData.autoCut" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                <span>{{ 'PRINTER.AUTO_CUT' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input type="checkbox" [(ngModel)]="formData.cashDrawer" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                <span>{{ 'PRINTER.CASH_DRAWER' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input type="checkbox" [(ngModel)]="formData.isActive" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                <span>{{ 'COMMON.ACTIVE' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                <input type="checkbox" [(ngModel)]="formData.isDefault" class="rounded text-amber-600 focus:ring-amber-500 w-4 h-4">
                <span>⭐ {{ 'PRINTER.SET_DEFAULT' | translate }}</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200" [title]="'PRINTER.PRINT_ON_START_DESC' | translate">
                <input type="checkbox" [(ngModel)]="formData.printOnStart" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                <span>🧾 {{ 'PRINTER.PRINT_ON_START' | translate }}</span>
              </label>
            </div>

          </div>

          <div class="flex gap-2 justify-end pt-2 border-t border-slate-200">
            <button (click)="closeForm()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 transition">
              <span *ngIf="saving()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ 'COMMON.SAVE_TO_POSTGRES' | translate }}
            </button>
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="px-4 py-3">{{ 'PRINTER.PRINTER_ID' | translate }}</th>
                <th class="px-4 py-3">{{ 'PRINTER.NAME' | translate }}</th>
                <th class="px-4 py-3">{{ 'PRINTER.IP_ADDRESS' | translate }} & {{ 'PRINTER.PORT' | translate }}</th>
                <th class="px-4 py-3">{{ 'NAV.BRANCH' | translate }} / {{ 'NAV.LOCATION' | translate }}</th>
                <th class="px-4 py-3">{{ 'PRINTER.TERMINAL' | translate }}</th>
                <th class="px-4 py-3">{{ 'PRINTER.PRINT_TYPE' | translate }}</th>
                <th class="px-4 py-3">{{ 'PRINTER.PAPER_WIDTH' | translate }}</th>
                <th class="px-4 py-3">{{ 'COMMON.STATUS' | translate }}</th>
                <th class="px-4 py-3 text-right">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of filteredItems()" class="hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-mono font-bold text-slate-800">{{ item.id }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-900">{{ item.printer_name || item.printerName }}</span>
                    <span *ngIf="item.is_default || item.isDefault" class="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[9px] font-bold">
                      ⭐ {{ 'PRINTER.DEFAULT_BADGE' | translate }}
                    </span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <span class="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-bold">{{ item.interface_type || item.interfaceType || 'LAN' }}</span>
                    <span>{{ item.printer_type || item.printerType || 'ESC/POS' }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-[11px]">
                  <div *ngIf="(item.interface_type || item.interfaceType) === 'USB'" class="text-indigo-700 font-bold flex items-center gap-1">
                    <span>USB Spool:</span>
                    <span class="bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-900">{{ item.windows_printer_name || item.windowsPrinterName || 'POS-80' }}</span>
                  </div>
                  <div *ngIf="(item.interface_type || item.interfaceType) !== 'USB'" class="text-slate-800 font-semibold">
                    {{ item.ip_address || item.ipAddress }}:{{ item.port || 9100 }}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="font-semibold text-slate-700">{{ item.branch_name || item.branchName || 'All Branches' }}</div>
                  <div class="text-[10px] text-slate-400">{{ item.location_name || item.locationName || 'All Locations' }}</div>
                </td>
                <td class="px-4 py-3 font-mono text-[11px]">
                  <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">{{ item.terminal || 'ALL' }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        [ngClass]="(item.print_type || item.printType) === 'SETTLEMENT' ? 'bg-amber-100 text-amber-800' : ((item.print_type || item.printType) === 'RECEIPT' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700')">
                    {{ item.print_type || item.printType || 'ALL' }}
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-[11px] text-slate-500">{{ item.paper_width || item.paperWidth || '80mm' }}</td>
                <td class="px-4 py-3">
                  <button (click)="toggleStatus(item)" [title]="'Click to toggle status'" class="cursor-pointer">
                    <span *ngIf="item.is_active || item.isActive" class="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1 hover:bg-emerald-200 transition">
                      <span class="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span> {{ 'COMMON.ACTIVE' | translate }}
                    </span>
                    <span *ngIf="!(item.is_active || item.isActive)" class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px] inline-flex items-center gap-1 hover:bg-slate-200 transition">
                      <span class="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> {{ 'COMMON.INACTIVE' | translate }}
                    </span>
                  </button>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    
                    <!-- Set Default Star Button -->
                    <button *ngIf="!(item.is_default || item.isDefault)" (click)="setDefault(item)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md cursor-pointer transition" [title]="'PRINTER.SET_DEFAULT' | translate">
                      <svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    </button>
                    
                    <!-- Test Connection Button -->
                    <button (click)="testConnection(item)" [disabled]="testingId() === item.id" class="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-md font-bold text-[10px] transition flex items-center gap-1 cursor-pointer border border-slate-200" [title]="'PRINTER.TEST_CONNECTION' | translate">
                      <span *ngIf="testingId() === item.id" class="w-2.5 h-2.5 border border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                      <svg *ngIf="testingId() !== item.id" class="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      <span>Ping</span>
                    </button>

                    <!-- Test Print Button -->
                    <button (click)="testPrint(item)" [disabled]="printingId() === item.id" class="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-md font-bold text-[10px] transition flex items-center gap-1 cursor-pointer border border-slate-200" [title]="'PRINTER.TEST_PRINT' | translate">
                      <span *ngIf="printingId() === item.id" class="w-2.5 h-2.5 border border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                      <svg *ngIf="printingId() !== item.id" class="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      <span>{{ 'PRINTER.TEST_PRINT' | translate }}</span>
                    </button>

                    <!-- Edit Button -->
                    <button (click)="edit(item)" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer transition" [title]="'COMMON.EDIT' | translate">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>

                    <!-- Delete Button -->
                    <button (click)="deleteItem(item.id)" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition" [title]="'COMMON.DELETE' | translate">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredItems().length === 0">
                <td colspan="9" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    <span>{{ 'COMMON.NO_RECORDS' | translate }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `
})
export class PrinterMasterComponent implements OnInit {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);

  items = signal<PrinterItem[]>([]);
  branches = signal<any[]>([]);
  locations = signal<any[]>([]);
  systemPrinters = signal<any[]>([]);
  detectingPrinters = signal<boolean>(false);

  isFormOpen = signal<boolean>(false);
  editingId = signal<string | null>(null);
  saving = signal<boolean>(false);
  testingId = signal<string | null>(null);
  printingId = signal<string | null>(null);

  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');
  branchFilter = signal<string>('ALL');

  actionToast = signal<{ type: 'success' | 'warning' | 'error'; message: string; latencyMs?: number } | null>(null);

  formData: any = {
    id: '',
    printerName: '',
    windowsPrinterName: 'POS-80',
    interfaceType: 'LAN',
    ipAddress: '192.168.1.200',
    port: 9100,
    branchId: '',
    branchName: 'All Branches',
    locationId: '',
    locationName: 'All Locations',
    terminal: 'ALL',
    printerType: 'ESC/POS',
    printType: 'ALL',
    paperWidth: '80mm',
    encoding: 'CP864',
    autoCut: true,
    cashDrawer: false,
    isActive: true,
    isDefault: false,
  };

  filteredItems = computed(() => {
    let list = this.items();
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const bf = this.branchFilter();

    if (st !== 'ALL') {
      list = list.filter(i => {
        const active = i.is_active !== undefined ? i.is_active : i.isActive;
        return st === 'ACTIVE' ? active : !active;
      });
    }

    if (bf !== 'ALL') {
      list = list.filter(i => {
        const b = i.branch_name || i.branchName || '';
        return b === bf || b === 'All Branches';
      });
    }

    if (q) {
      list = list.filter(i => {
        const name = (i.printer_name || i.printerName || '').toLowerCase();
        const ip = (i.ip_address || i.ipAddress || '').toLowerCase();
        const id = (i.id || '').toLowerCase();
        const branch = (i.branch_name || i.branchName || '').toLowerCase();
        const loc = (i.location_name || i.locationName || '').toLowerCase();
        const term = (i.terminal || '').toLowerCase();
        return name.includes(q) || ip.includes(q) || id.includes(q) || branch.includes(q) || loc.includes(q) || term.includes(q);
      });
    }

    return list;
  });

  filteredLocations = computed(() => {
    const selectedBranch = this.formData.branchName;
    if (!selectedBranch || selectedBranch === 'All Branches') {
      return this.locations();
    }
    return this.locations().filter(l => l.branch === selectedBranch || l.branchName === selectedBranch);
  });

  ngOnInit() {
    this.load();
    this.loadBranchesAndLocations();
    this.loadSystemPrinters();
  }

  load() {
    this.api.getPrinters().subscribe({
      next: (data) => {
        this.items.set(data || []);
      },
      error: (err) => {
        console.error('Error fetching printers from Database:', err);
      }
    });
  }

  loadSystemPrinters() {
    this.detectingPrinters.set(true);
    this.api.getSystemPrinters().subscribe({
      next: (res) => {
        this.detectingPrinters.set(false);
        if (res && res.printers) {
          this.systemPrinters.set(res.printers);
        }
      },
      error: (err) => {
        this.detectingPrinters.set(false);
        console.warn('Could not detect Windows printers:', err);
      }
    });
  }

  setDefault(item: PrinterItem) {
    this.api.setDefaultPrinter(item.id).subscribe({
      next: (res) => {
        this.load();
        this.showToast('success', res.message || `Printer ${item.printerName || item.printer_name} set as system default.`);
      },
      error: (err) => {
        alert('Error setting default printer: ' + (err.error?.error || err.message));
      }
    });
  }

  loadBranchesAndLocations() {
    this.api.getBranches().subscribe({
      next: (b) => this.branches.set(b || [])
    });
    this.api.getLocations().subscribe({
      next: (l) => this.locations.set(l || [])
    });
  }

  onBranchChange() {
    const foundBranch = this.branches().find(b => b.name === this.formData.branchName);
    if (foundBranch) {
      this.formData.branchId = foundBranch.id;
    } else {
      this.formData.branchId = null;
    }
    this.formData.locationName = 'All Locations';
    this.formData.locationId = null;
  }

  openForm() {
    this.editingId.set(null);
    this.formData = {
      id: `PRN-${Math.floor(100 + Math.random() * 900)}`,
      printerName: '',
      windowsPrinterName: 'POS-80',
      interfaceType: 'USB',
      ipAddress: '192.168.1.200',
      port: 9100,
      branchId: '',
      branchName: 'All Branches',
      locationId: '',
      locationName: 'All Locations',
      terminal: 'ALL',
      printerType: 'ESC/POS',
      printType: 'ALL',
      paperWidth: '80mm',
      encoding: 'CP864',
      autoCut: true,
      cashDrawer: false,
      isActive: true,
      isDefault: false,
      printOnStart: true,
    };
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.editingId.set(null);
  }

  edit(item: PrinterItem) {
    this.editingId.set(item.id);
    this.formData = {
      id: item.id,
      printerName: item.printer_name || item.printerName || '',
      windowsPrinterName: item.windows_printer_name || item.windowsPrinterName || 'POS-80',
      interfaceType: item.interface_type || item.interfaceType || 'LAN',
      ipAddress: item.ip_address || item.ipAddress || '192.168.1.200',
      port: item.port || 9100,
      branchId: item.branch_id || item.branchId || '',
      branchName: item.branch_name || item.branchName || 'All Branches',
      locationId: item.location_id || item.locationId || '',
      locationName: item.location_name || item.locationName || 'All Locations',
      terminal: item.terminal || 'ALL',
      printerType: item.printer_type || item.printerType || 'ESC/POS',
      printType: item.print_type || item.printType || 'ALL',
      paperWidth: item.paper_width || item.paperWidth || '80mm',
      encoding: item.encoding || 'CP864',
      autoCut: item.auto_cut !== undefined ? item.auto_cut : (item.autoCut !== false),
      cashDrawer: item.cash_drawer !== undefined ? item.cash_drawer : (item.cashDrawer === true),
      isActive: item.is_active !== undefined ? item.is_active : (item.isActive !== false),
      isDefault: item.is_default !== undefined ? item.is_default : (item.isDefault === true),
      printOnStart: item.print_on_start !== undefined ? item.print_on_start : (item.printOnStart !== false),
    };
    this.isFormOpen.set(true);
  }

  save() {
    if (!this.formData.printerName || !this.formData.printerName.trim()) {
      alert('Please enter a valid Printer Name.');
      return;
    }
    if (this.formData.interfaceType === 'LAN' && (!this.formData.ipAddress || !this.formData.ipAddress.trim())) {
      alert('Please enter a valid IP Address for LAN printer.');
      return;
    }
    if (this.formData.interfaceType === 'USB' && (!this.formData.windowsPrinterName || !this.formData.windowsPrinterName.trim())) {
      alert('Please select or specify a Windows Printer Queue name (e.g. POS-80).');
      return;
    }

    this.saving.set(true);

    const payload = {
      ...this.formData,
      port: Number(this.formData.port) || 9100,
    };

    if (this.editingId()) {
      this.api.updatePrinter(this.editingId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeForm();
          this.load();
          this.showToast('success', `Printer "${payload.printerName}" updated successfully in Database.`);
        },
        error: (err) => {
          this.saving.set(false);
          alert('Error updating printer: ' + (err.error?.error || err.message));
        }
      });
    } else {
      this.api.createPrinter(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeForm();
          this.load();
          this.showToast('success', `Printer "${payload.printerName}" created successfully in Database.`);
        },
        error: (err) => {
          this.saving.set(false);
          alert('Error creating printer: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  deleteItem(id: string) {
    if (confirm('Are you sure you want to delete this thermal printer profile?')) {
      this.api.deletePrinter(id).subscribe({
        next: () => {
          this.load();
          this.showToast('success', `Printer ${id} deleted successfully.`);
        },
        error: (err) => {
          alert('Error deleting printer: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  toggleStatus(item: PrinterItem) {
    this.api.togglePrinterStatus(item.id).subscribe({
      next: (updated) => {
        this.load();
        const active = updated.is_active !== undefined ? updated.is_active : updated.isActive;
        this.showToast(active ? 'success' : 'warning', `Printer ${item.id} status changed to ${active ? 'ACTIVE' : 'INACTIVE'}.`);
      },
      error: (err) => {
        alert('Error toggling printer status: ' + (err.error?.error || err.message));
      }
    });
  }

  testConnection(item: PrinterItem) {
    this.testingId.set(item.id);
    this.api.testPrinterConnection({ id: item.id }).subscribe({
      next: (res) => {
        this.testingId.set(null);
        if (res.success) {
          this.showToast('success', res.message, res.latencyMs);
        } else {
          this.showToast('error', res.message, res.latencyMs);
        }
      },
      error: (err) => {
        this.testingId.set(null);
        this.showToast('error', `Connection failed: ${err.error?.error || err.message}`);
      }
    });
  }

  testPrint(item: PrinterItem) {
    this.printingId.set(item.id);
    this.api.testPrinterPrint({ id: item.id }).subscribe({
      next: (res) => {
        this.printingId.set(null);
        if (res.success) {
          this.showToast('success', `Test slip printed: ${res.message}`, res.latencyMs);
        } else {
          this.showToast('warning', `Printer offline: ${res.message}`, res.latencyMs);
        }
      },
      error: (err) => {
        this.printingId.set(null);
        this.showToast('error', `Test print error: ${err.error?.error || err.message}`);
      }
    });
  }

  showToast(type: 'success' | 'warning' | 'error', message: string, latencyMs?: number) {
    this.actionToast.set({ type, message, latencyMs });
    setTimeout(() => {
      if (this.actionToast()?.message === message) {
        this.actionToast.set(null);
      }
    }, 5000);
  }
}
