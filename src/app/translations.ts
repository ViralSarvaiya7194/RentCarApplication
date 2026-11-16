import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { ExportDropdownComponent } from './export-dropdown.component';

export interface ParsedImportItem {
  id?: string;
  translationKey: string;
  englishText: string;
  arabicText: string;
  module: string;
  description?: string;
  isActive: 'ACTIVE' | 'INACTIVE';
  actionStatus: 'NEW' | 'UPDATE' | 'INVALID';
  validationError?: string;
}

@Component({
  selector: 'app-translations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExportDropdownComponent],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
      <!-- Header Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">{{ 'TRANS.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">{{ 'TRANS.SUBTITLE' | translate }}</p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- Export Dropdown -->
          <app-export-dropdown 
            [masterKey]="'translations'" 
            [title]="'TRANS.TITLE' | translate" 
            [items]="filteredItems()" 
            [filename]="'Translations_Master'">
          </app-export-dropdown>

          <!-- Import Button -->
          <button 
            (click)="openImportModal()" 
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-lg font-medium shadow-md shadow-emerald-600/20 transition flex items-center gap-2 text-sm cursor-pointer"
            [title]="'TRANS.IMPORT_BTN' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            <span>{{ 'TRANS.IMPORT_BTN' | translate }}</span>
          </button>

          <!-- Refresh Button -->
          <button (click)="load()" class="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm transition cursor-pointer" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>

          <!-- Add Key Button -->
          <button (click)="openAddModal()" class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition flex items-center gap-2 text-sm cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            {{ 'TRANS.ADD_TITLE' | translate }}
          </button>
        </div>
      </div>

      <!-- Toast Alert Notification -->
      <div *ngIf="toastMessage()" class="p-4 rounded-xl shadow-sm border flex items-center justify-between transition-all"
           [ngClass]="toastType() === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'">
        <div class="flex items-center gap-2.5 text-sm font-medium">
          <svg *ngIf="toastType() === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <svg *ngIf="toastType() === 'error'" class="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>{{ toastMessage() }}</span>
        </div>
        <button (click)="toastMessage.set(null)" class="text-slate-400 hover:text-slate-600 p-1 rounded-md">✕</button>
      </div>

      <!-- Stats Counters -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">{{ 'TRANS.TOTAL_KEYS' | translate }}</p>
            <p class="text-2xl font-black text-slate-800 mt-1">{{ totalKeys() }}</p>
          </div>
          <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">🔤</div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">{{ 'TRANS.ACTIVE_KEYS' | translate }}</p>
            <p class="text-2xl font-black text-emerald-600 mt-1">{{ activeKeys() }}</p>
          </div>
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">✅</div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">English</p>
            <p class="text-2xl font-black text-blue-600 mt-1">{{ englishCount() }}</p>
          </div>
          <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">🇺🇸 EN</div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">العربية (Arabic)</p>
            <p class="text-2xl font-black text-purple-600 mt-1">{{ arabicCount() }}</p>
          </div>
          <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">🇸🇦 AR</div>
        </div>
      </div>

      <!-- Filters & Search Bar -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div class="relative w-full md:w-96">
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (input)="applyFilters()" 
            [placeholder]="'TRANS.SEARCH_PLACEHOLDER' | translate" 
            class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition">
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
          <!-- Module Filter -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500 whitespace-nowrap">{{ 'TRANS.MODULE' | translate }}:</label>
            <select 
              [(ngModel)]="selectedModule" 
              (change)="applyFilters()" 
              class="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option *ngFor="let mod of availableModules()" [value]="mod">{{ mod }}</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500 whitespace-nowrap">{{ 'COMMON.STATUS' | translate }}:</label>
            <select 
              [(ngModel)]="selectedStatus" 
              (change)="applyFilters()" 
              class="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
              <option value="INACTIVE">{{ 'COMMON.INACTIVE' | translate }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Translations Table -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="px-6 py-4">{{ 'TRANS.KEY' | translate }}</th>
                <th class="px-4 py-4">{{ 'TRANS.MODULE' | translate }}</th>
                <th class="px-6 py-4">{{ 'TRANS.ENGLISH_TEXT' | translate }}</th>
                <th class="px-6 py-4">{{ 'TRANS.ARABIC_TEXT' | translate }}</th>
                <th class="px-4 py-4">{{ 'COMMON.STATUS' | translate }}</th>
                <th class="px-6 py-4 text-right">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of filteredItems()" class="hover:bg-slate-50 transition-colors">
                <!-- Key -->
                <td class="px-6 py-3.5 font-mono text-xs font-bold text-indigo-700">
                  <span class="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{{ item.translationKey || item.translation_key }}</span>
                </td>
                <!-- Module -->
                <td class="px-4 py-3.5">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{{ item.module }}</span>
                </td>
                <!-- English -->
                <td class="px-6 py-3.5 text-slate-900 font-medium max-w-xs truncate">
                  {{ item.englishText || item.english_text }}
                </td>
                <!-- Arabic -->
                <td class="px-6 py-3.5 text-slate-900 font-medium font-arabic max-w-xs truncate" dir="rtl">
                  {{ item.arabicText || item.arabic_text }}
                </td>
                <!-- Status -->
                <td class="px-4 py-3.5">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold" 
                        [ngClass]="(item.isActive || item.is_active) === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'">
                    {{ (item.isActive || item.is_active) }}
                  </span>
                </td>
                <!-- Actions -->
                <td class="px-6 py-3.5 text-right whitespace-nowrap">
                  <button (click)="openEditModal(item)" class="text-indigo-600 hover:text-indigo-800 font-medium mr-3 text-xs cursor-pointer">
                    {{ 'COMMON.EDIT' | translate }}
                  </button>
                  <button (click)="deleteItem(item)" class="text-red-500 hover:text-red-700 font-medium text-xs cursor-pointer">
                    {{ 'COMMON.DELETE' | translate }}
                  </button>
                </td>
              </tr>

              <tr *ngIf="filteredItems().length === 0 && !loading()">
                <td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">
                  {{ 'COMMON.NO_RECORDS' | translate }}
                </td>
              </tr>

              <tr *ngIf="loading()">
                <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                  <div class="inline-flex items-center gap-2 text-sm">
                    <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    {{ 'COMMON.LOADING' | translate }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- BATCH IMPORT TRANSLATIONS MODAL                      -->
      <!-- ==================================================== -->
      <div *ngIf="isImportModalOpen()" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100 my-auto">
          
          <!-- Modal Header -->
          <div class="bg-emerald-600 p-5 flex items-center justify-between text-white shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-700/50 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <div>
                <h3 class="text-base font-bold">{{ 'TRANS.IMPORT_MODAL_TITLE' | translate }}</h3>
                <p class="text-xs text-emerald-100 mt-0.5">{{ 'TRANS.IMPORT_MODAL_DESC' | translate }}</p>
              </div>
            </div>
            <button (click)="closeImportModal()" class="text-white hover:bg-emerald-700 rounded p-1.5 transition cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700 text-xs">
            
            <!-- Import Options & Template Download Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <!-- Mode Selection -->
              <div class="flex flex-col gap-2">
                <span class="font-bold text-slate-700 uppercase text-[10px] tracking-wider">1. {{ 'MASTER_EXPORT.PROCESSING_MODE' | translate }}</span>
                <div class="flex flex-col gap-1.5">
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input type="radio" [(ngModel)]="importMode" value="UPSERT" name="importMode" class="text-emerald-600 focus:ring-emerald-500">
                    <span>{{ 'TRANS.IMPORT_MODE_UPSERT' | translate }}</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-600">
                    <input type="radio" [(ngModel)]="importMode" value="NEW_ONLY" name="importMode" class="text-emerald-600 focus:ring-emerald-500">
                    <span>{{ 'TRANS.IMPORT_MODE_NEW_ONLY' | translate }}</span>
                  </label>
                </div>
              </div>

              <!-- Template Download Shortcuts -->
              <div class="flex flex-col gap-2 md:border-l md:border-slate-200 md:pl-4">
                <span class="font-bold text-slate-700 uppercase text-[10px] tracking-wider">2. {{ 'TRANS.DOWNLOAD_TEMPLATE' | translate }}</span>
                <p class="text-[11px] text-slate-500">Download formatted sample file with exact headers:</p>
                <div class="flex gap-2 mt-1">
                  <button 
                    type="button" 
                    (click)="downloadExcelTemplate()" 
                    class="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-bold flex items-center gap-1.5 transition text-xs cursor-pointer">
                    <span>📊</span> Excel Template (.xlsx)
                  </button>
                  <button 
                    type="button" 
                    (click)="downloadCsvTemplate()" 
                    class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-bold flex items-center gap-1.5 transition text-xs cursor-pointer">
                    <span>📄</span> CSV Template (.csv)
                  </button>
                </div>
              </div>
            </div>

            <!-- Drag & Drop Zone -->
            <div class="flex flex-col gap-2">
              <span class="font-bold text-slate-700 uppercase text-[10px] tracking-wider">3. Select / Drop File (Same format as Export: Excel, CSV, or JSON)</span>
              
              <div 
                class="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                [ngClass]="dragOver() ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50'"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onFileDrop($event)"
                (click)="fileInput.click()">
                
                <input 
                  #fileInput 
                  type="file" 
                  accept=".xlsx, .xls, .csv, .json" 
                  class="hidden" 
                  (change)="onFileSelected($event)">

                <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
                  📁
                </div>
                <div>
                  <p class="font-bold text-slate-800 text-sm">{{ 'TRANS.IMPORT_DROP_ZONE' | translate }}</p>
                  <p class="text-slate-400 text-[11px] mt-0.5">Supports .xlsx (Excel), .csv (Comma-delimited with UTF-8), and .json</p>
                </div>

                <!-- Selected File Pill -->
                <div *ngIf="importFileName()" class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white border border-emerald-300 rounded-full shadow-sm text-emerald-800 font-bold text-xs" (click)="$event.stopPropagation()">
                  <span>📄 {{ importFileName() }} ({{ importFileSize() }})</span>
                  <button type="button" (click)="clearFile(); $event.stopPropagation()" class="text-slate-400 hover:text-red-600 font-bold ml-1 cursor-pointer">✕</button>
                </div>
              </div>
            </div>

            <!-- Error message if parsing failed -->
            <div *ngIf="importErrorMsg()" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span>⚠️</span>
                <span>{{ importErrorMsg() }}</span>
              </div>
              <button (click)="importErrorMsg.set(null)" class="text-red-400 hover:text-red-700">✕</button>
            </div>

            <!-- Preview & Validation Statistics Cards -->
            <div *ngIf="parsedItems().length > 0" class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-700 uppercase text-[10px] tracking-wider">{{ 'TRANS.IMPORT_PREVIEW_TITLE' | translate }}</span>
                <span class="text-slate-400 text-[11px]">Total: {{ parsedItems().length }} rows detected</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-slate-100 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <p class="text-[10px] text-slate-500 font-bold uppercase">Total Rows</p>
                    <p class="text-lg font-black text-slate-800">{{ parsedItems().length }}</p>
                  </div>
                  <span class="text-lg">📋</span>
                </div>

                <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p class="text-[10px] text-emerald-600 font-bold uppercase">{{ 'TRANS.ACTION_NEW' | translate }}</p>
                    <p class="text-lg font-black text-emerald-700">{{ newKeysCount() }}</p>
                  </div>
                  <span class="text-lg">✨</span>
                </div>

                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <p class="text-[10px] text-blue-600 font-bold uppercase">{{ 'TRANS.ACTION_UPDATE' | translate }}</p>
                    <p class="text-lg font-black text-blue-700">{{ updateKeysCount() }}</p>
                  </div>
                  <span class="text-lg">🔄</span>
                </div>

                <div class="bg-rose-50 p-3 rounded-lg border border-rose-200 flex items-center justify-between">
                  <div>
                    <p class="text-[10px] text-rose-600 font-bold uppercase">{{ 'TRANS.ACTION_INVALID' | translate }}</p>
                    <p class="text-lg font-black text-rose-700">{{ invalidKeysCount() }}</p>
                  </div>
                  <span class="text-lg">⚠️</span>
                </div>
              </div>

              <!-- Filter Search for Preview -->
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="previewSearchQuery" 
                  placeholder="Filter preview rows by key or text..." 
                  class="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              </div>

              <!-- Preview Table -->
              <div class="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table class="w-full text-left text-xs text-slate-600">
                  <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th class="px-3 py-2">#</th>
                      <th class="px-3 py-2">Action</th>
                      <th class="px-3 py-2">Key</th>
                      <th class="px-3 py-2">Module</th>
                      <th class="px-3 py-2">English Text</th>
                      <th class="px-3 py-2">Arabic Text</th>
                      <th class="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let item of filteredPreviewItems(); let idx = index" class="hover:bg-slate-50">
                      <td class="px-3 py-2 text-slate-400">{{ idx + 1 }}</td>
                      <td class="px-3 py-2">
                        <span 
                          class="px-2 py-0.5 rounded text-[9px] font-bold"
                          [ngClass]="item.actionStatus === 'NEW' ? 'bg-emerald-100 text-emerald-800' : (item.actionStatus === 'UPDATE' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800')">
                          {{ item.actionStatus }}
                        </span>
                      </td>
                      <td class="px-3 py-2 font-mono font-bold text-slate-800">{{ item.translationKey }}</td>
                      <td class="px-3 py-2 font-semibold text-slate-500">{{ item.module }}</td>
                      <td class="px-3 py-2 text-slate-900 max-w-xs truncate">{{ item.englishText }}</td>
                      <td class="px-3 py-2 text-slate-900 max-w-xs truncate font-arabic" dir="rtl">{{ item.arabicText }}</td>
                      <td class="px-3 py-2">
                        <span class="px-1.5 py-0.5 text-[9px] font-bold rounded" [ngClass]="item.isActive === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'">
                          {{ item.isActive }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

          </div>

          <!-- Modal Footer -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button 
              type="button" 
              (click)="closeImportModal()" 
              class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer">
              {{ 'COMMON.CANCEL' | translate }}
            </button>

            <div class="flex items-center gap-3">
              <span *ngIf="parsedItems().length > 0" class="text-xs text-slate-500 font-medium">
                {{ validImportCount() }} valid items ready
              </span>
              <button 
                type="button" 
                (click)="executeImport()" 
                [disabled]="validImportCount() === 0 || importing()"
                class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer">
                <span *ngIf="importing()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ 'TRANS.IMPORT_BTN' | translate }} ({{ validImportCount() }})</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Add / Edit Modal Popup -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100">
          <div class="bg-indigo-600 p-5 flex items-center justify-between text-white shrink-0">
            <h3 class="text-base font-bold flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
              {{ isEditing() ? ('TRANS.EDIT_TITLE' | translate) : ('TRANS.ADD_TITLE' | translate) }}
            </h3>
            <button (click)="closeModal()" class="text-white hover:bg-indigo-700 rounded p-1 transition cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <form (ngSubmit)="saveModal()" class="p-6 space-y-4 overflow-y-auto">
            <!-- Key & Module -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'TRANS.KEY' | translate }} *</label>
                <input 
                  type="text" 
                  [(ngModel)]="currentForm.translationKey" 
                  name="translationKey" 
                  required 
                  [placeholder]="'TRANS.KEY_PLACEHOLDER' | translate" 
                  class="border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'TRANS.MODULE' | translate }}</label>
                <input 
                  type="text" 
                  [(ngModel)]="currentForm.module" 
                  name="module" 
                  placeholder="e.g. POS, Common" 
                  class="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              </div>
            </div>

            <!-- English Text -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>{{ 'TRANS.ENGLISH_TEXT' | translate }} *</span>
                <span class="text-[9px] text-blue-600 font-bold">🇺🇸 EN</span>
              </label>
              <textarea 
                [(ngModel)]="currentForm.englishText" 
                name="englishText" 
                required 
                rows="2" 
                [placeholder]="'TRANS.ENGLISH_PLACEHOLDER' | translate" 
                class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"></textarea>
            </div>

            <!-- Arabic Text -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>{{ 'TRANS.ARABIC_TEXT' | translate }} *</span>
                <span class="text-[9px] text-purple-600 font-bold">🇸🇦 AR (RTL)</span>
              </label>
              <textarea 
                [(ngModel)]="currentForm.arabicText" 
                name="arabicText" 
                required 
                rows="2" 
                dir="rtl"
                [placeholder]="'TRANS.ARABIC_PLACEHOLDER' | translate" 
                class="border border-slate-300 rounded-lg px-3 py-2 text-sm font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"></textarea>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'TRANS.DESCRIPTION' | translate }}</label>
              <input 
                type="text" 
                [(ngModel)]="currentForm.description" 
                name="description" 
                [placeholder]="'TRANS.DESCRIPTION_PLACEHOLDER' | translate" 
                class="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            </div>

            <!-- Status -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'COMMON.STATUS' | translate }}</label>
              <select 
                [(ngModel)]="currentForm.isActive" 
                name="isActive" 
                class="border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
                <option value="INACTIVE">{{ 'COMMON.INACTIVE' | translate }}</option>
              </select>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4 border-t border-slate-100 justify-end">
              <button 
                type="button" 
                (click)="closeModal()" 
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                {{ 'COMMON.CANCEL' | translate }}
              </button>
              <button 
                type="submit" 
                [disabled]="saving()" 
                class="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                <span *ngIf="saving()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {{ 'COMMON.SAVE' | translate }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class TranslationsComponent implements OnInit {
  private api = inject(ApiService);
  private translateService = inject(TranslateService);

  items = signal<any[]>([]);
  filteredItems = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);

  searchQuery = '';
  selectedModule = 'ALL';
  selectedStatus = 'ALL';

  // Toast feedback
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  // Single Item Modal
  isModalOpen = signal(false);
  isEditing = signal(false);
  currentForm: any = {
    id: null,
    translationKey: '',
    englishText: '',
    arabicText: '',
    module: 'Common',
    description: '',
    isActive: 'ACTIVE'
  };

  // Batch Import Modal State
  isImportModalOpen = signal(false);
  importMode = 'UPSERT'; // 'UPSERT' or 'NEW_ONLY'
  dragOver = signal(false);
  importFileName = signal<string>('');
  importFileSize = signal<string>('');
  parsedItems = signal<ParsedImportItem[]>([]);
  previewSearchQuery = '';
  importing = signal(false);
  importErrorMsg = signal<string | null>(null);

  // Stats computed
  totalKeys = computed(() => this.items().length);
  activeKeys = computed(() => this.items().filter(i => (i.isActive || i.is_active) === 'ACTIVE').length);
  englishCount = computed(() => this.items().filter(i => !!(i.englishText || i.english_text)).length);
  arabicCount = computed(() => this.items().filter(i => !!(i.arabicText || i.arabic_text)).length);

  availableModules = computed(() => {
    const set = new Set<string>();
    for (const it of this.items()) {
      if (it.module) set.add(it.module);
    }
    return Array.from(set).sort();
  });

  // Import preview computed stats
  newKeysCount = computed(() => this.parsedItems().filter(i => i.actionStatus === 'NEW').length);
  updateKeysCount = computed(() => this.parsedItems().filter(i => i.actionStatus === 'UPDATE').length);
  invalidKeysCount = computed(() => this.parsedItems().filter(i => i.actionStatus === 'INVALID').length);
  validImportCount = computed(() => this.parsedItems().filter(i => i.actionStatus === 'NEW' || i.actionStatus === 'UPDATE').length);

  filteredPreviewItems = computed(() => {
    let list = this.parsedItems();
    const q = this.previewSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(i => 
      i.translationKey.toLowerCase().includes(q) ||
      i.englishText.toLowerCase().includes(q) ||
      i.arabicText.toLowerCase().includes(q) ||
      i.module.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getAllTranslations().subscribe({
      next: (data) => {
        this.items.set(data || []);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching translations:', err);
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    let result = this.items();
    const query = this.searchQuery.toLowerCase().trim();

    if (query) {
      result = result.filter(item => {
        const key = (item.translationKey || item.translation_key || '').toLowerCase();
        const en = (item.englishText || item.english_text || '').toLowerCase();
        const ar = (item.arabicText || item.arabic_text || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        return key.includes(query) || en.includes(query) || ar.includes(query) || desc.includes(query);
      });
    }

    if (this.selectedModule !== 'ALL') {
      result = result.filter(item => (item.module || '').toLowerCase() === this.selectedModule.toLowerCase());
    }

    if (this.selectedStatus !== 'ALL') {
      result = result.filter(item => (item.isActive || item.is_active) === this.selectedStatus);
    }

    this.filteredItems.set(result);
  }

  openAddModal() {
    this.isEditing.set(false);
    this.currentForm = {
      id: null,
      translationKey: '',
      englishText: '',
      arabicText: '',
      module: 'Common',
      description: '',
      isActive: 'ACTIVE'
    };
    this.isModalOpen.set(true);
  }

  openEditModal(item: any) {
    this.isEditing.set(true);
    this.currentForm = {
      id: item.id,
      translationKey: item.translationKey || item.translation_key,
      englishText: item.englishText || item.english_text,
      arabicText: item.arabicText || item.arabic_text,
      module: item.module || 'Common',
      description: item.description || '',
      isActive: item.isActive || item.is_active || 'ACTIVE'
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveModal() {
    if (!this.currentForm.translationKey || !this.currentForm.englishText) {
      alert('Please provide a translation key and English text.');
      return;
    }

    this.saving.set(true);
    this.api.createOrUpdateTranslation(this.currentForm).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.load();
        this.translateService.reloadCurrent();
        this.showToast('Translation key successfully saved in Database.', 'success');
      },
      error: (err) => {
        console.error('Error saving translation:', err);
        alert('Error saving translation: ' + (err.error?.error || err.message));
        this.saving.set(false);
      }
    });
  }

  deleteItem(item: any) {
    const key = item.translationKey || item.translation_key;
    const confirmPrompt = this.translateService.translate('TRANS.CONFIRM_DELETE');
    if (confirm(confirmPrompt || `Are you sure you want to delete translation '${key}'?`)) {
      this.api.deleteTranslation(item.id || key).subscribe({
        next: () => {
          this.load();
          this.translateService.reloadCurrent();
          this.showToast(`Translation '${key}' deleted successfully.`, 'success');
        },
        error: (err) => {
          console.error('Error deleting translation:', err);
          alert('Error deleting translation: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  // =========================================================
  // IMPORT MODAL & FILE PARSING METHODS
  // =========================================================
  openImportModal() {
    this.clearFile();
    this.isImportModalOpen.set(true);
  }

  closeImportModal() {
    this.isImportModalOpen.set(false);
    this.clearFile();
  }

  clearFile() {
    this.importFileName.set('');
    this.importFileSize.set('');
    this.parsedItems.set([]);
    this.importErrorMsg.set(null);
    this.previewSearchQuery = '';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver.set(false);
  }

  onFileDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(e: any) {
    const files = e.target.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  processFile(file: File) {
    this.importErrorMsg.set(null);
    this.importFileName.set(file.name);
    this.importFileSize.set(`${(file.size / 1024).toFixed(1)} KB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    if (ext === 'xlsx' || ext === 'xls') {
      reader.onload = (evt: any) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          this.parseTabularRows(rawRows);
        } catch (err: any) {
          this.importErrorMsg.set(`Failed to parse Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === 'csv') {
      reader.onload = (evt: any) => {
        try {
          const text = evt.target.result as string;
          const rawRows = this.parseCsvToRows(text);
          this.parseTabularRows(rawRows);
        } catch (err: any) {
          this.importErrorMsg.set(`Failed to parse CSV file: ${err.message}`);
        }
      };
      reader.readAsText(file, 'utf-8');
    } else if (ext === 'json') {
      reader.onload = (evt: any) => {
        try {
          const text = evt.target.result as string;
          const jsonArray = JSON.parse(text);
          if (!Array.isArray(jsonArray)) {
            throw new Error('JSON file must contain an array of translation objects.');
          }
          this.parseJsonObjects(jsonArray);
        } catch (err: any) {
          this.importErrorMsg.set(`Failed to parse JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file, 'utf-8');
    } else {
      this.importErrorMsg.set('Unsupported file format. Please upload an .xlsx, .csv, or .json file.');
    }
  }

  /**
   * Universal parser for 2D spreadsheet/CSV rows.
   * Auto-detects header row (skipping metadata if present in export format)
   * and maps columns matching both English and Arabic header labels.
   */
  parseTabularRows(rows: any[][]) {
    if (!rows || rows.length === 0) {
      this.importErrorMsg.set('The uploaded spreadsheet contains no rows.');
      return;
    }

    // 1. Locate the header row index
    let headerRowIdx = -1;
    const headerCandidates = [
      'translation key', 'translation_key', 'key', 'مفتاح الترجمة', 'مفتاح',
      'english text', 'english_text', 'النص الإنجليزي',
      'arabic text', 'arabic_text', 'النص العربي',
      'module', 'الوحدة'
    ];

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const joined = row.map(cell => String(cell || '').toLowerCase().trim()).join(' | ');
      const matchCount = headerCandidates.filter(c => joined.includes(c)).length;
      if (matchCount >= 2) {
        headerRowIdx = r;
        break;
      }
    }

    // Default to row 0 if no metadata block found
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
    }

    const headerRow = rows[headerRowIdx].map(cell => String(cell || '').trim());
    const colMap: Record<string, number> = {};

    headerRow.forEach((h, idx) => {
      const clean = h.toLowerCase().replace(/[\s_\-\/]+/g, '');
      if (clean.includes('translationkey') || clean.includes('key') || clean.includes('مفتاحالترجمة') || clean.includes('مفتاح')) {
        colMap['translationKey'] = idx;
      } else if (clean.includes('englishtext') || clean.includes('english') || clean.includes('النصالإنجليزي') || clean.includes('إنجليزي')) {
        colMap['englishText'] = idx;
      } else if (clean.includes('arabictext') || clean.includes('arabic') || clean.includes('النصالعربي') || clean.includes('عربي')) {
        colMap['arabicText'] = idx;
      } else if (clean.includes('module') || clean.includes('الوحدة') || clean.includes('القسم')) {
        colMap['module'] = idx;
      } else if (clean.includes('status') || clean.includes('isactive') || clean.includes('الحالة')) {
        colMap['isActive'] = idx;
      } else if (clean.includes('description') || clean.includes('desc') || clean.includes('الوصف') || clean.includes('السياق')) {
        colMap['description'] = idx;
      } else if (clean === 'id' || clean.includes('الرمز')) {
        colMap['id'] = idx;
      }
    });

    if (colMap['translationKey'] === undefined || colMap['englishText'] === undefined) {
      this.importErrorMsg.set('Could not locate required "Translation Key" and "English Text" headers in file.');
      return;
    }

    // 2. Parse data rows
    const dataRows = rows.slice(headerRowIdx + 1);
    const parsed: ParsedImportItem[] = [];

    // Map of existing keys for quick conflict detection
    const existingKeyMap = new Set<string>(
      this.items().map(i => (i.translationKey || i.translation_key || '').toUpperCase().trim())
    );

    for (const r of dataRows) {
      if (!Array.isArray(r) || r.length === 0 || r.every(cell => String(cell || '').trim() === '')) {
        continue; // Skip blank rows
      }

      const rawKey = r[colMap['translationKey']];
      const rawEn = r[colMap['englishText']];
      const rawAr = colMap['arabicText'] !== undefined ? r[colMap['arabicText']] : '';
      const rawMod = colMap['module'] !== undefined ? r[colMap['module']] : '';
      const rawStatus = colMap['isActive'] !== undefined ? r[colMap['isActive']] : 'ACTIVE';
      const rawDesc = colMap['description'] !== undefined ? r[colMap['description']] : '';
      const rawId = colMap['id'] !== undefined ? r[colMap['id']] : undefined;

      const key = String(rawKey || '').trim().toUpperCase();
      const en = String(rawEn !== undefined && rawEn !== null ? rawEn : '').trim();
      const ar = String(rawAr !== undefined && rawAr !== null && String(rawAr).trim() !== '' ? rawAr : en).trim();
      const mod = this.inferModule(key, String(rawMod || '').trim());
      const status: 'ACTIVE' | 'INACTIVE' = String(rawStatus || '').toUpperCase().includes('INACTIVE') ? 'INACTIVE' : 'ACTIVE';

      let actionStatus: 'NEW' | 'UPDATE' | 'INVALID' = 'NEW';
      let errorMsg: string | undefined = undefined;

      if (!key) {
        actionStatus = 'INVALID';
        errorMsg = 'Missing Translation Key';
      } else if (!en) {
        actionStatus = 'INVALID';
        errorMsg = 'Missing English Text';
      } else if (existingKeyMap.has(key)) {
        actionStatus = 'UPDATE';
      } else {
        actionStatus = 'NEW';
      }

      parsed.push({
        id: rawId ? String(rawId).trim() : undefined,
        translationKey: key,
        englishText: en,
        arabicText: ar,
        module: mod,
        description: rawDesc ? String(rawDesc).trim() : undefined,
        isActive: status,
        actionStatus,
        validationError: errorMsg
      });
    }

    if (parsed.length === 0) {
      this.importErrorMsg.set('No valid data rows found in the file.');
      return;
    }

    this.parsedItems.set(parsed);
  }

  parseJsonObjects(objects: any[]) {
    const parsed: ParsedImportItem[] = [];
    const existingKeyMap = new Set<string>(
      this.items().map(i => (i.translationKey || i.translation_key || '').toUpperCase().trim())
    );

    for (const obj of objects) {
      const rawKey = obj.translationKey || obj.translation_key || obj.key;
      const rawEn = obj.englishText || obj.english_text || obj.en;
      const rawAr = obj.arabicText || obj.arabic_text || obj.ar;
      const rawMod = obj.module;
      const rawStatus = obj.isActive || obj.is_active || obj.status || 'ACTIVE';
      const rawDesc = obj.description;
      const rawId = obj.id;

      const key = String(rawKey || '').trim().toUpperCase();
      const en = String(rawEn !== undefined && rawEn !== null ? rawEn : '').trim();
      const ar = String(rawAr !== undefined && rawAr !== null && String(rawAr).trim() !== '' ? rawAr : en).trim();
      const mod = this.inferModule(key, String(rawMod || '').trim());
      const status: 'ACTIVE' | 'INACTIVE' = String(rawStatus || '').toUpperCase().includes('INACTIVE') ? 'INACTIVE' : 'ACTIVE';

      let actionStatus: 'NEW' | 'UPDATE' | 'INVALID' = 'NEW';
      let errorMsg: string | undefined = undefined;

      if (!key) {
        actionStatus = 'INVALID';
        errorMsg = 'Missing Translation Key';
      } else if (!en) {
        actionStatus = 'INVALID';
        errorMsg = 'Missing English Text';
      } else if (existingKeyMap.has(key)) {
        actionStatus = 'UPDATE';
      } else {
        actionStatus = 'NEW';
      }

      parsed.push({
        id: rawId ? String(rawId).trim() : undefined,
        translationKey: key,
        englishText: en,
        arabicText: ar,
        module: mod,
        description: rawDesc ? String(rawDesc).trim() : undefined,
        isActive: status,
        actionStatus,
        validationError: errorMsg
      });
    }

    this.parsedItems.set(parsed);
  }

  /**
   * Helper CSV splitter that properly supports quoted cells containing commas.
   */
  parseCsvToRows(text: string): string[][] {
    // Remove UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1);
    }
    const lines = text.split(/\r\n|\n|\r/);
    const rows: string[][] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const cells: string[] = [];
      let inQuotes = false;
      let cell = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += char;
        }
      }
      cells.push(cell.trim());
      rows.push(cells);
    }
    return rows;
  }

  inferModule(key: string, providedModule?: string): string {
    if (providedModule && providedModule.trim() && providedModule.trim().toLowerCase() !== 'undefined') {
      return providedModule.trim();
    }
    const prefix = key.split('.')[0] || '';
    switch (prefix.toUpperCase()) {
      case 'NAV': return 'Navigation';
      case 'POS': return 'POS';
      case 'PRINTER': return 'Printer';
      case 'FORMAT': return 'Format';
      case 'BILLS':
      case 'BILLS_DUPLICATE':
      case 'BILLS_CANCEL': return 'Bills';
      case 'SHIFT':
      case 'SHIFT_CLOSE': return 'ShiftClose';
      case 'DAY':
      case 'DAY_CLOSE': return 'DayClose';
      case 'COMPANY': return 'Company';
      case 'BRANCH': return 'Branch';
      case 'LOCATION': return 'Location';
      case 'USER': return 'User';
      case 'RIGHTS': return 'UserRights';
      case 'CAR_MODEL': return 'CarModel';
      case 'CAR': return 'Fleet';
      case 'RATE': return 'RateSetup';
      case 'GRACE_PERIOD': return 'GracePeriod';
      case 'TRANS': return 'Translations';
      case 'MASTER_EXPORT':
      case 'EXPORT': return 'MasterExport';
      case 'REPORT': return 'Reports';
      case 'COMMON': return 'Common';
      default: return 'Common';
    }
  }

  /**
   * Generate & Download Sample Template in Excel (.xlsx) format
   */
  downloadExcelTemplate() {
    const headers = ['ID', 'Translation Key', 'English Text', 'Arabic Text', 'Module', 'Status', 'Description'];
    const sampleRows = [
      ['TRN-101', 'NAV.DASHBOARD', 'Dashboard', 'لوحة التحكم', 'Navigation', 'ACTIVE', 'Main dashboard menu item'],
      ['TRN-102', 'POS.START_RENTAL', 'Start Rental', 'بدء التأجير', 'POS', 'ACTIVE', 'Start rental action button'],
      ['TRN-103', 'SETTLEMENT.TOTAL_DUE', 'Total Due', 'المبلغ الإجمالي المستحق', 'Settlement', 'ACTIVE', 'Settlement total label'],
      ['TRN-104', 'COMMON.SAVE_CHANGES', 'Save Changes', 'حفظ التغييرات', 'Common', 'ACTIVE', 'Universal save button'],
    ];

    const wsData = [
      ['Kiddie Kruzzer Entertainment LLC'],
      ['Translations Master Template - Avenues Mall'],
      [`Template Generated: ${new Date().toISOString().slice(0, 10)}`],
      ['Total Sample Records: 4'],
      [], // Blank separator
      headers,
      ...sampleRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 32 },
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 35 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Translations');
    XLSX.writeFile(wb, 'Translations_Import_Template.xlsx');
  }

  /**
   * Generate & Download Sample Template in CSV (.csv) format with UTF-8 BOM
   */
  downloadCsvTemplate() {
    const headers = ['ID', 'Translation Key', 'English Text', 'Arabic Text', 'Module', 'Status', 'Description'];
    const sampleRows = [
      ['TRN-101', 'NAV.DASHBOARD', 'Dashboard', 'لوحة التحكم', 'Navigation', 'ACTIVE', 'Main dashboard menu item'],
      ['TRN-102', 'POS.START_RENTAL', 'Start Rental', 'بدء التأجير', 'POS', 'ACTIVE', 'Start rental action button'],
      ['TRN-103', 'SETTLEMENT.TOTAL_DUE', 'Total Due', 'المبلغ الإجمالي المستحق', 'Settlement', 'ACTIVE', 'Settlement total label'],
      ['TRN-104', 'COMMON.SAVE_CHANGES', 'Save Changes', 'حفظ التغييرات', 'Common', 'ACTIVE', 'Universal save button'],
    ];

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCsv).join(','),
      ...sampleRows.map(row => row.map(escapeCsv).join(','))
    ];

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Translations_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Send valid parsed translation items to Database backend API
   */
  executeImport() {
    const validItems = this.parsedItems().filter(i => i.actionStatus === 'NEW' || i.actionStatus === 'UPDATE');
    if (validItems.length === 0) {
      alert('No valid translation items to import.');
      return;
    }

    this.importing.set(true);
    this.api.importTranslations({ items: validItems, mode: this.importMode }).subscribe({
      next: (res) => {
        this.importing.set(false);
        this.closeImportModal();
        this.load();
        this.translateService.reloadCurrent();
        this.showToast(
          res.message || `Successfully imported ${validItems.length} translations into Database!`,
          'success'
        );
      },
      error: (err) => {
        console.error('Import failed:', err);
        this.importing.set(false);
        this.importErrorMsg.set(err.error?.error || err.message || 'Import failed. Please verify the file content.');
      }
    });
  }
}
