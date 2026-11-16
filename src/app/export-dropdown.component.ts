import { Component, Input, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService, MasterColumn } from './export.service';
import { PrintService } from './print.service';
import { TranslatePipe } from './translate.pipe';
import { TranslateService } from './translate.service';

@Component({
  selector: 'app-export-dropdown',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="relative inline-block text-left" (click)="$event.stopPropagation()">
      <button 
        type="button"
        (click)="toggleMenu()"
        class="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-lg shadow-sm transition cursor-pointer">
        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
        </svg>
        <span>{{ 'EXPORT.BUTTON' | translate }}</span>
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div 
        *ngIf="isOpen()"
        class="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black/5 divide-y divide-slate-100 z-50 overflow-hidden text-xs">
        
        <div class="p-2 bg-slate-50/75 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>{{ 'EXPORT.OPTIONS_TITLE' | translate }}</span>
          <span class="text-indigo-600 font-mono">{{ items.length }} {{ 'COMMON.ROWS' | translate }}</span>
        </div>

        <div class="py-1">
          <!-- Excel Export -->
          <button 
            type="button"
            (click)="exportExcel()"
            class="group flex items-center gap-2.5 w-full px-4 py-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer text-left">
            <span class="p-1 rounded bg-emerald-100 text-emerald-600 text-xs font-bold">XLS</span>
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 group-hover:text-emerald-700">{{ 'EXPORT.EXCEL' | translate }}</span>
              <span class="text-[10px] text-slate-400">Microsoft Excel (.xlsx)</span>
            </div>
          </button>

          <!-- PDF Export -->
          <button 
            type="button"
            (click)="exportPdf()"
            class="group flex items-center gap-2.5 w-full px-4 py-2.5 text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer text-left">
            <span class="p-1 rounded bg-rose-100 text-rose-600 text-xs font-bold">PDF</span>
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 group-hover:text-rose-700">{{ 'EXPORT.PDF' | translate }}</span>
              <span class="text-[10px] text-slate-400">Document Report (.pdf)</span>
            </div>
          </button>

          <!-- CSV Export -->
          <button 
            type="button"
            (click)="exportCsv()"
            class="group flex items-center gap-2.5 w-full px-4 py-2.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer text-left">
            <span class="p-1 rounded bg-blue-100 text-blue-600 text-xs font-bold">CSV</span>
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 group-hover:text-blue-700">{{ 'EXPORT.CSV' | translate }}</span>
              <span class="text-[10px] text-slate-400">Comma-Separated (.csv)</span>
            </div>
          </button>
        </div>

        <div class="py-1">
          <!-- Standard Print -->
          <button 
            type="button"
            (click)="printStandard()"
            class="group flex items-center gap-2.5 w-full px-4 py-2.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer text-left">
            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
            </svg>
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 group-hover:text-indigo-700">{{ 'PRINT.PRINT_A4' | translate }}</span>
              <span class="text-[10px] text-slate-400">{{ 'PRINT.STANDARD_A4_DESC' | translate }}</span>
            </div>
          </button>

          <!-- Thermal Print Summary -->
          <button 
            type="button"
            (click)="printThermal()"
            class="group flex items-center gap-2.5 w-full px-4 py-2.5 text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer text-left">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 group-hover:text-amber-700">{{ 'PRINT.THERMAL_PRINT' | translate }}</span>
              <span class="text-[10px] text-slate-400">80mm POS Thermal Roll</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ExportDropdownComponent {
  private exportService = inject(ExportService);
  private printService = inject(PrintService);
  private translateService = inject(TranslateService);
  private elementRef = inject(ElementRef);

  @Input() masterKey: string = '';
  @Input() title: string = 'Master Data';
  @Input() items: any[] = [];
  @Input() columns: MasterColumn[] = [];
  @Input() filename: string = 'Master_Export';

  isOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleMenu() {
    this.isOpen.update((v) => !v);
  }

  private getEffectiveColumns(): MasterColumn[] {
    if (this.columns && this.columns.length > 0) {
      return this.columns;
    }
    if (this.masterKey && this.exportService.masters[this.masterKey]) {
      return this.exportService.masters[this.masterKey].columns;
    }
    return [];
  }

  exportExcel() {
    this.isOpen.set(false);
    const cols = this.getEffectiveColumns();
    this.exportService.exportToExcel(this.items, cols, this.filename, this.title);
  }

  exportPdf() {
    this.isOpen.set(false);
    const cols = this.getEffectiveColumns();
    this.exportService.exportToPdf(this.items, cols, this.filename, this.title);
  }

  exportCsv() {
    this.isOpen.set(false);
    const cols = this.getEffectiveColumns();
    this.exportService.exportToCsv(this.items, cols, this.filename);
  }

  printStandard() {
    this.isOpen.set(false);
    const cols = this.getEffectiveColumns();
    this.printService.printMasterList(this.title, this.items, cols, false);
  }

  printThermal() {
    this.isOpen.set(false);
    const cols = this.getEffectiveColumns();
    this.printService.printMasterList(this.title, this.items, cols, true, '80mm');
  }
}
