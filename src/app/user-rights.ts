import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { ExportDropdownComponent } from './export-dropdown.component';
import { PermissionService } from './permission.service';

export interface ModulePermissionRow {
  role: string;
  module: string;
  moduleLabel?: string;
  category?: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canCancel: boolean;
  canExecute: boolean;
}

const ALL_MODULES = [
  { key: 'POS', label: 'POS - Point of Sale Counter', category: 'Operations' },
  { key: 'BILLS_DUPLICATE', label: 'Duplicate Bill Reprint', category: 'Operations' },
  { key: 'BILLS_CANCEL', label: 'Bill Cancellation (Void)', category: 'Operations' },
  { key: 'SHIFT_CLOSING_SUPERVISOR_AUTH', label: 'Shift Close & Closing Report', category: 'Closing' },
  { key: 'DAY_CLOSE', label: 'Day Close & Financial Audit', category: 'Closing' },

  // Individual Page-Wise Reports & Business Intelligence
  { key: 'REPORT_DASHBOARD', label: 'Report: Management Dashboard', category: 'Reports' },
  { key: 'REPORT_DAILY_SUMMARY', label: 'Report: Daily Sales Summary', category: 'Reports' },
  { key: 'REPORT_PERIODIC', label: 'Report: Periodic Sales (Thermal)', category: 'Reports' },
  { key: 'REPORT_SHIFT', label: 'Report: Shift Sales Report', category: 'Reports' },
  { key: 'REPORT_LOCATION', label: 'Report: Location-wise Sales', category: 'Reports' },
  { key: 'REPORT_ITEM', label: 'Report: Car Model & Item Sales', category: 'Reports' },
  { key: 'REPORT_PAYMENT', label: 'Report: Payment Collections', category: 'Reports' },
  { key: 'REPORT_AGGREGATOR', label: 'Report: Aggregator Sales & Reconcile', category: 'Reports' },
  { key: 'REPORT_DISCOUNT', label: 'Report: Discount Analysis', category: 'Reports' },
  { key: 'REPORT_CANCELLATION', label: 'Report: Void Bills & Cancellation Audit', category: 'Reports' },
  { key: 'REPORT_CASHIER', label: 'Report: Cashier Performance', category: 'Reports' },
  { key: 'REPORT_CUSTOMER', label: 'Report: Customer-wise Sales', category: 'Reports' },
  { key: 'REPORTS', label: 'Reports Hub (All Access Default)', category: 'Reports' },

  { key: 'COMPANY', label: 'Company Master', category: 'Masters' },
  { key: 'BRANCH', label: 'Branch Master', category: 'Masters' },
  { key: 'LOCATION', label: 'Location Master', category: 'Masters' },
  { key: 'USER', label: 'User Master', category: 'Masters' },
  { key: 'USER_RIGHTS', label: 'User Rights & Permissions', category: 'Masters' },
  { key: 'CAR_MODEL', label: 'Car Model Master', category: 'Fleet' },
  { key: 'CAR', label: 'Car Fleet Master', category: 'Fleet' },
  { key: 'RATE', label: 'Rental Rates Setup', category: 'Operations' },
  { key: 'GRACE_PERIOD', label: 'Grace Periods Setup', category: 'Operations' },
  { key: 'TRANSLATIONS', label: 'Multilingual Translations', category: 'System' },
  { key: 'PRINTER_MASTER', label: 'Printer Master', category: 'Hardware' },
  { key: 'PRINT_FORMAT_MASTER', label: 'Print Format Master', category: 'Hardware' },
  { key: 'MASTER_EXPORT', label: 'Master Data Export Center', category: 'System' },
];

