import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { ExportDropdownComponent } from './export-dropdown.component';

@Component({
  selector: 'app-car',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExportDropdownComponent],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">{{ 'CAR.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">{{ 'CAR.SUBTITLE' | translate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <app-export-dropdown 
            [masterKey]="'car'" 
            [title]="'CAR.TITLE' | translate" 
            [items]="filteredItems()" 
            [filename]="'Car_Fleet_Master'">
          </app-export-dropdown>
          
          <button (click)="load()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm cursor-pointer" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          
          <button (click)="openForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2 cursor-pointer text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            {{ 'CAR.ADD_TITLE' | translate }}
          </button>
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
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-500">{{ 'COMMON.STATUS' | translate }}:</label>
            <select 
              [(ngModel)]="statusFilter" 
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="ALL">{{ 'COMMON.ALL' | translate }}</option>
              <option value="Available">Available</option>
              <option value="Inactive">Inactive</option>
              <option value="Rented">Rented</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          <span class="text-xs font-bold text-slate-400">
            {{ filteredItems().length }} {{ 'COMMON.RECORDS' | translate }}
          </span>
        </div>
      </div>
      
      <!-- Table & Form -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div *ngIf="isFormOpen()" class="bg-slate-50 p-6 border-b border-slate-200">
          <h3 class="text-sm font-bold text-slate-800 mb-4">{{ (editingId() ? 'CAR.EDIT_TITLE' : 'CAR.ADD_TITLE') | translate }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'CAR.NUMBER' | translate }}</label>
              <input type="text" [(ngModel)]="formData.carNo" [placeholder]="'CAR.NUMBER_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'CAR.MODEL_SELECT' | translate }}</label>
              <select [(ngModel)]="formData.model" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option *ngFor="let m of models()" [value]="m.name">{{ m.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'CAR.COLOR' | translate }}</label>
              <div class="flex items-center gap-1.5">
                <input type="text" [(ngModel)]="formData.color" placeholder="e.g. Red, Blue, Pink" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1">
                <span *ngIf="formData.color" class="w-6 h-6 rounded-full border border-slate-300 shadow-2xs shrink-0" [style.backgroundColor]="getCarColorCode(formData.color)"></span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'COMMON.STATUS' | translate }}</label>
              <select [(ngModel)]="formData.status" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="Available">Available</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button (click)="closeForm()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded cursor-pointer">{{ 'COMMON.CANCEL' | translate }}</button>
            <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <span *ngIf="saving()" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ 'COMMON.SAVE_TO_POSTGRES' | translate }}
            </button>
          </div>
        </div>
    
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="px-6 py-4">{{ 'COMMON.ID' | translate }}</th>
                <th class="px-6 py-4">{{ 'CAR.NUMBER' | translate }}</th>
                <th class="px-6 py-4">{{ 'CAR.MODEL_SELECT' | translate }}</th>
                <th class="px-6 py-4">{{ 'CAR.COLOR' | translate }}</th>
                <th class="px-6 py-4">{{ 'COMMON.STATUS' | translate }}</th>
                <th class="px-6 py-4 text-right">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of filteredItems()" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono font-medium text-slate-900">{{ item.id }}</td>
                <td class="px-6 py-4 font-bold text-slate-800">#{{ item.carNo }}</td>
                <td class="px-6 py-4 font-medium text-slate-800">{{ item.model }}</td>
                <td class="px-6 py-4 text-xs">
                  <span *ngIf="item.color" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-medium text-slate-700">
                    <span class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" [style.backgroundColor]="getCarColorCode(item.color)"></span>
                    <span>{{ item.color }}</span>
                  </span>
                  <span *ngIf="!item.color" class="text-slate-400 font-normal italic">-</span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded text-[10px] font-bold" 
                        [ngClass]="item.status === 'Available' ? 'bg-green-100 text-green-700' : (item.status === 'Rented' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700')">
                    {{ item.status === 'Available' ? ('POS.READY' | translate) : (item.status === 'Rented' ? ('POS.RENTED_BADGE' | translate) : item.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button (click)="edit(item)" class="text-indigo-600 hover:text-indigo-800 font-medium mr-3 cursor-pointer">{{ 'COMMON.EDIT' | translate }}</button>
                  <button (click)="remove(item.id)" class="text-red-500 hover:text-red-700 font-medium cursor-pointer">{{ 'COMMON.DELETE' | translate }}</button>
                </td>
              </tr>
              <tr *ngIf="filteredItems().length === 0 && !loading()">
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
    </div>
  `
})
export class CarComponent implements OnInit {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);

  items = signal<any[]>([]);
  models = signal<any[]>([]);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');

  filteredItems = computed(() => {
    let list = this.items();
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();

    if (st !== 'ALL') {
      list = list.filter(i => (i.status || '').toUpperCase() === st.toUpperCase());
    }
    if (q) {
      list = list.filter(i => 
        (i.carNo && i.carNo.toLowerCase().includes(q)) ||
        (i.model && i.model.toLowerCase().includes(q)) ||
        (i.color && i.color.toLowerCase().includes(q)) ||
        (i.id && i.id.toLowerCase().includes(q))
      );
    }
    return list.slice().sort((a, b) => {
      const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
    });
  });

  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  
  formData: any = {};

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
  
  ngOnInit() {
    this.load();
    this.api.getCarModels().subscribe({
      next: (m) => this.models.set(m || [])
    });
  }

  load() {
    this.loading.set(true);
    this.api.getCars().subscribe({
      next: (data) => {
        const sorted = (data || []).slice().sort((a, b) => {
          const numA = parseInt(String(a.carNo || a.car_no || '0').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.carNo || b.car_no || '0').replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return String(a.carNo || a.car_no || '').localeCompare(String(b.carNo || b.car_no || ''));
        });
        this.items.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching car data:', err);
        this.loading.set(false);
      }
    });
  }

  openForm() {
    const defaultModel = this.models()[0]?.name || 'Single Seater';
    this.formData = { status: 'Available', model: defaultModel, color: '' };
    this.editingId.set(null);
    this.isFormOpen.set(true);
  }
  
  edit(item: any) {
    this.formData = { ...item };
    if (this.formData.status === 'Rented' || this.formData.status === 'Maintenance') {
      this.formData.status = 'Available';
    }
    this.editingId.set(item.id);
    this.isFormOpen.set(true);
  }
  
  closeForm() {
    this.isFormOpen.set(false);
    this.formData = {};
  }
  
  save() {
    this.saving.set(true);
    const payload = this.editingId() 
      ? { ...this.formData, id: this.editingId() } 
      : { ...this.formData };

    this.api.createCar(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.load();
      },
      error: (err) => {
        console.error('Error saving record to Database:', err);
        alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
        this.saving.set(false);
      }
    });
  }
  
  remove(id: string) {
    if (confirm(this.translateService.translate('CAR.CONFIRM_DELETE'))) {
      this.api.deleteCar(id).subscribe({
        next: () => {
          this.load();
        },
        error: (err) => {
          console.error('Error deleting record from Database:', err);
          alert(this.translateService.translate('MESSAGE.SERVER_ERROR') + ': ' + (err.error?.error || err.message));
        }
      });
    }
  }
}
