import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { ExportDropdownComponent } from './export-dropdown.component';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExportDropdownComponent],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">{{ 'BRANCH.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">{{ 'BRANCH.SUBTITLE' | translate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <app-export-dropdown 
            [masterKey]="'branch'" 
            [title]="'BRANCH.TITLE' | translate" 
            [items]="filteredItems()" 
            [filename]="'Branch_Master'">
          </app-export-dropdown>
          
          <button (click)="load()" class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm cursor-pointer" [title]="'COMMON.REFRESH' | translate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
          
          <button (click)="openForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2 cursor-pointer text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            {{ 'BRANCH.ADD_TITLE' | translate }}
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

        <div class="flex items-center gap-3 w-full md:w-auto justify-end">
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
            {{ filteredItems().length }} {{ 'COMMON.RECORDS' | translate }}
          </span>
        </div>
      </div>
      
      <!-- Table & Form -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div *ngIf="isFormOpen()" class="bg-slate-50 p-6 border-b border-slate-200">
          <h3 class="text-sm font-bold text-slate-800 mb-4">{{ (editingId() ? 'BRANCH.EDIT_TITLE' : 'BRANCH.ADD_TITLE') | translate }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'BRANCH.NAME' | translate }}</label>
              <input type="text" [(ngModel)]="formData.name" [placeholder]="'BRANCH.NAME_PLACEHOLDER' | translate" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'BRANCH.COMPANY_SELECT' | translate }}</label>
              <select [(ngModel)]="formData.company" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option *ngFor="let c of companies()" [value]="c.name">{{ c.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-500 uppercase">{{ 'COMMON.STATUS' | translate }}</label>
              <select [(ngModel)]="formData.status" class="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="ACTIVE">{{ 'COMMON.ACTIVE' | translate }}</option>
                <option value="INACTIVE">{{ 'COMMON.INACTIVE' | translate }}</option>
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
                <th class="px-6 py-4">{{ 'BRANCH.NAME' | translate }}</th>
                <th class="px-6 py-4">{{ 'BRANCH.COMPANY_SELECT' | translate }}</th>
                <th class="px-6 py-4">{{ 'COMMON.STATUS' | translate }}</th>
                <th class="px-6 py-4 text-right">{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of filteredItems()" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono font-medium text-slate-900">{{ item.id }}</td>
                <td class="px-6 py-4 font-semibold text-slate-800">{{ item.name }}</td>
                <td class="px-6 py-4 font-semibold text-slate-800">{{ item.company }}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded text-[10px] font-bold" [ngClass]="item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'">
                    {{ (item.status === 'ACTIVE' ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
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
export class BranchComponent implements OnInit {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);

  items = signal<any[]>([]);
  companies = signal<any[]>([]);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');

  filteredItems = computed(() => {
    let list = this.items();
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();

    if (st !== 'ALL') {
      list = list.filter(i => (i.status || '').toUpperCase() === st);
    }
    if (q) {
      list = list.filter(i => 
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.company && i.company.toLowerCase().includes(q)) ||
        (i.id && i.id.toLowerCase().includes(q))
      );
    }
    return list;
  });

  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  
  formData: any = {};
  
  ngOnInit() {
    this.load();
    this.api.getCompanies().subscribe({
      next: (c) => this.companies.set(c || [])
    });
  }

  load() {
    this.loading.set(true);
    this.api.getBranches().subscribe({
      next: (data) => {
        this.items.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching branch data:', err);
        this.loading.set(false);
      }
    });
  }

  openForm() {
    const defaultCompany = this.companies()[0]?.name || 'Your Events Management Company';
    this.formData = { status: 'ACTIVE', company: defaultCompany };
    this.editingId.set(null);
    this.isFormOpen.set(true);
  }
  
  edit(item: any) {
    this.formData = { ...item };
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

    this.api.createBranch(payload).subscribe({
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
    if (confirm(this.translateService.translate('BRANCH.CONFIRM_DELETE'))) {
      this.api.deleteBranch(id).subscribe({
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
