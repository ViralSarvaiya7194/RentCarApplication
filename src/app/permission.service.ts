import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';

export interface UserPermissionItem {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canCancel: boolean;
  canExecute: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private api = inject(ApiService);

  userRole = signal<string>('STAFF');
  permissions = signal<Map<string, UserPermissionItem>>(new Map());
  isAdmin = computed(() => this.userRole().toUpperCase() === 'ADMIN');
  isLoaded = signal<boolean>(false);

  constructor() {
    this.init();
  }

  init() {
    const rawUser = localStorage.getItem('currentUser');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed.role) {
          this.userRole.set(parsed.role);
        } else {
          this.userRole.set('STAFF');
        }
      } catch (e) {
        this.userRole.set('STAFF');
      }
    } else {
      this.userRole.set('GUEST');
      this.permissions.set(new Map());
      this.isLoaded.set(false);
      return;
    }
    this.loadPermissions();
  }

  loadPermissions() {
    this.api.getMyPermissions().subscribe({
      next: (perms) => {
        const map = new Map<string, UserPermissionItem>();
        if (Array.isArray(perms)) {
          for (const p of perms) {
            map.set(p.module.toUpperCase(), {
              module: p.module,
              canView: p.canView === true || p.can_view === true,
              canAdd: p.canAdd === true || p.can_add === true,
              canEdit: p.canEdit === true || p.can_edit === true,
              canDelete: p.canDelete === true || p.can_delete === true,
              canPrint: p.canPrint === true || p.can_print === true,
              canExport: p.canExport === true || p.can_export === true,
              canCancel: p.canCancel === true || p.can_cancel === true,
              canExecute: p.canExecute === true || p.can_execute === true,
            });
          }
        }
        this.permissions.set(map);
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.warn('Could not load user permissions:', err);
        this.permissions.set(new Map());
        this.isLoaded.set(true);
      }
    });
  }

  /**
   * Evaluates whether supervisor authentication is required for Shift Close and Closing Report
   */
  isSupervisorAuthRequiredForShiftClose(): boolean {
    if (this.isAdmin()) return false;

    // Check specific permission toggle for SHIFT_CLOSING_SUPERVISOR_AUTH
    const perm = this.permissions().get('SHIFT_CLOSING_SUPERVISOR_AUTH');
    if (perm) {
      return perm.canExecute === true;
    }

    // Role-based default fallback: Staff & Cashier require supervisor auth; Admin & Manager do not
    const role = this.userRole().toUpperCase();
    if (role === 'STAFF' || role === 'CASHIER') {
      return true;
    }
    return false;
  }

  /**
   * Evaluates whether the currently authenticated user has rights to perform action on module
   */
  can(module: string, action: 'VIEW' | 'ADD' | 'EDIT' | 'DELETE' | 'PRINT' | 'EXPORT' | 'CANCEL' | 'EXECUTE'): boolean {
    if (this.isAdmin()) return true;

    const modKey = module.toUpperCase().trim();

    // Compatibility for Shift Close and Periodic / Closing Report navigation and operations
    if (modKey === 'SHIFT_CLOSE' || modKey === 'PERIODIC_REPORT' || modKey === 'SHIFT_CLOSING_SUPERVISOR_AUTH') {
      if (action.toUpperCase() === 'VIEW' || action.toUpperCase() === 'PRINT' || action.toUpperCase() === 'EXPORT' || action.toUpperCase() === 'EXECUTE') {
        return true;
      }
    }

    const perm = this.permissions().get(modKey);
    if (!perm) {
      // Fallback check: if specific report module permission is not loaded, check parent REPORTS module
      if (modKey.startsWith('REPORT_') && this.permissions().has('REPORTS')) {
        const parent = this.permissions().get('REPORTS')!;
        if (action.toUpperCase() === 'VIEW') return parent.canView;
        if (action.toUpperCase() === 'PRINT') return parent.canPrint;
        if (action.toUpperCase() === 'EXPORT') return parent.canExport;
      }
      if (modKey === 'REPORT_PERIODIC' && (this.permissions().has('PERIODIC_REPORT') || this.permissions().has('SHIFT_CLOSING_SUPERVISOR_AUTH'))) {
        return true;
      }
      return false;
    }

    switch (action.toUpperCase()) {
      case 'VIEW': return perm.canView;
      case 'ADD': return perm.canAdd;
      case 'EDIT': return perm.canEdit;
      case 'DELETE': return perm.canDelete;
      case 'PRINT': return perm.canPrint;
      case 'EXPORT': return perm.canExport;
      case 'CANCEL': return perm.canCancel;
      case 'EXECUTE': return perm.canExecute;
      default: return false;
    }
  }

  /**
   * Shortcut to reload permissions upon login / switch account
   */
  refresh() {
    this.init();
  }
}
