import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TranslateService } from './translate.service';
import { MasterColumn } from './export.service';

export type ThermalPaperWidth = '80mm' | '58mm';

@Injectable({
  providedIn: 'root',
})
export class PrintService {
  private http = inject(HttpClient);
  private translateService = inject(TranslateService);

  /**
   * DIRECT THERMAL PRINTING DISPATCHER (Zero Browser Print Dialog)
   * Sends the print payload directly to the backend ESC/POS thermal printer service.
   */
  printDirectThermal(payload: {
    printType: 'DUPLICATE' | 'CANCELLED' | 'ORIGINAL' | 'TEST' | 'SETTLEMENT';
    invoiceNo?: string;
    rental?: any;
    reprintCount?: number;
    reprintedBy?: string;
    cancelledAt?: string;
    cancelledBy?: string;
    cancellationReason?: string;
    cancellationRemarks?: string;
    companyName?: string;
    branchName?: string;
    locationName?: string;
    terminal?: string;
    cashierName?: string;
    printerConfig?: any;
    elapsedDuration?: string;
    depositAmount?: number | string;
    extraAmount?: number | string;
    discountAmount?: number | string;
    finalAmount?: number | string;
    changeReturned?: number | string;
  }): Observable<{ success: boolean; message: string; error?: string; latencyMs?: number }> {
    return this.http.post<any>('/api/printers/test-print', payload);
  }

