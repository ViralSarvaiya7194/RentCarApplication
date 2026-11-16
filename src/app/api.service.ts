import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);

  // System & Health
  health(): Observable<any> { return this.http.get<any>('/api/health'); }
  dbStatus(): Observable<any> { return this.http.get<any>('/api/db-status'); }
  seed(): Observable<any> { return this.http.post<any>('/api/seed', {}); }
  login(credentials: any): Observable<any> { return this.http.post<any>('/api/login', credentials); }
  logout(data?: any): Observable<any> { return this.http.post<any>('/api/logout', data || {}); }
  getSessionInfo(): Observable<any> { return this.http.get<any>('/api/session-info'); }

  // Companies
  getCompanies(): Observable<any[]> { return this.http.get<any[]>('/api/companies'); }
  createCompany(data: any): Observable<any> { return this.http.post<any>('/api/companies', data); }
  deleteCompany(id: string): Observable<any> { return this.http.delete<any>(`/api/companies/${id}`); }

  // Branches
  getBranches(): Observable<any[]> { return this.http.get<any[]>('/api/branches'); }
  createBranch(data: any): Observable<any> { return this.http.post<any>('/api/branches', data); }
  deleteBranch(id: string): Observable<any> { return this.http.delete<any>(`/api/branches/${id}`); }

  // Locations
  getLocations(): Observable<any[]> { return this.http.get<any[]>('/api/locations'); }
  createLocation(data: any): Observable<any> { return this.http.post<any>('/api/locations', data); }
  deleteLocation(id: string): Observable<any> { return this.http.delete<any>(`/api/locations/${id}`); }

  // Car Models
  getCarModels(): Observable<any[]> { return this.http.get<any[]>('/api/car-models'); }
  createCarModel(data: any): Observable<any> { return this.http.post<any>('/api/car-models', data); }
  deleteCarModel(id: string): Observable<any> { return this.http.delete<any>(`/api/car-models/${id}`); }

  // Cars
  getCars(): Observable<any[]> { return this.http.get<any[]>(`/api/cars?_t=${Date.now()}`); }
  createCar(data: any): Observable<any> { return this.http.post<any>('/api/cars', data); }
  updateCarStatus(id: string | number, status: string): Observable<any> { return this.http.put<any>(`/api/cars/${id}/status`, { status }); }
  deleteCar(id: string): Observable<any> { return this.http.delete<any>(`/api/cars/${id}`); }

  // Rates
  getRates(): Observable<any[]> { return this.http.get<any[]>('/api/rates'); }
  createRate(data: any): Observable<any> { return this.http.post<any>('/api/rates', data); }
  deleteRate(id: string): Observable<any> { return this.http.delete<any>(`/api/rates/${id}`); }

  // Grace Periods
  getGracePeriods(): Observable<any[]> { return this.http.get<any[]>('/api/grace-periods'); }
  createGracePeriod(data: any): Observable<any> { return this.http.post<any>('/api/grace-periods', data); }
  deleteGracePeriod(id: string): Observable<any> { return this.http.delete<any>(`/api/grace-periods/${id}`); }

  // Users
  getUsers(): Observable<any[]> { return this.http.get<any[]>('/api/users'); }
  createUser(data: any): Observable<any> { return this.http.post<any>('/api/users', data); }
  deleteUser(id: string): Observable<any> { return this.http.delete<any>(`/api/users/${id}`); }

  // Sales Date (Persistent Business Date)
  getSalesDate(): Observable<{ salesDate: string; isDayClosed: boolean }> {
    return this.http.get<{ salesDate: string; isDayClosed: boolean }>('/api/sales-date');
  }
  resetSalesDate(targetDate?: string): Observable<any> {
    return this.http.post<any>('/api/sales-date/reset', { targetDate });
  }

  // Shifts (Dynamic Shifts)
  getShifts(): Observable<any[]> { return this.http.get<any[]>('/api/shifts'); }
  getCurrentShift(params?: { cashier?: string; userId?: string; username?: string; branch?: string; location?: string; terminal?: string; businessDate?: string }): Observable<any> {
    let url = '/api/shifts/current';
    const parts: string[] = [];
    if (params?.cashier) parts.push(`cashier=${encodeURIComponent(params.cashier)}`);
    if (params?.userId) parts.push(`userId=${encodeURIComponent(params.userId)}`);
    if (params?.username) parts.push(`username=${encodeURIComponent(params.username)}`);
    if (params?.branch) parts.push(`branch=${encodeURIComponent(params.branch)}`);
    if (params?.location) parts.push(`location=${encodeURIComponent(params.location)}`);
    if (params?.terminal) parts.push(`terminal=${encodeURIComponent(params.terminal)}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
    return this.http.get<any>(url);
  }
  getShiftHistory(params?: { fromDate?: string; toDate?: string }): Observable<any[]> {
    let url = '/api/shifts/history';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any[]>(url);
  }
  openShift(data: any): Observable<any> { return this.http.post<any>('/api/shifts/open', data); }
  closeShift(data: any): Observable<any> { return this.http.post<any>('/api/shifts/close', data); }

  // Rentals & POS
  getRentals(param?: string | { status?: string; date?: string }): Observable<any[]> {
    let url = '/api/rentals';
    const parts: string[] = [];
    if (typeof param === 'string') {
      if (param) parts.push(`status=${encodeURIComponent(param)}`);
    } else if (param) {
      if (param.status && param.status !== 'ALL') parts.push(`status=${encodeURIComponent(param.status)}`);
      if (param.date && param.date !== 'ALL') parts.push(`date=${encodeURIComponent(param.date)}`);
    }
    parts.push(`_t=${Date.now()}`);
    return this.http.get<any[]>(`${url}?${parts.join('&')}`);
  }
  createRental(data: any): Observable<any> { return this.http.post<any>('/api/rentals', data, { headers: this.getAuthHeaders() }); }
  closeRental(id: string | number, data: any): Observable<any> { return this.http.put<any>(`/api/rentals/${id}`, data); }

  // Customers & Phone Lookup
  getCustomers(search?: string): Observable<any[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get<any[]>(`/api/customers${q}`);
  }
  searchCustomers(phoneOrQuery: string): Observable<any[]> {
    const q = phoneOrQuery ? `?phone=${encodeURIComponent(phoneOrQuery)}` : '';
    return this.http.get<any[]>(`/api/customers/search${q}`);
  }
  lookupCustomerByPhone(phone: string): Observable<{ exactMatch: any | null; matches: any[] }> {
    return this.http.get<{ exactMatch: any | null; matches: any[] }>(`/api/customers/by-phone/${encodeURIComponent(phone)}`);
  }

  // Day Close
  getDayCloseSummary(date?: string): Observable<any> {
    const url = date ? `/api/day-close/summary?date=${date}` : '/api/day-close/summary';
    return this.http.get<any>(url);
  }
  getDayCloses(): Observable<any[]> { return this.http.get<any[]>('/api/day-close'); }
  closeDay(data: any): Observable<any> { return this.http.post<any>('/api/day-close', data); }
  sendDayCloseEmail(data: any): Observable<any> { return this.http.post<any>('/api/day-close/email', data); }
  getEmailSettings(): Observable<any> { return this.http.get<any>('/api/email/settings'); }
  saveEmailSettings(data: any): Observable<any> { return this.http.post<any>('/api/email/settings', data); }
  testEmail(param?: string | { recipient?: string; to?: string; settings?: any }): Observable<any> {
    const body = typeof param === 'string' ? { recipient: param } : { recipient: param?.recipient || param?.to, settings: param?.settings };
    return this.http.post<any>('/api/email/test', body);
  }

  // Periodic Date-Range Reports & Auto Thermal Print
  getPeriodicReport(params: { fromDate?: string; toDate?: string; branch?: string; location?: string }): Observable<any> {
    let url = '/api/reports/periodic';
    const parts: string[] = [];
    if (params.fromDate) parts.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
    if (params.toDate) parts.push(`toDate=${encodeURIComponent(params.toDate)}`);
    if (params.branch && params.branch !== 'ALL') parts.push(`branch=${encodeURIComponent(params.branch)}`);
    if (params.location && params.location !== 'ALL') parts.push(`location=${encodeURIComponent(params.location)}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
    return this.http.get<any>(url);
  }

  printPeriodicReportThermal(payload: any): Observable<any> {
    return this.http.post<any>('/api/reports/periodic/print-thermal', payload);
  }

  // 9 Comprehensive Reports Suite
  getManagementDashboard(): Observable<any> {
    return this.http.get<any>('/api/reports/management-dashboard');
  }

  getDailySalesSummary(date?: string): Observable<any[]> {
    const url = date ? `/api/reports/daily-summary?date=${date}` : '/api/reports/daily-summary';
    return this.http.get<any[]>(url);
  }

  getLocationSales(params?: { fromDate?: string; toDate?: string }): Observable<any[]> {
    let url = '/api/reports/location-sales';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any[]>(url);
  }

  getItemSales(params?: { fromDate?: string; toDate?: string }): Observable<any[]> {
    let url = '/api/reports/item-sales';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any[]>(url);
  }

  getPaymentCollection(params?: { fromDate?: string; toDate?: string }): Observable<any[]> {
    let url = '/api/reports/payment-collection';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any[]>(url);
  }

  getAggregatorSales(params?: { fromDate?: string; toDate?: string }): Observable<any[]> {
    let url = '/api/reports/aggregator-sales';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any[]>(url);
  }

  getDiscountAnalysis(params?: { fromDate?: string; toDate?: string }): Observable<any> {
    let url = '/api/reports/discount-analysis';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any>(url);
  }

  getCancellationAnalysis(params?: { fromDate?: string; toDate?: string }): Observable<any> {
    let url = '/api/reports/cancellation-analysis';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any>(url);
  }

  getCashierPerformance(params?: { fromDate?: string; toDate?: string }): Observable<any[]> {
    let url = '/api/reports/cashier-performance';
    if (params?.fromDate && params?.toDate) url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    return this.http.get<any[]>(url);
  }

  getCustomerSales(params?: { fromDate?: string; toDate?: string; search?: string }): Observable<any> {
    let url = '/api/reports/customer-sales';
    const parts: string[] = [];
    if (params?.fromDate) parts.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
    if (params?.toDate) parts.push(`toDate=${encodeURIComponent(params.toDate)}`);
    if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
    return this.http.get<any>(url);
  }

  // Translations
  getTranslationDictionary(lang: string = 'en'): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`/api/translations?language=${lang}`);
  }
  getAllTranslations(params?: { module?: string; search?: string }): Observable<any[]> {
    let url = '/api/translations/all';
    const queryParts: string[] = [];
    if (params?.module && params.module !== 'ALL') queryParts.push(`module=${encodeURIComponent(params.module)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;
    return this.http.get<any[]>(url);
  }
  createOrUpdateTranslation(data: any): Observable<any> {
    return this.http.post<any>('/api/translations', data);
  }
  deleteTranslation(id: string): Observable<any> {
    return this.http.delete<any>(`/api/translations/${id}`);
  }
  importTranslations(payload: { items: any[]; mode?: string }): Observable<any> {
    return this.http.post<any>('/api/translations/import', payload, { headers: this.getAuthHeaders() });
  }

  // Master Export API
  exportMaster(master: string, format: string = 'json', params?: { search?: string; status?: string; module?: string }): Observable<any> {
    let url = `/api/export/${master}?format=${format}`;
    if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;
    if (params?.status && params.status !== 'ALL') url += `&status=${encodeURIComponent(params.status)}`;
    if (params?.module && params.module !== 'ALL') url += `&module=${encodeURIComponent(params.module)}`;
    return this.http.get(url, { responseType: format === 'json' ? 'json' : 'blob' as any });
  }

  // Cancellation Reasons
  getCancellationReasons(): Observable<any[]> {
    return this.http.get<any[]>('/api/cancellation-reasons');
  }

  // Discount Types
  getDiscountTypes(): Observable<any[]> {
    return this.http.get<any[]>('/api/discount-types');
  }

  // Bill Operations: Cancellation, Duplicate Printing, and View Audit
  cancelBill(id: string | number, payload: any): Observable<any> {
    return this.http.post<any>(`/api/rentals/${id}/cancel`, payload, { headers: this.getAuthHeaders() });
  }

  printDuplicateBill(id: string | number, payload?: any): Observable<any> {
    return this.http.post<any>(`/api/rentals/${id}/duplicate-print`, payload || {}, { headers: this.getAuthHeaders() });
  }

  auditBillView(id: string | number, payload?: any): Observable<any> {
    return this.http.post<any>(`/api/rentals/${id}/view-audit`, payload || {}, { headers: this.getAuthHeaders() });
  }

  // Rental Settlement (Direct Background Thermal Print + Audit)
  settleRental(id: string | number, payload: any): Observable<any> {
    return this.http.post<any>(`/api/rentals/${id}/settle`, payload, { headers: this.getAuthHeaders() });
  }

  // Car Swap directly on active rental without disrupting billing
  changeCar(id: string | number, payload: {
    newCarId?: string;
    newCarNo?: string;
    reason?: string;
    username?: string;
    carId?: string;
    carNo?: string;
    invoiceNo?: string;
    branch?: string;
    location?: string;
    terminal?: string;
  }): Observable<any> {
    return this.http.post<any>(`/api/rentals/${id}/change-car`, payload, { headers: this.getAuthHeaders() });
  }

  // Supervisor Authorization Check (Password verification against users table with 404 fallback for older backend processes)
  verifySupervisor(passwordOrCreds: string | { password: string; username?: string }, username?: string): Observable<{ authorized: boolean; user?: any; error?: string; message?: string }> {
    const payload = typeof passwordOrCreds === 'string' ? { password: passwordOrCreds, username } : passwordOrCreds;
    const pwd = String(payload.password || '').trim();
    const uname = payload.username ? String(payload.username).trim() : '';

    return this.http.post<{ authorized: boolean; user?: any; error?: string; message?: string }>(
      '/api/auth/verify-supervisor',
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          return this.http.get<any[]>('/api/users', { headers: this.getAuthHeaders() }).pipe(
            switchMap((users) => {
              const list = Array.isArray(users) ? users : [];
              const matched = list.find((u: any) => {
                const uPass = String(u.password || '').trim();
                const uRole = String(u.role || '').toUpperCase().trim();
                const uStatus = String(u.status || 'ACTIVE').toUpperCase().trim();
                const uName = String(u.username || '').toLowerCase().trim();
                const roleOk = ['ADMIN', 'MANAGER', 'SUPERVISOR'].includes(uRole);
                const statusOk = uStatus === 'ACTIVE';
                const nameOk = !uname || uName === uname.toLowerCase();
                return uPass === pwd && roleOk && statusOk && nameOk;
              });

              if (matched) {
                return of({
                  authorized: true,
                  user: {
                    id: matched.id,
                    username: matched.username,
                    employeeName: matched.employeeName || matched.employee_name || matched.username,
                    employee_name: matched.employee_name || matched.employeeName || matched.username,
                    role: matched.role
                  }
                });
              }

              return throwError(() => ({
                status: 401,
                error: { error: 'Invalid password. Supervisor or Manager authorization is required.' },
                message: 'Invalid password. Supervisor or Manager authorization is required.'
              }));
            })
          );
        }
        return throwError(() => err);
      })
    );
  }

  // Shift Report (Summary figures + itemized completed rentals)
  getShiftReport(params: { shiftId?: string; date?: string; shiftNumber?: number }): Observable<any> {
    let url = '/api/shifts/report';
    const parts: string[] = [];
    if (params.shiftId) parts.push(`shiftId=${encodeURIComponent(params.shiftId)}`);
    if (params.date) parts.push(`date=${encodeURIComponent(params.date)}`);
    if (params.shiftNumber) parts.push(`shiftNumber=${params.shiftNumber}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() });
  }

  printShiftReportThermal(shiftId: string, width?: string): Observable<any> {
    return this.http.post<any>(`/api/shifts/${shiftId}/print-thermal`, { paperWidth: width || '80mm' }, { headers: this.getAuthHeaders() });
  }

  // Printer Master Management
  getPrinters(params?: { search?: string; status?: string; branch?: string }): Observable<any[]> {
    let url = '/api/printers';
    const parts: string[] = [];
    if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.status && params.status !== 'ALL') parts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.branch && params.branch !== 'ALL') parts.push(`branch=${encodeURIComponent(params.branch)}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
    return this.http.get<any[]>(url);
  }

  createPrinter(data: any): Observable<any> {
    return this.http.post<any>('/api/printers', data);
  }

  updatePrinter(id: string, data: any): Observable<any> {
    return this.http.put<any>(`/api/printers/${id}`, data);
  }

  deletePrinter(id: string): Observable<any> {
    return this.http.delete<any>(`/api/printers/${id}`);
  }

  togglePrinterStatus(id: string): Observable<any> {
    return this.http.post<any>(`/api/printers/${id}/toggle`, {});
  }

  testPrinterConnection(payload?: { id?: string; printerConfig?: any }): Observable<{ success: boolean; message: string; error?: string; latencyMs: number }> {
    return this.http.post<any>('/api/printers/test-connection', payload || {});
  }

  testPrinterPrint(payload?: { id?: string; printerConfig?: any; username?: string }): Observable<{ success: boolean; message: string; error?: string; latencyMs: number }> {
    return this.http.post<any>('/api/printers/test-print', payload || {});
  }

  testPrinter(printerConfig?: any): Observable<any> {
    return this.http.post<any>('/api/printers/test-print', { printerConfig });
  }

  getSystemPrinters(): Observable<{ success: boolean; printers: any[] }> {
    return this.http.get<any>('/api/printers/system-printers');
  }

  setDefaultPrinter(id: string): Observable<any> {
    return this.http.post<any>(`/api/printers/${id}/set-default`, {});
  }

  // Thermal Printer Legacy Settings (Backward Compatibility)
  getPrinterSettings(): Observable<any> {
    return this.http.get<any>('/api/printer/settings');
  }

  savePrinterSettings(config: any): Observable<any> {
    return this.http.post<any>('/api/printer/settings', config);
  }

  // Print Format Master Management
  getPrintFormats(params?: { search?: string; status?: string; branch?: string; printType?: string; language?: string }): Observable<any[]> {
    let url = '/api/print-formats';
    const parts: string[] = [];
    if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.status && params.status !== 'ALL') parts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.branch && params.branch !== 'ALL') parts.push(`branch=${encodeURIComponent(params.branch)}`);
    if (params?.printType && params.printType !== 'ALL') parts.push(`printType=${encodeURIComponent(params.printType)}`);
    if (params?.language && params.language !== 'ALL') parts.push(`language=${encodeURIComponent(params.language)}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
    return this.http.get<any[]>(url, { headers: this.getAuthHeaders() });
  }

  createPrintFormat(data: any): Observable<any> {
    return this.http.post<any>('/api/print-formats', data, { headers: this.getAuthHeaders() });
  }

  updatePrintFormat(id: string, data: any): Observable<any> {
    return this.http.put<any>(`/api/print-formats/${id}`, data, { headers: this.getAuthHeaders() });
  }

  deletePrintFormat(id: string): Observable<any> {
    return this.http.delete<any>(`/api/print-formats/${id}`, { headers: this.getAuthHeaders() });
  }

  togglePrintFormatStatus(id: string): Observable<any> {
    return this.http.post<any>(`/api/print-formats/${id}/toggle`, {}, { headers: this.getAuthHeaders() });
  }

  setDefaultPrintFormat(id: string): Observable<any> {
    return this.http.post<any>(`/api/print-formats/${id}/set-default`, {}, { headers: this.getAuthHeaders() });
  }

  // User Rights & Role Permissions Management
  getUserRights(): Observable<any[]> {
    return this.http.get<any[]>('/api/user-rights', { headers: this.getAuthHeaders() });
  }

  saveUserRights(permissions: any[]): Observable<any> {
    return this.http.post<any>('/api/user-rights', { permissions }, { headers: this.getAuthHeaders() });
  }

  getMyPermissions(): Observable<any[]> {
    return this.http.get<any[]>('/api/user-rights/my-permissions', { headers: this.getAuthHeaders() });
  }

  getBillAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>('/api/audit-logs/bills');
  }

  getAuditLogs(limit?: number, action?: string, search?: string): Observable<any[]> {
    let url = '/api/audit-logs';
    const params: string[] = [];
    if (limit) params.push(`limit=${limit}`);
    if (action) params.push(`action=${encodeURIComponent(action)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<any[]>(url);
  }

  public getAuthHeaders(): Record<string, string> {
    const rawUser = localStorage.getItem('currentUser');
    let role = 'ADMIN';
    let userId = 'USR-ADMIN';
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed.role) role = parsed.role;
        if (parsed.id) userId = parsed.id;
      } catch (e) {}
    }
    const lang = localStorage.getItem('kidsdrive_language') || 'en';
    return {
      'x-user-role': role,
      'x-user-id': userId,
      'x-language': lang.toUpperCase(),
    };
  }
}


