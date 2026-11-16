import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ExportService, MasterConfig, MasterColumn } from './export.service';
import { PrintService, ThermalPaperWidth } from './print.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';

@Component({
  selector: 'app-master-export',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
      
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">{{ 'MASTER_EXPORT.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">{{ 'MASTER_EXPORT.SUBTITLE' | translate }}</p>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="loadMasterData()" class="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm transition cursor-pointer" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      <!-- Controls Panel -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
        
        <!-- Top Controls: Master Selector & Filters -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <!-- Master Selection -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>{{ 'MASTER_EXPORT.SELECT_MASTER' | translate }}</span>
              <span class="text-indigo-600 font-bold">*</span>
            </label>
            <select 
              [(ngModel)]="selectedMasterKey" 
              (change)="onMasterChange()"
              class="border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
              <option *ngFor="let m of masterList" [value]="m.key">
                {{ isArabic() && m.nameAr ? m.nameAr : m.name }}
              </option>
            </select>
          </div>

          <!-- Search Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ 'COMMON.SEARCH' | translate }}</label>
            <div class="relative">
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                (input)="applyFilters()" 
                [placeholder]="'MASTER_EXPORT.FILTER_PLACEHOLDER' | translate" 
                class="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition">
            </div>
          </div>

          <!-- Status Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ 'COMMON.STATUS' | translate }}</label>
            <select 
              [(ngModel)]="statusFilter" 
              (change)="applyFilters()" 
              class="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
              <option value="INACTIVE">{{ 'COMMON.INACTIVE' | translate }}</option>
              <option value="Available">Available</option>
              <option value="Rented">Rented</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <!-- Processing Mode: Client vs Server -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ 'MASTER_EXPORT.PROCESSING_MODE' | translate }}</label>
            <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button 
                type="button" 
                (click)="useServerProcessing.set(false)"
                [class]="!useServerProcessing() ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                class="flex-1 py-1.5 px-2 rounded-md transition cursor-pointer text-center">
                {{ 'MASTER_EXPORT.CLIENT_FAST' | translate }}
              </button>
              <button 
                type="button" 
                (click)="useServerProcessing.set(true)"
                [class]="useServerProcessing() ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                class="flex-1 py-1.5 px-2 rounded-md transition cursor-pointer text-center">
                {{ 'MASTER_EXPORT.SERVER_LARGE' | translate }}
              </button>
            </div>
          </div>

        </div>

        <!-- Column Customizer (Checkboxes) -->
        <div class="border-t border-slate-200 pt-4 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">{{ 'MASTER_EXPORT.SELECT_COLUMNS' | translate }}:</span>
            <div class="flex items-center gap-3 text-xs">
              <button (click)="selectAllColumns()" class="text-indigo-600 hover:underline font-bold cursor-pointer">{{ 'COMMON.SELECT_ALL' | translate }}</button>
              <span class="text-slate-300">|</span>
              <button (click)="deselectAllColumns()" class="text-slate-500 hover:underline font-bold cursor-pointer">{{ 'COMMON.DESELECT_ALL' | translate }}</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2.5 pt-1">
            <label 
              *ngFor="let col of currentMasterConfig()?.columns" 
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition select-none"
              [ngClass]="isColumnSelected(col.key) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'">
              <input 
                type="checkbox" 
                [checked]="isColumnSelected(col.key)" 
                (change)="toggleColumn(col.key)"
                class="rounded text-indigo-600 focus:ring-indigo-500">
              <span>{{ isArabic() && col.labelAr ? col.labelAr : col.label }}</span>
            </label>
          </div>
        </div>

        <!-- Export Action Buttons -->
        <div class="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4 text-xs font-bold text-slate-500">
            <span>{{ 'COMMON.TOTAL_COUNT' | translate }}: <strong class="text-slate-800">{{ rawItems().length }}</strong></span>
            <span>{{ 'COMMON.FILTERED_COUNT' | translate }}: <strong class="text-indigo-600">{{ filteredItems().length }}</strong></span>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Excel Export Button -->
            <button 
              type="button" 
              (click)="exportExcel()" 
              [disabled]="filteredItems().length === 0 || loading()"
              class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>{{ 'EXPORT.EXCEL' | translate }} (.xlsx)</span>
            </button>

            <!-- PDF Export Button -->
            <button 
              type="button" 
              (click)="exportPdf()" 
              [disabled]="filteredItems().length === 0 || loading()"
              class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span>{{ 'EXPORT.PDF' | translate }} (.pdf)</span>
            </button>

            <!-- CSV Export Button -->
            <button 
              type="button" 
              (click)="exportCsv()" 
              [disabled]="filteredItems().length === 0 || loading()"
              class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>{{ 'EXPORT.CSV' | translate }} (.csv)</span>
            </button>

            <!-- Standard Print Button -->
            <button 
              type="button" 
              (click)="printStandard()" 
              [disabled]="filteredItems().length === 0 || loading()"
              class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              <span>{{ 'PRINT.PRINT_A4' | translate }}</span>
            </button>

            <!-- Thermal Print Button -->
            <button 
              type="button" 
              (click)="printThermal('80mm')" 
              [disabled]="filteredItems().length === 0 || loading()"
              class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>{{ 'PRINT.THERMAL_PRINT' | translate }} (80mm)</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Live Data Preview Table -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-slate-800">{{ 'MASTER_EXPORT.PREVIEW_TITLE' | translate }}</h3>
            <span class="text-xs text-slate-400">({{ filteredItems().length }} {{ 'COMMON.ROWS' | translate }})</span>
          </div>
          <span *ngIf="loading()" class="text-xs text-indigo-600 font-bold flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            {{ 'COMMON.LOADING' | translate }}...
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="px-6 py-3.5 w-12">#</th>
                <th *ngFor="let col of activeSelectedColumns()" class="px-6 py-3.5">
                  {{ isArabic() && col.labelAr ? col.labelAr : col.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of previewItems(); let i = index" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-3.5 font-mono text-xs text-slate-400">{{ i + 1 }}</td>
                <td *ngFor="let col of activeSelectedColumns()" class="px-6 py-3.5">
                  <ng-container [ngSwitch]="col.type">
                    <span *ngSwitchCase="'status'" 
                          class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="item[col.key] === 'ACTIVE' || item[col.key] === 'Available' ? 'bg-green-100 text-green-700' : (item[col.key] === 'Rented' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700')">
                      {{ item[col.key] }}
                    </span>
                    <span *ngSwitchCase="'currency'" class="font-mono font-bold text-slate-900">
                      {{ item[col.key] }} KWD
                    </span>
                    <span *ngSwitchDefault class="font-medium text-slate-800">
                      {{ col.key === 'password' ? '******' : (item[col.key] || item[col.key.toLowerCase()] || '-') }}
                    </span>
                  </ng-container>
                </td>
              </tr>

              <tr *ngIf="filteredItems().length === 0 && !loading()">
                <td [attr.colspan]="activeSelectedColumns().length + 1" class="px-6 py-12 text-center text-slate-400">
                  {{ 'COMMON.NO_RECORDS' | translate }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="filteredItems().length > 100" class="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          {{ 'MASTER_EXPORT.SHOWING_FIRST_100' | translate:{count: filteredItems().length} }}
        </div>
      </div>

    </div>
  `
})
export class MasterExportComponent implements OnInit {
  private http = inject(HttpClient);
  private exportService = inject(ExportService);
  private printService = inject(PrintService);
  private translateService = inject(TranslateService);

  masterList: MasterConfig[] = [];
  selectedMasterKey: string = 'company';
  
  rawItems = signal<any[]>([]);
  filteredItems = signal<any[]>([]);
  loading = signal<boolean>(false);
  
  searchQuery: string = '';
  statusFilter: string = 'ALL';
  selectedColumnKeys = signal<string[]>([]);
  useServerProcessing = signal<boolean>(false);

  currentMasterConfig = computed(() => this.exportService.getMasterConfig(this.selectedMasterKey));

  activeSelectedColumns = computed(() => {
    const config = this.currentMasterConfig();
    if (!config) return [];
    const keys = this.selectedColumnKeys();
    return config.columns.filter(c => keys.includes(c.key));
  });

  previewItems = computed(() => {
    return this.filteredItems().slice(0, 100);
  });

  isArabic = computed(() => this.translateService.currentLang() === 'ar');

  ngOnInit() {
    this.masterList = this.exportService.getAllMasterConfigs();
    this.onMasterChange();
  }

  onMasterChange() {
    const config = this.currentMasterConfig();
    if (config) {
      this.selectedColumnKeys.set(config.columns.map(c => c.key));
    }
    this.searchQuery = '';
    this.statusFilter = 'ALL';
    this.loadMasterData();
  }

  loadMasterData() {
    const config = this.currentMasterConfig();
    if (!config) return;

    this.loading.set(true);
    this.http.get<any[]>(config.endpoint).subscribe({
      next: (data) => {
        this.rawItems.set(data || []);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        console.error(`Error loading data for ${this.selectedMasterKey}:`, err);
        this.rawItems.set([]);
        this.filteredItems.set([]);
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    let items = [...this.rawItems()];
    const query = this.searchQuery.toLowerCase().trim();
    const status = this.statusFilter;

    if (status !== 'ALL') {
      items = items.filter(item => {
        const itemStatus = item.status || item.isActive || item.is_active;
        return itemStatus && String(itemStatus).toUpperCase() === status.toUpperCase();
      });
    }

    if (query) {
      items = items.filter(item => {
        return Object.values(item).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    this.filteredItems.set(items);
  }

  isColumnSelected(key: string): boolean {
    return this.selectedColumnKeys().includes(key);
  }

  toggleColumn(key: string) {
    const current = this.selectedColumnKeys();
    if (current.includes(key)) {
      if (current.length > 1) {
        this.selectedColumnKeys.set(current.filter(k => k !== key));
      }
    } else {
      this.selectedColumnKeys.set([...current, key]);
    }
  }

  selectAllColumns() {
    const config = this.currentMasterConfig();
    if (config) {
      this.selectedColumnKeys.set(config.columns.map(c => c.key));
    }
  }

  deselectAllColumns() {
    const config = this.currentMasterConfig();
    if (config && config.columns.length > 0) {
      // Keep at least the first column selected
      this.selectedColumnKeys.set([config.columns[0].key]);
    }
  }

  private getFilename(): string {
    const config = this.currentMasterConfig();
    const name = config?.name ? config.name.replace(/\s+/g, '_') : 'Master_Export';
    return name;
  }

  private getTitle(): string {
    const config = this.currentMasterConfig();
    return this.isArabic() && config?.nameAr ? config.nameAr : (config?.name || 'Master Data');
  }

  exportExcel() {
    if (this.useServerProcessing()) {
      window.open(`/api/export/${this.selectedMasterKey}?format=xlsx&search=${encodeURIComponent(this.searchQuery)}&status=${encodeURIComponent(this.statusFilter)}`, '_blank');
      return;
    }
    const cols = this.activeSelectedColumns();
    this.exportService.exportToExcel(this.filteredItems(), cols, this.getFilename(), this.getTitle());
  }

  exportPdf() {
    const cols = this.activeSelectedColumns();
    this.exportService.exportToPdf(this.filteredItems(), cols, this.getFilename(), this.getTitle());
  }

  exportCsv() {
    if (this.useServerProcessing()) {
      window.open(`/api/export/${this.selectedMasterKey}?format=csv&search=${encodeURIComponent(this.searchQuery)}&status=${encodeURIComponent(this.statusFilter)}`, '_blank');
      return;
    }
    const cols = this.activeSelectedColumns();
    this.exportService.exportToCsv(this.filteredItems(), cols, this.getFilename());
  }

  printStandard() {
    const cols = this.activeSelectedColumns();
    this.printService.printMasterList(this.getTitle(), this.filteredItems(), cols, false);
  }

  printThermal(paperWidth: ThermalPaperWidth = '80mm') {
    const cols = this.activeSelectedColumns();
    this.printService.printMasterList(this.getTitle(), this.filteredItems(), cols, true, paperWidth);
  }
}