  /**
   * Helper to execute print via an isolated iframe to prevent polluting or breaking main application UI
   */
  private printHtml(htmlContent: string, isThermal: boolean = false, paperWidth: ThermalPaperWidth = '80mm') {
    const isArabic = this.translateService.currentLang() === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';

    // Remove any previously created print iframe
    const oldIframe = document.getElementById('app-print-frame');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'app-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = paperWidth === '58mm' ? '58mm' : '80mm';
    iframe.style.height = '600px';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.opacity = '0';
    iframe.style.zIndex = '-9999';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const widthCss = paperWidth === '58mm' ? '58mm' : '80mm';
    const fontScale = paperWidth === '58mm' ? '12px' : '15px';

    const thermalStyles = isThermal
      ? `
        @page {
          margin: 4mm;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          width: ${widthCss};
          max-width: 100%;
          margin: 0 auto;
          padding: 8px 4px;
          font-family: 'Courier New', Courier, 'Cascadia Code', monospace, sans-serif;
          font-size: ${fontScale};
          font-weight: 600;
          line-height: 1.35;
          color: #000;
          background: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .uppercase { text-transform: uppercase; }
        .dashed-divider {
          border-top: 1.5px dashed #000;
          margin: 6px 0;
        }
        .solid-divider {
          border-top: 2px solid #000;
          margin: 6px 0;
        }
        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .flex-col { display: flex; flex-direction: column; }
        .gap-1 { gap: 2px; }
        .receipt-header {
          text-align: center;
          margin-bottom: 6px;
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .logo-box {
          display: inline-block;
          font-size: 17px;
          font-weight: 900;
          border: 2px solid #000;
          padding: 2px 8px;
          margin-bottom: 4px;
          word-break: break-word;
        }
        .title {
          font-size: 15px;
          font-weight: 900;
          word-break: break-word;
          overflow-wrap: break-word;
          line-height: 1.25;
        }
        .subtitle {
          font-size: 12px;
          font-weight: bold;
          word-break: break-word;
          overflow-wrap: break-word;
          line-height: 1.3;
        }
        .total-highlight {
          font-size: 16px;
          font-weight: 900;
        }
        .barcode-sim {
          text-align: center;
          letter-spacing: 4px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          margin: 6px 0;
          font-size: 10px;
        }
        .cut-line {
          text-align: center;
          font-size: 9px;
          margin-top: 12px;
          color: #333;
        }
      `
      : `
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 12px;
        }
        .header {
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-title {
          font-size: 18px;
          font-weight: bold;
          color: #4f46e5;
        }
        .meta-info {
          font-size: 10px;
          color: #64748b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
          color: #475569;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: monospace; }
        .card {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 14px;
          background: #f8fafc;
        }
        .footer {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          font-size: 9px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="${this.translateService.currentLang()}" dir="${dir}">
        <head>
          <meta charset="utf-8">
          <title>Print Document</title>
          <style>
            ${thermalStyles}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        const win = iframe.contentWindow;
        if (win) {
          win.onafterprint = () => {
            setTimeout(() => {
              if (iframe.parentNode) iframe.remove();
              window.focus();
            }, 2000);
          };
          win.focus();
          win.print();
        }
      } catch (e) {
        console.warn('Iframe print error:', e);
      } finally {
        window.focus();
        setTimeout(() => {
          if (iframe.parentNode) iframe.remove();
        }, 120000);
      }
    }, 300);
  }

  /**
   * 1. Bill / Rental Invoice Receipt (POS) - Standard and Thermal Printing
   */
  printRentalReceipt(rental: any, isThermal: boolean = true, paperWidth: ThermalPaperWidth = '80mm') {
    const isArabic = this.translateService.currentLang() === 'ar';
    const company = localStorage.getItem('currentCompany') || 'Your Events Management Company';
    const branch = localStorage.getItem('currentBranch') || 'Kiddie Kruzzer';
    const location = localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25';

    const invoiceNo = rental.invoice_no || rental.invoiceNo || 'INV-' + Date.now().toString().slice(-6);
    const dateStr = new Date(rental.start_time || rental.startTime || Date.now()).toLocaleDateString();
    const startTimeStr = rental.start_time || rental.startTime ? new Date(rental.start_time || rental.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
    const rawEnd = rental.actual_end_time || rental.actualEndTime || rental.end_time || rental.endTime || rental.expected_end_time || rental.expectedEndTime;
    const endTimeStr = rawEnd ? new Date(rawEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const customer = rental.customer_name || rental.customerName || (isArabic ? 'عميل نقدي' : 'Walk-in Customer');
    const phone = rental.customer_phone || rental.customerPhone || '-';
    const carNo = rental.car_no || rental.carNo || '-';
    const swappedFromCarNo = rental.swapped_from_car_no || rental.swappedFromCarNo || '';
    const model = rental.model || rental.car_model || '-';
    const duration = rental.elapsed_duration || rental.elapsedDuration || (rental.duration_minutes ? `${rental.duration_minutes} Mins` : '-');
    const depositAmount = Number(rental.deposit_amount ?? rental.depositAmount ?? rental.rental_amount ?? rental.rentalAmount ?? 0).toFixed(3);
    const rentalAmount = Number(rental.rental_amount || rental.rentalAmount || 0).toFixed(3);
    const extraAmount = Number(rental.extra_amount || rental.extraAmount || 0).toFixed(3);
    const discount = Number(rental.discount || 0).toFixed(3);
    const discountType = rental.discount_type || rental.discountType || '';
    const discountReason = rental.discount_reason || rental.discountReason || '';
    const remarks = rental.settlement_remarks || rental.settlementRemarks || rental.remarks || '';
    const totalAmount = Number(rental.total_amount || rental.totalAmount || 0).toFixed(3);
    const changeReturned = rental.change_returned !== undefined ? Number(rental.change_returned).toFixed(3) : (Number(depositAmount) > Number(totalAmount) ? (Number(depositAmount) - Number(totalAmount)).toFixed(3) : null);
    const paymentMethod = rental.payment_method || rental.paymentMethod || 'CASH';
    const cashAmount = rental.cash_amount ?? rental.cashAmount;
    const knetAmount = rental.knet_amount ?? rental.knetAmount;
    const cashier = rental.created_by || rental.createdBy || 'Cashier';

    let html = '';

    if (isThermal) {
      html = `
        <div class="receipt-header">
          <div class="logo-box">KIDDIE KRUZZER</div>
          <div class="title">${company}</div>
          <div class="subtitle">${branch} - ${location}</div>
          <div class="subtitle">${isArabic ? 'فاتورة تأجير سيارات أطفال' : 'CAR RENTAL TAX INVOICE'}</div>
        </div>

        <div class="dashed-divider"></div>

        <div class="flex-between">
          <span>${isArabic ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
          <span class="font-bold font-mono">${invoiceNo}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'التاريخ:' : 'Date:'}</span>
          <span>${dateStr}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'الكاشير:' : 'Cashier:'}</span>
          <span>${cashier}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'العميل:' : 'Customer:'}</span>
          <span class="font-bold">${customer}</span>
        </div>
        ${phone !== '-' ? `
        <div class="flex-between">
          <span>${isArabic ? 'الهاتف:' : 'Phone:'}</span>
          <span>${phone}</span>
        </div>` : ''}

        <div class="solid-divider"></div>

        <!-- Vehicle & Time Details -->
        <div class="flex-between font-bold">
          <span>${isArabic ? 'المركبة / الموديل:' : 'Vehicle / Model:'}</span>
          <span>${carNo} (${model})</span>
        </div>
        ${swappedFromCarNo ? `
        <div class="flex-between" style="font-size:10px; color:#4f46e5;">
          <span>${isArabic ? 'تم التبديل من:' : 'Swapped from:'}</span>
          <span class="font-mono">${swappedFromCarNo}</span>
        </div>` : ''}
        <div class="flex-between">
          <span>${isArabic ? 'وقت البدء:' : 'Start Time:'}</span>
          <span class="font-mono font-bold">${startTimeStr}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'وقت الانتهاء:' : 'End Time:'}</span>
          <span class="font-mono font-bold">${endTimeStr}</span>
        </div>
        <div class="flex-between" style="background:#f1f5f9; padding:2px 4px; border-radius:4px; margin-top:2px;">
          <span class="font-bold">${isArabic ? 'المدة الإجمالية للاستخدام:' : 'Total Usage Duration:'}</span>
          <span class="font-mono font-bold" style="color:#2563eb;">${duration}</span>
        </div>

        <div class="dashed-divider"></div>

        <div class="flex-between">
          <span>${isArabic ? 'العربون / الدفعة المقدمة:' : 'Deposit Paid:'}</span>
          <span class="font-mono">${depositAmount} KWD</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'المبلغ المحسوب:' : 'Calculated Charge:'}</span>
          <span class="font-mono">${rentalAmount} KWD</span>
        </div>
        ${Number(extraAmount) > 0 ? `
        <div class="flex-between">
          <span>${isArabic ? 'وقت إضافي:' : 'Overtime Extra:'}</span>
          <span class="font-mono">+${extraAmount} KWD</span>
        </div>` : ''}
        ${Number(discount) > 0 ? `
        <div class="flex-between">
          <span>${isArabic ? 'الخصم' + (discountType ? ' (' + discountType + ')' : '') + ':' : 'Discount' + (discountType ? ' (' + discountType + ')' : '') + ':'}</span>
          <span class="font-mono">-${discount} KWD</span>
        </div>` : ''}
        ${discountReason ? `
        <div class="flex-between" style="font-size:10px; color:#16a34a;">
          <span>${isArabic ? 'سبب الخصم:' : 'Discount Reason:'}</span>
          <span>${discountReason}</span>
        </div>` : ''}

        <div class="solid-divider"></div>

        <div class="flex-between total-highlight">
          <span>${isArabic ? 'الإجمالي الصافي:' : 'NET TOTAL:'}</span>
          <span class="font-mono">${totalAmount} KWD</span>
        </div>
        ${changeReturned && Number(changeReturned) > 0 ? `
        <div class="flex-between font-bold" style="color: #047857;">
          <span>${isArabic ? 'المتبقي المرجع للعميل:' : 'Refund to Customer:'}</span>
          <span class="font-mono">${changeReturned} KWD</span>
        </div>` : ''}

        <!-- Payment Method Details -->
        <div class="flex-between">
          <span>${isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</span>
          <span class="font-bold">${paymentMethod === 'SPLIT' ? (isArabic ? 'دفع مقسم (كاش + كي نت)' : 'SPLIT (Cash + KNET)') : paymentMethod}</span>
        </div>
        ${paymentMethod === 'SPLIT' ? `
        <div class="flex-between" style="font-size:11px; padding-left:8px;">
          <span>${isArabic ? '• نقداً (كاش):' : '• Cash Portion:'}</span>
          <span class="font-mono font-bold">${Number(cashAmount || 0).toFixed(3)} KWD</span>
        </div>
        <div class="flex-between" style="font-size:11px; padding-left:8px;">
          <span>${isArabic ? '• كي نت / بطاقة:' : '• KNET Portion:'}</span>
          <span class="font-mono font-bold">${Number(knetAmount || 0).toFixed(3)} KWD</span>
        </div>` : ''}

        ${remarks ? `
        <div class="flex-between" style="font-size:11px; margin-top:3px;">
          <span>${isArabic ? 'ملاحظات:' : 'Remarks:'}</span>
          <span>${remarks}</span>
        </div>` : ''}

        <div class="dashed-divider"></div>

        <!-- Dynamic Rate Tariff Footer -->
        <div style="border:1px dashed #475569; padding:5px; font-size:9px; line-height:1.4; border-radius:4px; margin-bottom:6px; background:#fafafa;">
          <div style="font-weight:bold; text-align:center; border-bottom:1px solid #cbd5e1; padding-bottom:2px; margin-bottom:3px;">
            Rate Tariff / تعرفة الأسعار
          </div>
          <div class="flex-between"><span>• 1st Hour – Single Car:</span> <span class="font-bold">KWD 1.000</span></div>
          <div class="flex-between" style="color:#64748b;"><span>  الساعة الأولى - سيارة فردية:</span> <span>1.000 د.ك</span></div>
          <div class="flex-between"><span>• 1st Hour – Double Car:</span> <span class="font-bold">KWD 2.000</span></div>
          <div class="flex-between" style="color:#64748b;"><span>  الساعة الأولى - سيارة زوجية:</span> <span>2.000 د.ك</span></div>
          <div class="flex-between"><span>• Add'l 1/2 Hr – Single:</span> <span class="font-bold">KWD 0.500</span></div>
          <div class="flex-between" style="color:#64748b;"><span>  نصف ساعة إضافية - فردية:</span> <span>0.500 د.ك</span></div>
          <div class="flex-between"><span>• Add'l 1/2 Hr – Double:</span> <span class="font-bold">KWD 1.000</span></div>
          <div class="flex-between" style="color:#64748b;"><span>  نصف ساعة إضافية - زوجية:</span> <span>1.000 د.ك</span></div>
        </div>

        <div class="barcode-sim">||| | |||| || ||||| |||| ||</div>
        <div class="text-center font-mono" style="font-size:9px;">${invoiceNo}</div>

        <div class="text-center" style="margin-top:6px;">
          <p class="font-bold">${isArabic ? 'شكراً لزيارتكم!' : 'Thank you for driving with us!'}</p>
          <p style="font-size:9px; color:#444;">${isArabic ? 'نتمنى لكم وقتاً ممتعاً وآمناً' : 'Please drive safely and enjoy!'}</p>
        </div>

        <div class="cut-line">------------------ ✂ ------------------</div>
      `;
    } else {
      // Standard A4 Layout
      html = `
        <div class="header">
          <div>
            <div class="logo-title">${company}</div>
            <div class="meta-info">${branch} | ${location}</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #1e293b;">${isArabic ? 'فاتورة تأجير' : 'RENTAL INVOICE'}</h2>
            <div class="font-mono font-bold" style="color: #4f46e5;">${invoiceNo}</div>
          </div>
        </div>

        <div class="card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div><strong>${isArabic ? 'العميل:' : 'Customer:'}</strong> ${customer}</div>
            <div><strong>${isArabic ? 'الهاتف:' : 'Phone:'}</strong> ${phone}</div>
            <div><strong>${isArabic ? 'الكاشير:' : 'Cashier:'}</strong> ${cashier}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>${isArabic ? 'التاريخ:' : 'Date:'}</strong> ${dateStr}</div>
            <div><strong>${isArabic ? 'وقت البدء:' : 'Start Time:'}</strong> ${startTimeStr}</div>
            <div><strong>${isArabic ? 'وقت الانتهاء:' : 'End Time:'}</strong> ${endTimeStr}</div>
            <div><strong>${isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</strong> ${paymentMethod === 'SPLIT' ? 'SPLIT (Cash + KNET)' : paymentMethod}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'بيانات السيارة' : 'Vehicle Description'}</th>
              <th>${isArabic ? 'الموديل' : 'Model'}</th>
              <th class="text-center">${isArabic ? 'وقت البدء - الانتهاء' : 'Start - End'}</th>
              <th class="text-center">${isArabic ? 'المدة الإجمالية' : 'Total Duration'}</th>
              <th class="text-right">${isArabic ? 'المبلغ (د.ك)' : 'Amount (KWD)'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${carNo}</strong>
                ${swappedFromCarNo ? `<br><small style="color:#6366f1;">(Swapped from: ${swappedFromCarNo})</small>` : ''}
              </td>
              <td>${model}</td>
              <td class="text-center font-mono" style="font-size:12px;">${startTimeStr} - ${endTimeStr}</td>
              <td class="text-center font-bold font-mono">${duration}</td>
              <td class="text-right font-mono">${rentalAmount}</td>
            </tr>
            ${Number(depositAmount) > 0 ? `
            <tr>
              <td colspan="4">${isArabic ? 'العربون المدفوع مقدماً' : 'Initial Deposit Paid'}</td>
              <td class="text-right font-mono">${depositAmount}</td>
            </tr>` : ''}
            ${Number(extraAmount) > 0 ? `
            <tr>
              <td colspan="4">${isArabic ? 'رسوم وقت إضافي' : 'Overtime Extra Charges'}</td>
              <td class="text-right font-mono">+${extraAmount}</td>
            </tr>` : ''}
            ${Number(discount) > 0 ? `
            <tr>
              <td colspan="4" style="color: green;">
                ${isArabic ? 'الخصم' + (discountType ? ' (' + discountType + ')' : '') : 'Discount' + (discountType ? ' (' + discountType + ')' : '')}
                ${discountReason ? ` - <small>(${discountReason})</small>` : ''}
              </td>
              <td class="text-right font-mono" style="color: green;">-${discount}</td>
            </tr>` : ''}
            ${paymentMethod === 'SPLIT' ? `
            <tr style="background:#f8fafc; font-size:11px;">
              <td colspan="4"><strong>${isArabic ? 'تفاصيل الدفع المقسم:' : 'Split Payment Breakdown:'}</strong></td>
              <td class="text-right font-mono">Cash: ${Number(cashAmount || 0).toFixed(3)} | KNET: ${Number(knetAmount || 0).toFixed(3)}</td>
            </tr>` : ''}
            ${remarks ? `
            <tr>
              <td colspan="5" style="font-size: 11px; color: #64748b;"><strong>${isArabic ? 'ملاحظات:' : 'Remarks:'}</strong> ${remarks}</td>
            </tr>` : ''}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #e0e7ff; font-size: 13px;">
              <td colspan="4">${isArabic ? 'الإجمالي النهائي' : 'GRAND TOTAL'}</td>
              <td class="text-right font-mono" style="color: #4338ca;">${totalAmount} KWD</td>
            </tr>
            ${changeReturned && Number(changeReturned) > 0 ? `
            <tr style="font-weight: bold; background: #d1fae5; font-size: 13px; color: #065f46;">
              <td colspan="4">${isArabic ? 'المبلغ المسترد للعميل' : 'REFUND TO CUSTOMER'}</td>
              <td class="text-right font-mono">${changeReturned} KWD</td>
            </tr>` : ''}
          </tfoot>
        </table>

        <!-- Rate Tariff Box in A4 -->
        <div style="margin-top:16px; border:1px solid #cbd5e1; border-radius:8px; padding:12px; background:#f8fafc;">
          <h4 style="margin:0 0 8px 0; font-size:12px; color:#1e293b; text-transform:uppercase; letter-spacing:0.5px;">Rate Tariff / تعرفة الأسعار</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px;">
            <div>• First Hour – Single Car: <strong>KWD 1.000</strong> (الساعة الأولى - فردية: 1.000 د.ك)</div>
            <div>• First Hour – Double Car: <strong>KWD 2.000</strong> (الساعة الأولى - زوجية: 2.000 د.ك)</div>
            <div>• Additional Half-Hour – Single Car: <strong>KWD 0.500</strong> (كل نصف ساعة إضافية - فردية: 0.500 د.ك)</div>
            <div>• Additional Half-Hour – Double Car: <strong>KWD 1.000</strong> (كل نصف ساعة إضافية - زوجية: 1.000 د.ك)</div>
          </div>
        </div>

        <div class="footer">
          <span>${company} - POS Official Receipt</span>
          <span>${isArabic ? 'نتمنى لكم تجربة ممتعة!' : 'Thank you for choosing Kiddie Kruzzer!'}</span>
        </div>
      `;
    }

    this.printHtml(html, isThermal, paperWidth);
  }

  /**
   * Render the 6 comprehensive audit and revenue summaries:
   * 1) Cashier-wise summary with Sales Total
   * 2) Bill-wise summary with Sales Total
   * 3) CAR-wise summary with Sales Total
   * 4) Hourly sales-wise summary with Sales Total
   * 5) Cancellation bills summary with Sales Total
   * 6) Payment type-wise summary with Sales Total
   */
  renderDetailedSummariesHtml(summaries: any, isThermal: boolean, isArabic: boolean): string {
    if (!summaries) return '';

    const {
      cashierSummary,
      billSummary,
      carSummary,
      hourlySummary,
      cancellationSummary,
      paymentTypeSummary
    } = summaries;

    if (!cashierSummary && !billSummary && !carSummary && !hourlySummary && !cancellationSummary && !paymentTypeSummary) {
      return '';
    }

    if (isThermal) {
      let th = '';

      // 1) Cashier-wise Summary with Sales Total
      if (cashierSummary?.items?.length) {
        th += `
          <div class="solid-divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase;">
            ${isArabic ? '1. ملخص الكاشير وإجمالي المبيعات' : '1. CASHIER WISE SUMMARY'}
          </div>
          <table style="width:100%; font-size:9px; border-collapse:collapse; margin-bottom:4px;">
            <thead>
              <tr style="border-bottom:1px dashed #000;">
                <th style="text-align:left;">${isArabic ? 'الكاشير' : 'Cashier'}</th>
                <th style="text-align:center;">${isArabic ? 'فواتير' : 'Bills'}</th>
                <th style="text-align:right;">${isArabic ? 'المبيعات' : 'Sales'}</th>
              </tr>
            </thead>
            <tbody>
              ${cashierSummary.items.map((c: any) => `
                <tr>
                  <td style="text-align:left;">${c.cashier}</td>
                  <td style="text-align:center;">${c.billCount}</td>
                  <td style="text-align:right; font-family:monospace;">${c.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:1px solid #000; font-weight:bold;">
                <td>${isArabic ? 'إجمالي المبيعات:' : 'Sales Total:'}</td>
                <td style="text-align:center;">${cashierSummary.totalBills}</td>
                <td style="text-align:right; font-family:monospace;">${cashierSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        `;
      }

      // 2) Bill-wise Summary with Sales Total
      if (billSummary?.items?.length) {
        th += `
          <div class="solid-divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase;">
            ${isArabic ? '2. ملخص الفواتير وإجمالي المبيعات' : '2. BILL WISE SUMMARY'}
          </div>
          <table style="width:100%; font-size:8.5px; border-collapse:collapse; margin-bottom:4px;">
            <thead>
              <tr style="border-bottom:1px dashed #000;">
                <th style="text-align:left;">${isArabic ? 'الفاتورة' : 'Inv#'}</th>
                <th style="text-align:left;">${isArabic ? 'السيارة' : 'Car'}</th>
                <th style="text-align:center;">${isArabic ? 'طريقة' : 'Pay'}</th>
                <th style="text-align:right;">${isArabic ? 'المبلغ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              ${billSummary.items.map((b: any) => `
                <tr>
                  <td style="text-align:left; font-family:monospace;">${b.invoiceNo || b.id}</td>
                  <td style="text-align:left;">${b.carNo}</td>
                  <td style="text-align:center;">${b.paymentMethod}</td>
                  <td style="text-align:right; font-family:monospace;">${b.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:1px solid #000; font-weight:bold;">
                <td colspan="2">${isArabic ? 'إجمالي الفواتير:' : 'Sales Total:'}</td>
                <td style="text-align:center;">${billSummary.totalBills}</td>
                <td style="text-align:right; font-family:monospace;">${billSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        `;
      }

      // 3) CAR-wise Summary with Sales Total
      if (carSummary?.items?.length) {
        th += `
          <div class="solid-divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase;">
            ${isArabic ? '3. ملخص السيارات وإجمالي المبيعات' : '3. CAR WISE SUMMARY'}
          </div>
          <table style="width:100%; font-size:9px; border-collapse:collapse; margin-bottom:4px;">
            <thead>
              <tr style="border-bottom:1px dashed #000;">
                <th style="text-align:left;">${isArabic ? 'السيارة' : 'Car#'}</th>
                <th style="text-align:center;">${isArabic ? 'رحلات' : 'Trips'}</th>
                <th style="text-align:center;">${isArabic ? 'دقائق' : 'Mins'}</th>
                <th style="text-align:right;">${isArabic ? 'المبيعات' : 'Sales'}</th>
              </tr>
            </thead>
            <tbody>
              ${carSummary.items.map((cr: any) => `
                <tr>
                  <td style="text-align:left;">${cr.carNo}</td>
                  <td style="text-align:center;">${cr.tripCount}</td>
                  <td style="text-align:center;">${cr.totalMinutes}</td>
                  <td style="text-align:right; font-family:monospace;">${cr.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:1px solid #000; font-weight:bold;">
                <td>${isArabic ? 'إجمالي المبيعات:' : 'Sales Total:'}</td>
                <td style="text-align:center;">${carSummary.totalTrips}</td>
                <td style="text-align:center;">${carSummary.totalMinutes}m</td>
                <td style="text-align:right; font-family:monospace;">${carSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        `;
      }

      // 4) Hourly Sales-wise Summary with Sales Total
      if (hourlySummary?.items?.length) {
        th += `
          <div class="solid-divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase;">
            ${isArabic ? '4. مبيعات الساعات وإجمالي المبيعات' : '4. HOURLY SALES SUMMARY'}
          </div>
          <table style="width:100%; font-size:9px; border-collapse:collapse; margin-bottom:4px;">
            <thead>
              <tr style="border-bottom:1px dashed #000;">
                <th style="text-align:left;">${isArabic ? 'الساعة' : 'Hour'}</th>
                <th style="text-align:center;">${isArabic ? 'فواتير' : 'Bills'}</th>
                <th style="text-align:right;">${isArabic ? 'المبيعات' : 'Sales'}</th>
              </tr>
            </thead>
            <tbody>
              ${hourlySummary.items.map((h: any) => `
                <tr>
                  <td style="text-align:left;">${h.hourLabel || h.hourSlot}</td>
                  <td style="text-align:center;">${h.billCount}</td>
                  <td style="text-align:right; font-family:monospace;">${h.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:1px solid #000; font-weight:bold;">
                <td>${isArabic ? 'إجمالي المبيعات:' : 'Sales Total:'}</td>
                <td style="text-align:center;">${hourlySummary.totalBills}</td>
                <td style="text-align:right; font-family:monospace;">${hourlySummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        `;
      }

      // 5) Cancellation Bills Summary with Sales Total
      if (cancellationSummary) {
        th += `
          <div class="solid-divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase; color:#b91c1c;">
            ${isArabic ? '5. فواتير الإلغاء وإجمالي المبيعات' : '5. CANCELLATION BILLS SUMMARY'}
          </div>
        `;
        if (cancellationSummary.items?.length) {
          th += `
            <table style="width:100%; font-size:8.5px; border-collapse:collapse; margin-bottom:4px;">
              <thead>
                <tr style="border-bottom:1px dashed #000;">
                  <th style="text-align:left;">${isArabic ? 'الفاتورة' : 'Inv#'}</th>
                  <th style="text-align:left;">${isArabic ? 'السبب' : 'Reason'}</th>
                  <th style="text-align:right;">${isArabic ? 'الملغى' : 'Void'}</th>
                </tr>
              </thead>
              <tbody>
                ${cancellationSummary.items.map((cn: any) => `
                  <tr>
                    <td style="text-align:left; font-family:monospace;">${cn.invoiceNo || cn.id}</td>
                    <td style="text-align:left;">${cn.cancellationReason}</td>
                    <td style="text-align:right; font-family:monospace; color:#b91c1c;">${cn.cancelledAmount}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="border-top:1px solid #000; font-weight:bold; color:#b91c1c;">
                  <td colspan="2">${isArabic ? 'إجمالي فواتير الإلغاء:' : 'Cancelled Total:'} (${cancellationSummary.totalCancelledBills})</td>
                  <td style="text-align:right; font-family:monospace;">${cancellationSummary.salesTotal} KWD</td>
                </tr>
              </tfoot>
            </table>
          `;
        } else {
          th += `<p style="font-size:9px; color:#64748b; margin:2px 0;">${isArabic ? 'لا توجد فواتير ملغاة في هذه الوردية' : 'No cancelled bills'}</p>`;
        }
      }

      // 6) Payment Type-wise Summary with Sales Total
      if (paymentTypeSummary?.items?.length) {
        th += `
          <div class="solid-divider"></div>
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase;">
            ${isArabic ? '6. ملخص طرق الدفع وإجمالي المبيعات' : '6. PAYMENT TYPE SUMMARY'}
          </div>
          <table style="width:100%; font-size:9px; border-collapse:collapse; margin-bottom:4px;">
            <thead>
              <tr style="border-bottom:1px dashed #000;">
                <th style="text-align:left;">${isArabic ? 'طريقة الدفع' : 'Method'}</th>
                <th style="text-align:center;">${isArabic ? 'عدد' : 'Tx'}</th>
                <th style="text-align:center;">%</th>
                <th style="text-align:right;">${isArabic ? 'المبيعات' : 'Sales'}</th>
              </tr>
            </thead>
            <tbody>
              ${paymentTypeSummary.items.map((p: any) => `
                <tr>
                  <td style="text-align:left;">${p.paymentMethod}</td>
                  <td style="text-align:center;">${p.transactionCount}</td>
                  <td style="text-align:center;">${p.percentage}%</td>
                  <td style="text-align:right; font-family:monospace;">${p.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:1px solid #000; font-weight:bold;">
                <td>${isArabic ? 'إجمالي المبيعات:' : 'Sales Total:'}</td>
                <td style="text-align:center;">${paymentTypeSummary.totalTransactions}</td>
                <td style="text-align:center;">100%</td>
                <td style="text-align:right; font-family:monospace;">${paymentTypeSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        `;
      }

      return th;
    }

    // A4 Standard Layout
    let a4 = `
      <div style="margin-top: 25px; page-break-before: auto;">
        <h3 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #ea580c; padding-bottom: 6px; font-size: 16px;">
          ${isArabic ? 'المحاور الستة للملخص المالي والتشغيلي للتقرير' : 'COMPREHENSIVE AUDIT & REVENUE SUMMARIES'}
        </h3>
    `;

    // 1) Cashier-wise Summary with Sales Total
    if (cashierSummary?.items?.length) {
      a4 += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; font-weight: bold;">
            ${isArabic ? '1. ملخص المبيعات حسب الكاشير (مع إجمالي المبيعات)' : '1. Cashier-wise Summary with Sales Total'}
          </h4>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
            <thead>
              <tr style="background:#f8fafc; border:1px solid #cbd5e1;">
                <th style="padding:6px; text-align:left;">${isArabic ? 'اسم الكاشير' : 'Cashier Name'}</th>
                <th style="padding:6px; text-align:center;">${isArabic ? 'عدد الفواتير' : 'Bill Count'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'المقبوضات نقداً' : 'Cash Collections (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'مبيعات كي نت' : 'KNET Collections (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'الخصومات' : 'Discounts (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات' : 'Sales Total (KD)'}</th>
              </tr>
            </thead>
            <tbody>
              ${cashierSummary.items.map((c: any) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:6px; font-weight:bold;">${c.cashier}</td>
                  <td style="padding:6px; text-align:center;">${c.billCount}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${c.cashTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${c.knetTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace; color:#16a34a;">-${c.discountTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;">${c.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold; border:1px solid #cbd5e1;">
                <td style="padding:6px;">${isArabic ? 'إجمالي الكاشير' : 'Total Cashier Sales'}</td>
                <td style="padding:6px; text-align:center;">${cashierSummary.totalBills} Bills</td>
                <td colspan="3" style="padding:6px; text-align:right; font-weight:bold;">${isArabic ? 'إجمالي المبيعات (Sales Total):' : 'SALES TOTAL:'}</td>
                <td style="padding:6px; text-align:right; font-family:monospace; color:#ea580c; font-size:12px;">${cashierSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 2) Bill-wise Summary with Sales Total
    if (billSummary?.items?.length) {
      a4 += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; font-weight: bold;">
            ${isArabic ? '2. تفصيل الفواتير المكتملة (مع إجمالي المبيعات)' : '2. Bill-wise Summary with Sales Total'}
          </h4>
          <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:8px;">
            <thead>
              <tr style="background:#f8fafc; border:1px solid #cbd5e1;">
                <th style="padding:5px; text-align:left;">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'السيارة والموديل' : 'Car # / Model'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'العميل' : 'Customer'}</th>
                <th style="padding:5px; text-align:center;">${isArabic ? 'الوقت' : 'Time'}</th>
                <th style="padding:5px; text-align:center;">${isArabic ? 'المدة' : 'Duration'}</th>
                <th style="padding:5px; text-align:center;">${isArabic ? 'الدفع' : 'Payment'}</th>
                <th style="padding:5px; text-align:right;">${isArabic ? 'المبيعات' : 'Sales (KD)'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'الكاشير' : 'Cashier'}</th>
              </tr>
            </thead>
            <tbody>
              ${billSummary.items.map((b: any) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:5px; font-family:monospace; font-weight:bold;">${b.invoiceNo || b.id}</td>
                  <td style="padding:5px;">${b.carNo} <span style="color:#64748b;">(${b.model || ''})</span></td>
                  <td style="padding:5px;">${b.customerName || 'Walk-in'}</td>
                  <td style="padding:5px; text-align:center;">${b.startTime ? new Date(b.startTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '-'}</td>
                  <td style="padding:5px; text-align:center;">${b.durationMinutes || 0} m</td>
                  <td style="padding:5px; text-align:center; font-weight:bold;">${b.paymentMethod}</td>
                  <td style="padding:5px; text-align:right; font-family:monospace; font-weight:bold;">${b.totalSales}</td>
                  <td style="padding:5px; color:#64748b;">${b.cashier}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold; border:1px solid #cbd5e1;">
                <td colspan="4" style="padding:6px;">${isArabic ? 'إجمالي عدد الفواتير المنفذة:' : 'Completed Bills Count:'} ${billSummary.totalBills}</td>
                <td colspan="2" style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات (Sales Total):' : 'SALES TOTAL:'}</td>
                <td style="padding:6px; text-align:right; font-family:monospace; color:#ea580c; font-size:12px;">${billSummary.salesTotal} KWD</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 3) CAR-wise Summary with Sales Total
    if (carSummary?.items?.length) {
      a4 += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; font-weight: bold;">
            ${isArabic ? '3. ملخص المبيعات حسب السيارة (مع إجمالي المبيعات)' : '3. CAR-wise Summary with Sales Total'}
          </h4>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
            <thead>
              <tr style="background:#f8fafc; border:1px solid #cbd5e1;">
                <th style="padding:6px; text-align:left;">${isArabic ? 'رقم السيارة' : 'Car No.'}</th>
                <th style="padding:6px; text-align:left;">${isArabic ? 'الموديل / الفئة' : 'Model / Class'}</th>
                <th style="padding:6px; text-align:center;">${isArabic ? 'عدد الرحلات' : 'Total Trips'}</th>
                <th style="padding:6px; text-align:center;">${isArabic ? 'إجمالي التشغيل' : 'Total Duration'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'نقداً (كاش)' : 'Cash (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'كي نت' : 'KNET (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات' : 'Sales Total (KD)'}</th>
              </tr>
            </thead>
            <tbody>
              ${carSummary.items.map((cr: any) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:6px; font-weight:bold; font-family:monospace;">${cr.carNo}</td>
                  <td style="padding:6px;">${cr.model || '-'}</td>
                  <td style="padding:6px; text-align:center; font-weight:bold;">${cr.tripCount}</td>
                  <td style="padding:6px; text-align:center;">${cr.totalMinutes} mins</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${cr.cashTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${cr.knetTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;">${cr.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold; border:1px solid #cbd5e1;">
                <td style="padding:6px;">${isArabic ? 'إجمالي السيارات:' : 'Cars:'} ${carSummary.totalCars}</td>
                <td style="padding:6px;"></td>
                <td style="padding:6px; text-align:center;">${carSummary.totalTrips} Trips</td>
                <td style="padding:6px; text-align:center;">${carSummary.totalMinutes} mins</td>
                <td colspan="2" style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات (Sales Total):' : 'SALES TOTAL:'}</td>
                <td style="padding:6px; text-align:right; font-family:monospace; color:#ea580c; font-size:12px;">${carSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 4) Hourly Sales-wise Summary with Sales Total
    if (hourlySummary?.items?.length) {
      a4 += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; font-weight: bold;">
            ${isArabic ? '4. ملخص المبيعات بالساعة (مع إجمالي المبيعات)' : '4. Hourly Sales-wise Summary with Sales Total'}
          </h4>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
            <thead>
              <tr style="background:#f8fafc; border:1px solid #cbd5e1;">
                <th style="padding:6px; text-align:left;">${isArabic ? 'الفترة الزمنية' : 'Hourly Slot'}</th>
                <th style="padding:6px; text-align:center;">${isArabic ? 'عدد العمليات' : 'Bills / Transactions'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'كاش (د.ك)' : 'Cash (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'كي نت (د.ك)' : 'KNET (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات' : 'Sales Total (KD)'}</th>
              </tr>
            </thead>
            <tbody>
              ${hourlySummary.items.map((h: any) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:6px; font-weight:bold;">${h.hourLabel || h.hourSlot}</td>
                  <td style="padding:6px; text-align:center;">${h.billCount}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${h.cashTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${h.knetTotal}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;">${h.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold; border:1px solid #cbd5e1;">
                <td style="padding:6px;">${isArabic ? 'إجمالي الفترات' : 'Total Across Hours'}</td>
                <td style="padding:6px; text-align:center;">${hourlySummary.totalBills} Bills</td>
                <td colspan="2" style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات (Sales Total):' : 'SALES TOTAL:'}</td>
                <td style="padding:6px; text-align:right; font-family:monospace; color:#ea580c; font-size:12px;">${hourlySummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 5) Cancellation Bills Summary with Sales Total
    if (cancellationSummary) {
      a4 += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 13px; font-weight: bold;">
            ${isArabic ? '5. ملخص الفواتير الملغاة (مع إجمالي المبالغ الملغاة)' : '5. Cancellation Bills Summary with Sales Total'}
          </h4>
      `;
      if (cancellationSummary.items?.length) {
        a4 += `
          <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:8px;">
            <thead>
              <tr style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b;">
                <th style="padding:5px; text-align:left;">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'السيارة' : 'Car # / Model'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'العميل' : 'Customer'}</th>
                <th style="padding:5px; text-align:center;">${isArabic ? 'وقت الإلغاء' : 'Cancelled At'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'أُلغيت بواسطة' : 'Cancelled By'}</th>
                <th style="padding:5px; text-align:left;">${isArabic ? 'سبب الإلغاء' : 'Cancellation Reason'}</th>
                <th style="padding:5px; text-align:right;">${isArabic ? 'المبلغ الملغى' : 'Void Amount (KD)'}</th>
              </tr>
            </thead>
            <tbody>
              ${cancellationSummary.items.map((cn: any) => `
                <tr style="border-bottom:1px solid #fee2e2;">
                  <td style="padding:5px; font-family:monospace; font-weight:bold; color:#b91c1c;">${cn.invoiceNo || cn.id}</td>
                  <td style="padding:5px;">${cn.carNo} (${cn.model || ''})</td>
                  <td style="padding:5px;">${cn.customerName || 'Walk-in'}</td>
                  <td style="padding:5px; text-align:center;">${cn.cancelledAt ? new Date(cn.cancelledAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '-'}</td>
                  <td style="padding:5px; font-weight:bold;">${cn.cancelledBy}</td>
                  <td style="padding:5px;">${cn.cancellationReason}</td>
                  <td style="padding:5px; text-align:right; font-family:monospace; font-weight:bold; color:#b91c1c;">${cn.cancelledAmount}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#fee2e2; font-weight:bold; border:1px solid #fecaca; color:#991b1b;">
                <td colspan="4" style="padding:6px;">${isArabic ? 'إجمالي الفواتير الملغاة:' : 'Total Cancelled Bills:'} ${cancellationSummary.totalCancelledBills}</td>
                <td colspan="2" style="padding:6px; text-align:right;">${isArabic ? 'إجمالي مبالغ الإلغاء:' : 'TOTAL VOID AMOUNT:'}</td>
                <td style="padding:6px; text-align:right; font-family:monospace; color:#b91c1c; font-size:12px;">${cancellationSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        `;
      } else {
        a4 += `<div style="padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; color:#64748b; font-size:11px;">
          ${isArabic ? 'لا توجد فواتير ملغاة خلال هذه الوردية.' : 'No cancelled bills during this shift.'}
        </div>`;
      }
      a4 += `</div>`;
    }

    // 6) Payment Type-wise Summary with Sales Total
    if (paymentTypeSummary?.items?.length) {
      a4 += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; font-weight: bold;">
            ${isArabic ? '6. ملخص طرق الدفع (مع إجمالي المبيعات)' : '6. Payment Type-wise Summary with Sales Total'}
          </h4>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
            <thead>
              <tr style="background:#f8fafc; border:1px solid #cbd5e1;">
                <th style="padding:6px; text-align:left;">${isArabic ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th style="padding:6px; text-align:center;">${isArabic ? 'عدد المعاملات' : 'Transaction Count'}</th>
                <th style="padding:6px; text-align:center;">${isArabic ? 'النسبة المئوية' : 'Share (%)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'حصة الكاش' : 'Cash Portion (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'حصة كي نت' : 'KNET Portion (KD)'}</th>
                <th style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات' : 'Sales Total (KD)'}</th>
              </tr>
            </thead>
            <tbody>
              ${paymentTypeSummary.items.map((p: any) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:6px; font-weight:bold;">${p.paymentMethod}</td>
                  <td style="padding:6px; text-align:center;">${p.transactionCount}</td>
                  <td style="padding:6px; text-align:center; font-weight:bold; color:#4f46e5;">${p.percentage}%</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${p.cashPortion}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace;">${p.knetPortion}</td>
                  <td style="padding:6px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;">${p.totalSales}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold; border:1px solid #cbd5e1;">
                <td style="padding:6px;">${isArabic ? 'إجمالي التحصيلات' : 'Total Collections'}</td>
                <td style="padding:6px; text-align:center;">${paymentTypeSummary.totalTransactions} Tx</td>
                <td style="padding:6px; text-align:center;">100%</td>
                <td colspan="2" style="padding:6px; text-align:right;">${isArabic ? 'إجمالي المبيعات (Sales Total):' : 'SALES TOTAL:'}</td>
                <td style="padding:6px; text-align:right; font-family:monospace; color:#ea580c; font-size:12px;">${paymentTypeSummary.salesTotal} KWD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    a4 += `</div>`;
    return a4;
  }

  /**
   * 2. Shift Closing Report - Standard and Thermal Printing
   */
  printShiftReport(shift: any, isThermal: boolean = true, paperWidth: ThermalPaperWidth = '80mm') {
    const isArabic = this.translateService.currentLang() === 'ar';
    const company = localStorage.getItem('currentCompany') || 'Your Events Management Company';
    const branch = localStorage.getItem('currentBranch') || 'Kiddie Kruzzer';
    const location = localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25';

    const shiftId = shift.id || 'N/A';
    const cashier = shift.username || shift.cashierName || 'Cashier';
    const startTime = new Date(shift.startTime || shift.start_time || Date.now()).toLocaleString();
    const endTime = shift.endTime || shift.end_time ? new Date(shift.endTime || shift.end_time).toLocaleString() : new Date().toLocaleString();
    const openingCash = Number(shift.openingCash || shift.opening_cash || 0).toFixed(3);
    const cashTotal = Number(shift.cashTotal || shift.cash_total || shift.closingCash || 0).toFixed(3);
    const knetTotal = Number(shift.knetTotal || shift.knet_total || 0).toFixed(3);
    const totalDiscount = Number(shift.totalDiscount || shift.total_discount || 0).toFixed(3);
    const overallTotal = Number(shift.overallTotal || shift.overall_total || (Number(cashTotal) + Number(knetTotal))).toFixed(3);
    const rentalCount = shift.rentalCount ?? shift.totalRentals ?? shift.total_rentals ?? '-';
    const totalCarsUsed = shift.totalCarsUsed ?? shift.total_cars_used ?? rentalCount;
    const notes = shift.notes || (isArabic ? 'إغلاق وردية روتيني' : 'Routine shift settlement');
    const detailedSummariesHtml = this.renderDetailedSummariesHtml(shift.summaries, isThermal, isArabic);

    let html = '';

    if (isThermal) {
      html = `
        <div class="receipt-header">
          <div class="logo-box">SHIFT CLOSE</div>
          <div class="title">${company}</div>
          <div class="subtitle">${branch} - ${location}</div>
          <div class="subtitle font-bold">${isArabic ? 'تقرير إغلاق الوردية (كاشير)' : 'CASHIER SHIFT REPORT'}</div>
        </div>

        <div class="dashed-divider"></div>

        <div class="flex-between">
          <span>${isArabic ? 'رقم الوردية:' : 'Shift ID:'}</span>
          <span class="font-bold font-mono">#${shiftId}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'اسم الكاشير:' : 'Cashier Name:'}</span>
          <span class="font-bold">${cashier}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'بداية الوردية:' : 'Start Time:'}</span>
          <span>${startTime}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'نهاية الوردية:' : 'End Time:'}</span>
          <span>${endTime}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'عدد التأجيرات المنفذة:' : 'Total Rentals:'}</span>
          <span class="font-bold">${rentalCount}</span>
        </div>
        <div class="flex-between font-bold" style="background:#f1f5f9; padding:2px 4px; border-radius:4px;">
          <span>${isArabic ? 'إجمالي السيارات المستخدمة:' : 'Total Cars Used:'}</span>
          <span class="font-mono text-indigo-700">${totalCarsUsed}</span>
        </div>

        <div class="solid-divider"></div>

        <div class="flex-between">
          <span>${isArabic ? 'رصيد الافتتاح (عهدة):' : 'Opening Float:'}</span>
          <span class="font-mono">${openingCash} KWD</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'إجمالي المقبوضات النقدية:' : 'Cash Collections:'}</span>
          <span class="font-mono font-bold">${cashTotal} KWD</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'مبيعات شبكة / كي نت:' : 'KNET / Card Total:'}</span>
          <span class="font-mono font-bold">${knetTotal} KWD</span>
        </div>
        ${Number(totalDiscount) > 0 ? `
        <div class="flex-between text-green-700">
          <span>${isArabic ? 'إجمالي الخصومات الممنوحة:' : 'Total Discounts Granted:'}</span>
          <span class="font-mono font-bold">-${totalDiscount} KWD</span>
        </div>` : ''}

        <div class="solid-divider"></div>

        <div class="flex-between total-highlight">
          <span>${isArabic ? 'صافي إيراد الوردية المستلم:' : 'NET RECEIVED AMOUNT:'}</span>
          <span class="font-mono">${overallTotal} KWD</span>
        </div>

        ${detailedSummariesHtml}

        <div class="dashed-divider"></div>

        <div>
          <span class="font-bold">${isArabic ? 'ملاحظات:' : 'Notes:'}</span>
          <p style="margin: 3px 0; font-size: 10px;">${notes}</p>
        </div>

        <div style="margin-top: 18px;">
          <div class="flex-between" style="font-size: 10px;">
            <span>${isArabic ? 'توقيع الكاشير:' : 'Cashier Signature:'}</span>
            <span>.......................</span>
          </div>
          <div class="flex-between" style="font-size: 10px; margin-top: 10px;">
            <span>${isArabic ? 'توقيع المشرف:' : 'Supervisor Signature:'}</span>
            <span>.......................</span>
          </div>
        </div>

        <div class="cut-line">------------------ ✂ ------------------</div>
      `;
    } else {
      // Standard A4 Layout
      html = `
        <div class="header">
          <div>
            <div class="logo-title">${company}</div>
            <div class="meta-info">${branch} | ${location}</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #ea580c;">${isArabic ? 'تقرير إغلاق الوردية' : 'SHIFT CLOSING REPORT'}</h2>
            <div class="font-mono font-bold" style="color: #475569;">Shift #${shiftId}</div>
          </div>
        </div>

        <div class="card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div><strong>${isArabic ? 'الكاشير:' : 'Cashier:'}</strong> ${cashier}</div>
            <div><strong>${isArabic ? 'عدد الإيجارات المنفذة:' : 'Rentals Processed:'}</strong> ${rentalCount}</div>
            <div><strong>${isArabic ? 'إجمالي السيارات المستخدمة:' : 'Total Cars Used:'}</strong> <span style="color:#4f46e5; font-weight:bold;">${totalCarsUsed}</span></div>
            <div><strong>${isArabic ? 'رصيد الافتتاح:' : 'Opening Float:'}</strong> ${openingCash} KWD</div>
          </div>
          <div style="text-align: right;">
            <div><strong>${isArabic ? 'وقت البدء:' : 'Start Time:'}</strong> ${startTime}</div>
            <div><strong>${isArabic ? 'وقت الإغلاق:' : 'Close Time:'}</strong> ${endTime}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'بيان المدفوعات والتحصيلات' : 'Payment & Collection Breakdown'}</th>
              <th class="text-right">${isArabic ? 'المبلغ المحصل (د.ك)' : 'Collected Amount (KWD)'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${isArabic ? 'مقبوضات نقدية (كاش)' : 'Cash Collections'}</strong></td>
              <td class="text-right font-mono">${cashTotal}</td>
            </tr>
            <tr>
              <td><strong>${isArabic ? 'مبيعات كي نت / بطاقات إلكترونية' : 'KNET / Card Transactions'}</strong></td>
              <td class="text-right font-mono">${knetTotal}</td>
            </tr>
            ${Number(totalDiscount) > 0 ? `
            <tr style="color: green;">
              <td><strong>${isArabic ? 'إجمالي الخصومات الممنوحة' : 'Total Discounts Granted'}</strong></td>
              <td class="text-right font-mono">-${totalDiscount}</td>
            </tr>` : ''}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #ffedd5; font-size: 13px;">
              <td>${isArabic ? 'صافي إجمالي إيراد الوردية' : 'NET RECEIVED AMOUNT'}</td>
              <td class="text-right font-mono" style="color: #c2410c;">${overallTotal} KWD</td>
            </tr>
          </tfoot>
        </table>

        ${detailedSummariesHtml}

        <div style="margin-top: 20px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <strong>${isArabic ? 'ملاحظات الإغلاق:' : 'Shift Closing Notes:'}</strong>
          <p style="margin: 4px 0 0 0;">${notes}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;">
          <div style="border-top: 1px solid #64748b; padding-top: 6px; text-align: center;">
            ${isArabic ? 'توقيع مسؤول الوردية' : 'Cashier Signature'}
          </div>
          <div style="border-top: 1px solid #64748b; padding-top: 6px; text-align: center;">
            ${isArabic ? 'توقيع المشرف / الإدارة' : 'Manager / Auditor Signature'}
          </div>
        </div>

        <div class="footer">
          <span>${company} - Shift Settlement Record</span>
          <span>Printed on: ${new Date().toLocaleString()}</span>
        </div>
      `;
    }

    this.printHtml(html, isThermal, paperWidth);
  }

  /**
   * 3. Day Close Audit Report - Standard and Thermal Printing
   */
  printClosingReport(closing: any, isThermal: boolean = true, paperWidth: ThermalPaperWidth = '80mm') {
    const isArabic = this.translateService.currentLang() === 'ar';
    const company = localStorage.getItem('currentCompany') || 'Your Events Management Company';
    const branch = localStorage.getItem('currentBranch') || 'Kiddie Kruzzer';
    const location = localStorage.getItem('currentLocation') || 'Avenues Mall -Phase -4- Gate 25';

    const closeDate = closing.date || closing.closeDate || closing.close_date || new Date().toISOString().split('T')[0];
    const totalRentals = closing.totalRentals || closing.total_rentals || 0;
    const totalCarsUsed = closing.totalCarsUsed ?? closing.total_cars_used ?? totalRentals;
    const cashAmount = Number(closing.cashAmount || closing.cash_amount || 0).toFixed(3);
    const cardAmount = Number(closing.cardAmount || closing.card_amount || 0).toFixed(3);
    const discountAmount = Number(closing.discountAmount || closing.discount_amount || 0).toFixed(3);
    const totalRevenue = Number(closing.totalRevenue || closing.total_revenue || 0).toFixed(3);
    const closedBy = closing.closedBy || closing.closed_by || 'Admin';
    const notes = closing.notes || (isArabic ? 'إغلاق اليومية والتدقيق المالي' : 'Daily audit and revenue reconciliation');
    const detailedSummariesHtml = this.renderDetailedSummariesHtml(closing.summaries, isThermal, isArabic);

    let html = '';

    if (isThermal) {
      html = `
        <div class="receipt-header">
          <div class="logo-box">DAILY AUDIT</div>
          <div class="title">${company}</div>
          <div class="subtitle">${branch} - ${location}</div>
          <div class="subtitle font-bold">${isArabic ? 'تقرير الإغلاق اليومي والمطابقة' : 'END OF DAY CLOSING AUDIT'}</div>
        </div>

        <div class="dashed-divider"></div>

        <div class="flex-between">
          <span>${isArabic ? 'تاريخ الإغلاق:' : 'Audit Date:'}</span>
          <span class="font-bold font-mono">${closeDate}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'المسؤول:' : 'Auditor:'}</span>
          <span class="font-bold">${closedBy}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'وقت الطباعة:' : 'Printed At:'}</span>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'إجمالي التأجيرات المنفذة:' : 'Total Rentals:'}</span>
          <span class="font-bold font-mono">${totalRentals}</span>
        </div>
        <div class="flex-between font-bold" style="background:#f1f5f9; padding:2px 4px; border-radius:4px;">
          <span>${isArabic ? 'إجمالي السيارات المستخدمة:' : 'Total Cars Used:'}</span>
          <span class="font-bold font-mono text-indigo-700">${totalCarsUsed}</span>
        </div>

        <div class="solid-divider"></div>

        <div class="flex-between">
          <span>${isArabic ? 'إجمالي المقبوضات النقدية (كاش):' : 'Cash Received:'}</span>
          <span class="font-mono font-bold">${cashAmount} KWD</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'إجمالي مقبوضات كي نت / بطاقات:' : 'KNET Received:'}</span>
          <span class="font-mono font-bold">${cardAmount} KWD</span>
        </div>
        ${Number(discountAmount) > 0 ? `
        <div class="flex-between text-green-700">
          <span>${isArabic ? 'إجمالي الخصومات الممنوحة:' : 'Total Discounts Granted:'}</span>
          <span class="font-mono font-bold">-${discountAmount} KWD</span>
        </div>` : ''}

        <div class="solid-divider"></div>

        <div class="flex-between total-highlight">
          <span>${isArabic ? 'صافي إجمالي المبلغ المستلم:' : 'TOTAL NET RECEIVED:'}</span>
          <span class="font-mono">${totalRevenue} KWD</span>
        </div>

        ${detailedSummariesHtml}

        <div class="dashed-divider"></div>

        <div>
          <span class="font-bold">${isArabic ? 'ملاحظات التدقيق:' : 'Audit Notes:'}</span>
          <p style="margin: 3px 0; font-size: 10px;">${notes}</p>
        </div>

        <div style="margin-top: 18px;">
          <div class="flex-between" style="font-size: 10px;">
            <span>${isArabic ? 'توقيع الإدارة:' : 'Manager Sign:'}</span>
            <span>.......................</span>
          </div>
        </div>

        <div class="cut-line">------------------ ✂ ------------------</div>
      `;
    } else {
      // Standard A4 Layout
      html = `
        <div class="header">
          <div>
            <div class="logo-title">${company}</div>
            <div class="meta-info">${branch} | ${location}</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #dc2626;">${isArabic ? 'تقرير الإغلاق المالي اليومي' : 'DAILY AUDIT CLOSING REPORT'}</h2>
            <div class="font-mono font-bold" style="color: #475569;">${closeDate}</div>
          </div>
        </div>

        <div class="card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div><strong>${isArabic ? 'تاريخ اليومية:' : 'Closing Date:'}</strong> ${closeDate}</div>
            <div><strong>${isArabic ? 'المسؤول عن الإغلاق:' : 'Closed By:'}</strong> ${closedBy}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>${isArabic ? 'إجمالي التأجيرات المنفذة:' : 'Total Rentals Completed:'}</strong> ${totalRentals}</div>
            <div><strong>${isArabic ? 'إجمالي السيارات المستخدمة:' : 'Total Cars Used:'}</strong> <span style="color:#4f46e5; font-weight:bold;">${totalCarsUsed}</span></div>
            <div><strong>${isArabic ? 'وقت التقرير:' : 'Generated Time:'}</strong> ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'بند الإيراد والتحصيل' : 'Revenue & Collection Stream'}</th>
              <th class="text-right">${isArabic ? 'المبلغ المحصل (د.ك)' : 'Settled Amount (KWD)'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${isArabic ? 'الإيراد النقدي المباشر (Cash Received)' : 'Cash Payments Received'}</strong></td>
              <td class="text-right font-mono">${cashAmount}</td>
            </tr>
            <tr>
              <td><strong>${isArabic ? 'إيرادات بطاقات كي نت (KNET Received)' : 'KNET Payments Received'}</strong></td>
              <td class="text-right font-mono">${cardAmount}</td>
            </tr>
            ${Number(discountAmount) > 0 ? `
            <tr style="color: green;">
              <td><strong>${isArabic ? 'إجمالي الخصومات الممنوحة' : 'Total Discounts Granted'}</strong></td>
              <td class="text-right font-mono">-${discountAmount}</td>
            </tr>` : ''}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #fee2e2; font-size: 14px;">
              <td>${isArabic ? 'صافي إجمالي المبالغ المستلمة' : 'TOTAL NET AMOUNT RECEIVED'}</td>
              <td class="text-right font-mono" style="color: #b91c1c;">${totalRevenue} KWD</td>
            </tr>
          </tfoot>
        </table>

        ${detailedSummariesHtml}

        <div style="margin-top: 20px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <strong>${isArabic ? 'ملاحظات المحاسبة والتدقيق:' : 'Accounting & Audit Notes:'}</strong>
          <p style="margin: 4px 0 0 0;">${notes}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px;">
          <div style="border-top: 1px solid #64748b; padding-top: 6px; text-align: center;">
            ${isArabic ? 'أمين الصندوق' : 'Cashier'}
          </div>
          <div style="border-top: 1px solid #64748b; padding-top: 6px; text-align: center;">
            ${isArabic ? 'المشرف المالي' : 'Accountant'}
          </div>
          <div style="border-top: 1px solid #64748b; padding-top: 6px; text-align: center;">
            ${isArabic ? 'المدير العام' : 'General Manager'}
          </div>
        </div>

        <div class="footer">
          <span>${company} - Daily Financial Audit Statement</span>
          <span>Printed on: ${new Date().toLocaleString()}</span>
        </div>
      `;
    }

    this.printHtml(html, isThermal, paperWidth);
  }

  /**
   * 4. Master List Printing (Standard A4 Table & Thermal Summary)
   */
  printMasterList(
    title: string,
    data: any[],
    columns: MasterColumn[],
    isThermal: boolean = false,
    paperWidth: ThermalPaperWidth = '80mm'
  ) {
    const isArabic = this.translateService.currentLang() === 'ar';
    const company = localStorage.getItem('currentCompany') || 'Your Events Management Company';
    const branch = localStorage.getItem('currentBranch') || 'Kiddie Kruzzer';
    const timestamp = new Date().toLocaleString();

    const headers = columns.map((c) => (isArabic && c.labelAr ? c.labelAr : c.label));
    const keys = columns.map((c) => c.key);

    let html = '';

    if (isThermal) {
      html = `
        <div class="receipt-header">
          <div class="logo-box">MASTER LIST</div>
          <div class="title">${company}</div>
          <div class="subtitle">${title}</div>
          <div class="subtitle">${branch}</div>
        </div>

        <div class="dashed-divider"></div>
        <div class="flex-between">
          <span>${isArabic ? 'السجلات:' : 'Records:'}</span>
          <span class="font-bold">${data.length}</span>
        </div>
        <div class="flex-between">
          <span>${isArabic ? 'التاريخ:' : 'Date:'}</span>
          <span>${timestamp}</span>
        </div>
        <div class="solid-divider"></div>

        ${data
          .map(
            (item, idx) => `
          <div style="margin-bottom: 6px;">
            <div class="font-bold">#${idx + 1}: ${item.name || item.carNo || item.username || item.model || item.id}</div>
            ${keys
              .slice(0, 3)
              .map(
                (k) => `
              <div class="flex-between" style="font-size:10px;">
                <span>${k}:</span>
                <span class="font-mono">${item[k] ?? ''}</span>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="dashed-divider"></div>
        `
          )
          .join('')}

        <div class="cut-line">------------------ ✂ ------------------</div>
      `;
    } else {
      html = `
        <div class="header">
          <div>
            <div class="logo-title">${company}</div>
            <div class="meta-info">${branch} - ${title}</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #4f46e5;">${title}</h2>
            <div class="meta-info">${isArabic ? 'إجمالي السجلات:' : 'Total Records:'} ${data.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${keys
                  .map((k) => {
                    let val = row[k] ?? '';
                    if (k === 'password') val = '******';
                    return `<td>${val}</td>`;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <span>${company} - Master Records Report</span>
          <span>Printed on: ${timestamp}</span>
        </div>
      `;
    }

    this.printHtml(html, isThermal, paperWidth);
  }
}