@Component({
  selector: 'app-user-rights',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExportDropdownComponent],
  template: `
    <div class="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
      
      <!-- Top Header & Role Switcher -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-slate-800">{{ 'RIGHTS.TITLE' | translate }}</h2>
            <span class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> {{ 'COMMON.POSTGRESQL_LIVE' | translate }}
            </span>
          </div>
          <p class="text-slate-500 text-sm mt-1">{{ 'RIGHTS.SUBTITLE' | translate }}</p>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <!-- Universal Master Export Dropdown -->
          <app-export-dropdown 
            [masterKey]="'user-rights'" 
            [title]="'RIGHTS.TITLE' | translate" 
            [items]="permissionRows()" 
            [filename]="'Role_Permissions_Matrix'">
          </app-export-dropdown>
          
          <!-- Save All Permissions Button -->
          <button (click)="savePermissions()" [disabled]="saving()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 cursor-pointer text-xs disabled:opacity-50 transition">
            <span *ngIf="saving()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <svg *ngIf="!saving()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            {{ 'COMMON.SAVE_TO_POSTGRES' | translate }}
          </button>
        </div>
      </div>

      <!-- Action Toast Notification -->
      <div *ngIf="toastMsg()" class="p-4 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-150"
           [ngClass]="toastType() === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'">
        <span>{{ toastMsg() }}</span>
        <button (click)="toastMsg.set(null)" class="text-slate-400 hover:text-slate-700 text-base font-bold cursor-pointer">&times;</button>
      </div>

      <!-- Role Selector Tabs -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <label class="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            {{ 'RIGHTS.SELECT_ROLE' | translate }}:
          </label>
          <div class="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button 
              *ngFor="let r of availableRoles" 
              (click)="selectRole(r)" 
              [class]="selectedRole() === r ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'"
              class="px-4 py-1.5 text-xs rounded-md transition cursor-pointer">
              {{ r }}
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="selectAllForRole(true)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer">
            ✓ {{ 'COMMON.SELECT_ALL' | translate }}
          </button>
          <button (click)="selectAllForRole(false)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer">
            ✗ {{ 'COMMON.DESELECT_ALL' | translate }}
          </button>
        </div>
      </div>

      <!-- Permissions Matrix Table -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="px-4 py-3">{{ 'RIGHTS.MODULE' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.VIEW' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.ADD' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.EDIT' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.DELETE' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.PRINT' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.EXPORT' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.CANCEL' | translate }}</th>
                <th class="px-4 py-3 text-center">{{ 'RIGHTS.EXECUTE' | translate }}</th>
                <th class="px-4 py-3 text-right">Quick</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of permissionRows()" 
                  class="transition"
                  [ngClass]="row.module === 'SHIFT_CLOSING_SUPERVISOR_AUTH' ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50'">

                <!-- SPECIAL ROW: Shift Close and Closing Report Supervisor Authentication Required or Not -->
                <ng-container *ngIf="row.module === 'SHIFT_CLOSING_SUPERVISOR_AUTH'; else standardModuleRow">
                  <td class="px-4 py-3.5">
                    <div class="font-bold text-slate-800 flex items-center gap-2">
                      <span>{{ row.moduleLabel }}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                            [ngClass]="row.canExecute ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'">
                        {{ row.canExecute ? '🔒 Supervisor Auth Required' : '⚡ Direct Close (No Auth)' }}
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span class="px-1.5 py-0.5 rounded font-semibold text-[9px] bg-amber-100 text-amber-800 border border-amber-200">{{ row.category }}</span>
                      <span>Single Security Control for Shift Close & Closing Report</span>
                    </div>
                  </td>

                  <!-- Colspan 8: Single Supervisor Authentication Required Toggle -->
                  <td colspan="8" class="px-4 py-3.5 text-center">
                    <div class="flex items-center justify-center gap-3">
                      <label class="inline-flex items-center gap-2.5 cursor-pointer select-none bg-white px-4 py-1.5 rounded-lg border-2 shadow-2xs transition"
                             [ngClass]="row.canExecute ? 'border-amber-400 bg-amber-50/60 text-amber-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'">
                        <input type="checkbox" [(ngModel)]="row.canExecute" class="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer">
                        <span class="text-xs font-bold">
                          Supervisor Authentication Required: 
                          <span [class]="row.canExecute ? 'text-amber-800 font-black' : 'text-slate-500 font-bold'">
                            {{ row.canExecute ? 'YES' : 'NO' }}
                          </span>
                        </span>
                      </label>
                      <span class="text-[11px] text-slate-500 hidden sm:inline-block">
                        {{ row.canExecute 
                          ? '(Staff/Cashier must prompt supervisor login modal before closing shift or printing report)' 
                          : '(Staff/Cashier can close shift and generate report directly with confirmation)' }}
                      </span>
                    </div>
                  </td>

                  <!-- Quick Toggle Button -->
                  <td class="px-4 py-3.5 text-right">
                    <button (click)="toggleRow(row)" class="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer">
                      Toggle
                    </button>
                  </td>
                </ng-container>

                <!-- STANDARD ROW: For all other modules -->
                <ng-template #standardModuleRow>
                  <!-- Module Name & Category -->
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-800">{{ row.moduleLabel }}</div>
                    <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span class="px-1.5 py-0.5 rounded font-semibold text-[9px]"
                            [ngClass]="row.category === 'Reports' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500'">{{ row.category }}</span>
                      <span>{{ row.module }}</span>
                    </div>
                  </td>

                  <!-- View Checkbox (Page Rights) -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canView" title="Page View Rights" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer">
                  </td>

                  <!-- Add Checkbox -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canAdd" [disabled]="row.category === 'Reports'" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:opacity-20">
                  </td>

                  <!-- Edit Checkbox -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canEdit" [disabled]="row.category === 'Reports'" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:opacity-20">
                  </td>

                  <!-- Delete Checkbox -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canDelete" [disabled]="row.category === 'Reports'" class="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer disabled:opacity-20">
                  </td>

                  <!-- Print Checkbox (Thermal / Print Rights) -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canPrint" title="Print Rights" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer">
                  </td>

                  <!-- Export Checkbox (CSV / Excel Rights) -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canExport" title="Export Rights" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer">
                  </td>

                  <!-- Cancel Bill Checkbox -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canCancel" [disabled]="row.module !== 'BILLS_CANCEL' && row.module !== 'POS'" class="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer disabled:opacity-20">
                  </td>

                  <!-- Execute Checkbox -->
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" [(ngModel)]="row.canExecute" [disabled]="row.module !== 'POS' && row.module !== 'DAY_CLOSE'" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-20">
                  </td>

                  <!-- Quick Toggle Row Button -->
                  <td class="px-4 py-3 text-right">
                    <button (click)="toggleRow(row)" class="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer">
                      Toggle
                    </button>
                  </td>
                </ng-template>

              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class UserRightsComponent implements OnInit {
  private api = inject(ApiService);
  public translateService = inject(TranslateService);
  public perm = inject(PermissionService);

  availableRoles = ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER'];
  selectedRole = signal<string>('ADMIN');
  allPermissions = signal<any[]>([]);
  saving = signal<boolean>(false);

  toastMsg = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  permissionRows = computed(() => {
    const role = this.selectedRole();
    const dbPerms = this.allPermissions().filter(p => p.role === role);

    return ALL_MODULES.map(m => {
      const found = dbPerms.find(p => p.module === m.key);
      const isReport = m.category === 'Reports';
      const isShiftClosingSupervisorAuth = m.key === 'SHIFT_CLOSING_SUPERVISOR_AUTH';

      let defaultView = false;
      if (isShiftClosingSupervisorAuth) {
        defaultView = true;
      } else {
        defaultView = found ? found.can_view : (
          role === 'ADMIN' ||
          (role === 'MANAGER' && isReport) ||
          (role === 'STAFF' && (m.key === 'REPORT_DAILY_SUMMARY' || m.key === 'REPORT_SHIFT')) ||
          (role === 'CASHIER' && m.key === 'REPORT_SHIFT')
        );
      }

      let defaultExecute = false;
      if (isShiftClosingSupervisorAuth) {
        // For SHIFT_CLOSING_SUPERVISOR_AUTH: canExecute = true means Supervisor Authentication IS Required
        defaultExecute = found ? Boolean(found.can_execute) : (role === 'STAFF' || role === 'CASHIER');
      } else {
        defaultExecute = found ? Boolean(found.can_execute) : (role === 'ADMIN' || m.key === 'POS' || m.key === 'DAY_CLOSE');
      }

      const defaultPrint = found ? found.can_print : (role === 'ADMIN' || role === 'MANAGER' || (isReport && defaultView) || isShiftClosingSupervisorAuth);
      const defaultExport = found ? found.can_export : (role === 'ADMIN' || role === 'MANAGER' || isShiftClosingSupervisorAuth);

      return {
        role,
        module: m.key,
        moduleLabel: m.label,
        category: m.category,
        canView: defaultView,
        canAdd: found ? found.can_add : (role === 'ADMIN' && !isReport && !isShiftClosingSupervisorAuth),
        canEdit: found ? found.can_edit : (role === 'ADMIN' && !isReport && !isShiftClosingSupervisorAuth),
        canDelete: found ? found.can_delete : (role === 'ADMIN' && !isReport && !isShiftClosingSupervisorAuth),
        canPrint: defaultPrint,
        canExport: defaultExport,
        canCancel: found ? found.can_cancel : (role === 'ADMIN' || (role === 'MANAGER' && m.key === 'BILLS_CANCEL')),
        canExecute: defaultExecute,
      };
    });
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getUserRights().subscribe({
      next: (data) => {
        this.allPermissions.set(data || []);
      },
      error: (err) => console.error('Error fetching user rights from Database:', err)
    });
  }

  selectRole(r: string) {
    this.selectedRole.set(r);
  }

  selectAllForRole(val: boolean) {
    for (const row of this.permissionRows()) {
      if (row.module === 'SHIFT_CLOSING_SUPERVISOR_AUTH') {
        row.canExecute = val;
        continue;
      }
      row.canView = val;
      row.canAdd = val;
      row.canEdit = val;
      row.canDelete = val;
      row.canPrint = val;
      row.canExport = val;
      row.canCancel = val;
      row.canExecute = val;
    }
  }

  toggleRow(row: ModulePermissionRow) {
    if (row.module === 'SHIFT_CLOSING_SUPERVISOR_AUTH') {
      row.canExecute = !row.canExecute;
      return;
    }
    const newVal = !row.canView;
    row.canView = newVal;
    row.canAdd = newVal;
    row.canEdit = newVal;
    row.canDelete = newVal;
    row.canPrint = newVal;
    row.canExport = newVal;
    row.canCancel = newVal;
    row.canExecute = newVal;
  }

  savePermissions() {
    this.saving.set(true);
    const payload = this.permissionRows();

    this.api.saveUserRights(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.load();
        this.perm.refresh(); // Refresh active client session permissions
        this.showToast('success', `Permissions for role "${this.selectedRole()}" saved successfully in Database.`);
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast('error', `Error saving permissions: ${err.error?.error || err.message}`);
      }
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
