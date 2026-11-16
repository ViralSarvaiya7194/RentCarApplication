import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslateService } from './translate.service';

export interface MasterColumn {
  key: string;
  label: string;
  labelAr?: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'boolean';
  width?: number;
  maskForRole?: string[]; // e.g. ['STAFF']
}

export interface MasterConfig {
  key: string;
  name: string;
  nameAr: string;
  endpoint: string;
  columns: MasterColumn[];
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private translateService = inject(TranslateService);

  // Configuration for all 9 existing masters in the application
  readonly masters: Record<string, MasterConfig> = {
    company: {
      key: 'company',
      name: 'Company Master',
      nameAr: 'سجل الشركات',
      endpoint: '/api/companies',
      columns: [
        { key: 'id', label: 'Company ID', labelAr: 'رمز الشركة', type: 'text', width: 15 },
        { key: 'name', label: 'Company Name', labelAr: 'اسم الشركة', type: 'text', width: 30 },
        { key: 'contact', label: 'Contact', labelAr: 'بيانات الاتصال', type: 'text', width: 25 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    branch: {
      key: 'branch',
      name: 'Branch Master',
      nameAr: 'سجل الفروع',
      endpoint: '/api/branches',
      columns: [
        { key: 'id', label: 'Branch ID', labelAr: 'رمز الفرع', type: 'text', width: 15 },
        { key: 'name', label: 'Branch Name', labelAr: 'اسم الفرع', type: 'text', width: 30 },
        { key: 'company', label: 'Company', labelAr: 'الشركة', type: 'text', width: 25 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    location: {
      key: 'location',
      name: 'Location Master',
      nameAr: 'سجل المواقع',
      endpoint: '/api/locations',
      columns: [
        { key: 'id', label: 'Location ID', labelAr: 'رمز الموقع', type: 'text', width: 15 },
        { key: 'name', label: 'Location Name', labelAr: 'اسم الموقع', type: 'text', width: 30 },
        { key: 'branch', label: 'Branch', labelAr: 'الفرع', type: 'text', width: 25 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    user: {
      key: 'user',
      name: 'User Master',
      nameAr: 'سجل المستخدمين',
      endpoint: '/api/users',
      columns: [
        { key: 'id', label: 'User ID', labelAr: 'رمز المستخدم', type: 'text', width: 15 },
        { key: 'username', label: 'Username', labelAr: 'اسم الحساب', type: 'text', width: 20 },
        { key: 'employeeName', label: 'Employee Name', labelAr: 'اسم الموظف', type: 'text', width: 30 },
        { key: 'role', label: 'Role', labelAr: 'الدور / الصلاحية', type: 'text', width: 15 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    'car-model': {
      key: 'car-model',
      name: 'Car Model Master',
      nameAr: 'سجل موديلات السيارات',
      endpoint: '/api/car-models',
      columns: [
        { key: 'id', label: 'Model ID', labelAr: 'رمز الموديل', type: 'text', width: 15 },
        { key: 'name', label: 'Model Name', labelAr: 'اسم الموديل', type: 'text', width: 30 },
        { key: 'seats', label: 'Seating Capacity', labelAr: 'عدد المقاعد', type: 'number', width: 18 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    car: {
      key: 'car',
      name: 'Car Number / Fleet Master',
      nameAr: 'سجل أرقام وأسطول السيارات',
      endpoint: '/api/cars',
      columns: [
        { key: 'id', label: 'System ID', labelAr: 'الرمز', type: 'text', width: 15 },
        { key: 'carNo', label: 'Car Number', labelAr: 'رقم السيارة', type: 'text', width: 20 },
        { key: 'model', label: 'Model', labelAr: 'الموديل', type: 'text', width: 25 },
        { key: 'batteryLevel', label: 'Battery (%)', labelAr: 'مستوى البطارية', type: 'number', width: 15 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    rate: {
      key: 'rate',
      name: 'Rate Setup Master',
      nameAr: 'سجل إعداد الأسعار والمدد',
      endpoint: '/api/rates',
      columns: [
        { key: 'id', label: 'Rate ID', labelAr: 'رمز التسعيرة', type: 'text', width: 15 },
        { key: 'model', label: 'Model', labelAr: 'الموديل', type: 'text', width: 25 },
        { key: 'duration', label: 'Duration (Mins)', labelAr: 'المدة (بالدقائق)', type: 'number', width: 20 },
        { key: 'amount', label: 'Amount (KWD)', labelAr: 'المبلغ (د.ك)', type: 'currency', width: 20 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    'grace-period': {
      key: 'grace-period',
      name: 'Grace Period Master',
      nameAr: 'سجل فترة السماح',
      endpoint: '/api/grace-periods',
      columns: [
        { key: 'id', label: 'Grace Period ID', labelAr: 'رمز فترة السماح', type: 'text', width: 20 },
        { key: 'minutes', label: 'Grace Period (Mins)', labelAr: 'مدة السماح (دقائق)', type: 'number', width: 25 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'createdAt', label: 'Created At', labelAr: 'تاريخ الإنشاء', type: 'date', width: 20 },
      ],
    },
    translations: {
      key: 'translations',
      name: 'Translations Master',
      nameAr: 'سجل الترجمة واللغات',
      endpoint: '/api/translations/all',
      columns: [
        { key: 'id', label: 'ID', labelAr: 'الرمز', type: 'text', width: 15 },
        { key: 'translationKey', label: 'Translation Key', labelAr: 'مفتاح الترجمة', type: 'text', width: 30 },
        { key: 'englishText', label: 'English Text', labelAr: 'النص الإنجليزي', type: 'text', width: 35 },
        { key: 'arabicText', label: 'Arabic Text', labelAr: 'النص العربي', type: 'text', width: 35 },
        { key: 'module', label: 'Module', labelAr: 'الوحدة / الشاشة', type: 'text', width: 18 },
        { key: 'isActive', label: 'Status', labelAr: 'الحالة', type: 'status', width: 15 },
        { key: 'description', label: 'Description', labelAr: 'الوصف', type: 'text', width: 25 },
      ],
    },
  };

  /**
   * Get all master configs as an array
   */
  getAllMasterConfigs(): MasterConfig[] {
    return Object.values(this.masters);
  }

  /**
   * Get specific master config
   */
  getMasterConfig(masterKey: string): MasterConfig | undefined {
    return this.masters[masterKey];
  }

  /**
   * Get active user role from session
   */
  getCurrentUserRole(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) {
        const u = JSON.parse(raw);
        return u.role || 'STAFF';
      }
    } catch (e) {}
    return 'STAFF';
  }

  /**
   * Clean and prepare data according to permissions and active columns
   */
  prepareData(data: any[], columns: MasterColumn[]): { rows: any[]; headers: string[]; keys: string[] } {
    const isArabic = this.translateService.currentLang() === 'ar';
    const role = this.getCurrentUserRole();

    // Filter columns that shouldn't be visible for this role
    const activeColumns = columns.filter((col) => {
      if (col.maskForRole && col.maskForRole.includes(role)) {
        return false;
      }
      return true;
    });

    const headers = activeColumns.map((col) => (isArabic && col.labelAr ? col.labelAr : col.label));
    const keys = activeColumns.map((col) => col.key);

    const rows = data.map((item) => {
      const rowObj: Record<string, any> = {};
      activeColumns.forEach((col) => {
        let val = item[col.key];

        // Handle fallback mappings (e.g. employeeName / employee_name, car_no / carNo)
        if (val === undefined || val === null) {
          if (col.key === 'employeeName') val = item['employee_name'] || item['username'] || '';
          else if (col.key === 'carNo') val = item['car_no'] || '';
          else if (col.key === 'translationKey') val = item['translation_key'] || '';
          else if (col.key === 'englishText') val = item['english_text'] || '';
          else if (col.key === 'arabicText') val = item['arabic_text'] || '';
          else if (col.key === 'isActive') val = item['is_active'] || item['status'] || 'ACTIVE';
          else if (col.key === 'batteryLevel') val = item['battery_level'] ?? 100;
          else if (col.key === 'createdAt') val = item['created_at'] || '';
          else val = '';
        }

        // Format dates
        if (col.type === 'date' && val) {
          try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              val = d.toISOString().replace('T', ' ').substring(0, 19);
            }
          } catch (e) {}
        }

        // Format currency
        if (col.type === 'currency' && val !== '') {
          val = Number(val || 0).toFixed(3);
        }

        rowObj[col.key] = val;
      });
      return rowObj;
    });

    return { rows, headers, keys };
  }

  /**
   * Export to Excel (.xlsx) format
   */
  exportToExcel(
    data: any[],
    columns: MasterColumn[],
    filename: string = 'Master_Export',
    title: string = 'Master Data Export'
  ) {
    const { rows, headers, keys } = this.prepareData(data, columns);
    const isArabic = this.translateService.currentLang() === 'ar';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const company = localStorage.getItem('currentCompany') || 'Your Events Management Company';
    const branch = localStorage.getItem('currentBranch') || 'Kiddie Kruzzer';

    // Build worksheet rows
    const wsData: any[][] = [];

    // Header metadata block
    wsData.push([company]);
    wsData.push([`${title} - ${branch}`]);
    wsData.push([isArabic ? `تاريخ ووقت التصدير: ${timestamp}` : `Exported On: ${timestamp}`]);
    wsData.push([isArabic ? `إجمالي السجلات: ${rows.length}` : `Total Records: ${rows.length}`]);
    wsData.push([]); // Blank separator row

    // Table Header
    wsData.push(headers);

    // Table Data
    rows.forEach((row) => {
      const rowValues = keys.map((k) => row[k]);
      wsData.push(rowValues);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    const colWidths = headers.map((h, i) => {
      const key = keys[i];
      let maxLen = h.length;
      rows.forEach((r) => {
        const valStr = String(r[key] ?? '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
    });
    ws['!cols'] = colWidths;

    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Data');

    // Trigger file download
    const cleanFilename = `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, cleanFilename);
  }

  /**
   * Export to PDF (.pdf) format
   */
  exportToPdf(
    data: any[],
    columns: MasterColumn[],
    filename: string = 'Master_Export',
    title: string = 'Master Data Export'
  ) {
    const { rows, headers, keys } = this.prepareData(data, columns);
    const isArabic = this.translateService.currentLang() === 'ar';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const company = localStorage.getItem('currentCompany') || 'Your Events Management Company';
    const branch = localStorage.getItem('currentBranch') || 'Kiddie Kruzzer';

    // Initialize jsPDF in landscape or portrait based on column count
    const orientation = keys.length > 5 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    // Page title and Header banner
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.toUpperCase(), 14, 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${title} | ${branch}`, 14, 17);

    // Meta subheader
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFontSize(8);
    doc.text(
      isArabic
        ? `تاريخ التصدير: ${timestamp} | إجمالي السجلات: ${rows.length}`
        : `Export Date: ${timestamp} | Total Records: ${rows.length}`,
      14,
      28
    );

    // Map table body
    const tableBody = rows.map((r) => keys.map((k) => String(r[k] ?? '')));

    autoTable(doc, {
      head: [headers],
      body: tableBody,
      startY: 32,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: isArabic ? 'right' : 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        halign: isArabic ? 'right' : 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 32, left: 14, right: 14, bottom: 18 },
      didDrawPage: (dataObj) => {
        // Footer page numbering
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const footerText = isArabic
          ? `صفحة ${dataObj.pageNumber} من ${pageCount} - نظام كيدي كروزر POS`
          : `Page ${dataObj.pageNumber} of ${pageCount} - Kiddie Kruzzer POS System`;
        doc.text(footerText, 14, doc.internal.pageSize.height - 8);
      },
    });

    const cleanFilename = `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(cleanFilename);
  }

  /**
   * Export to CSV (.csv) format with UTF-8 BOM for Arabic & international support
   */
  exportToCsv(
    data: any[],
    columns: MasterColumn[],
    filename: string = 'Master_Export'
  ) {
    const { rows, headers, keys } = this.prepareData(data, columns);

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines: string[] = [];
    // Header line
    csvLines.push(headers.map((h) => escapeCsv(h)).join(','));

    // Data lines
    rows.forEach((r) => {
      const line = keys.map((k) => escapeCsv(r[k])).join(',');
      csvLines.push(line);
    });

    // Add UTF-8 BOM (\uFEFF) so Excel correctly recognizes Arabic encoding
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const cleanFilename = `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
