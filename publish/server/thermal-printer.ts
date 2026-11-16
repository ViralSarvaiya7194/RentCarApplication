import * as net from 'net';
import { createCanvas, Canvas } from '@napi-rs/canvas';
import { pool } from './db/connection';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface ThermalPrinterConfig {
  id?: string;
  printerName: string;
  windowsPrinterName?: string;
  interfaceType: 'LAN' | 'USB' | 'VIRTUAL';
  ipAddress: string;
  port: number;
  branchId?: string | null;
  branchName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  terminal?: string;
  printerType?: string;
  printType?: string; // ALL, SETTLEMENT, RECEIPT, DUPLICATE, REPORT
  paperWidth: '80mm' | '58mm';
  encoding: 'CP864' | 'CP437' | 'UTF-8';
  autoCut: boolean;
  cashDrawer: boolean;
  isActive: boolean;
  isDefault?: boolean;
  printOnStart?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PrintFormatConfig {
  id?: string;
  formatName?: string;
  branchId?: string | null;
  branchName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  terminal?: string;
  printerId?: string;
  printerName?: string;
  printType?: string; // ALL, SETTLEMENT, RECEIPT, DUPLICATE, CANCELLED, REPORT
  language?: 'EN' | 'AR' | 'BOTH';
  paperWidth?: '80mm' | '58mm';
  printOnStart?: boolean;
  fontSize?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE' | string;
  fontFamily?: 'MONOSPACE' | 'SANS_SERIF' | 'CONSOLAS' | 'ROBOTO' | string;
  fontStyle?: 'BOLD' | 'BLACK' | 'NORMAL' | string;
  headerTitle?: string;
  headerSubtitle?: string;
  showLogo?: boolean;
  showCompanyHeader?: boolean;
  showBranchInfo?: boolean;
  showCustomerInfo?: boolean;
  showCarDetails?: boolean;
  showPricingBreakdown?: boolean;
  showPaymentMethod?: boolean;
  showCashier?: boolean;
  showBarcode?: boolean;
  footerNotes?: string;
  termsConditions?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface ThermalPrintPayload {
  printType: 'DUPLICATE' | 'CANCELLED' | 'ORIGINAL' | 'TEST' | 'SETTLEMENT' | 'RECEIPT' | 'REPORT' | 'SHIFT_CLOSE' | 'DAY_CLOSE' | 'PERIODIC_REPORT';
  language?: 'EN' | 'AR' | 'BOTH';
  invoiceNo?: string;
  rental?: any;
  reprintCount?: number;
  reprintedBy?: string;
  reprintTime?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  cancellationRemarks?: string;
  settledAt?: string;
  companyName?: string;
  branchName?: string;
  locationName?: string;
  terminal?: string;
  cashierName?: string;
  elapsedDuration?: string;
  depositAmount?: number | string;
  extraAmount?: number | string;
  discountAmount?: number | string;
  discountType?: string;
  settlementRemarks?: string;
  finalAmount?: number | string;
  changeReturned?: number | string;
  paymentMethod?: string;
  cashAmount?: number | string;
  knetAmount?: number | string;
  discountReason?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  formatConfig?: PrintFormatConfig;
  // Shift Close & Day Close & Periodic Report Data
  shiftData?: any;
  dayCloseData?: any;
  periodicData?: any;
}

// In-memory translation dictionary cache for zero-latency printing lookups
let translationCache: Map<string, { en: string; ar: string }> = new Map();
let cacheTimestamp = 0;

export class ThermalPrinterService {

  /**
   * Load active translation dictionary dynamically from PostgreSQL
   */
  static async loadTranslations(): Promise<Map<string, { en: string; ar: string }>> {
    const now = Date.now();
    if (translationCache.size > 0 && now - cacheTimestamp < 60000) {
      return translationCache;
    }
    try {
      const res = await pool.query(`SELECT translation_key, english_text, arabic_text FROM translations WHERE is_active = 'ACTIVE'`);
      const map = new Map<string, { en: string; ar: string }>();
      for (const row of res.rows) {
        map.set(row.translation_key, { en: row.english_text, ar: row.arabic_text });
      }
      translationCache = map;
      cacheTimestamp = now;
      return map;
    } catch (e) {
      console.warn('Could not load translations for thermal printer, using fallbacks:', e);
      return translationCache;
    }
  }

  /**
   * Dynamically fetch translation text from PostgreSQL database
   */
  static getTranslation(
    key: string,
    lang: 'EN' | 'AR' | 'BOTH',
    dict: Map<string, { en: string; ar: string }>,
    fallbackEn: string,
    fallbackAr: string
  ): string {
    const item = dict.get(key);
    const en = item?.en || fallbackEn;
    const ar = item?.ar || fallbackAr;

    if (lang === 'AR') return ar;
    if (lang === 'EN') return en;
    return `${en} / ${ar}`;
  }

  /**
   * Shapes Arabic text for presentation
   */
  static shapeArabic(input: string): string {
    return input;
  }

  /**
   * Resolves the target Print Format dynamically from PostgreSQL based on:
   * Branch + Terminal + Printer + Print Type + Language
   */
  static async resolvePrintFormat(params?: {
    branch?: string;
    location?: string;
    terminal?: string;
    printerId?: string;
    printType?: string;
    language?: 'EN' | 'AR' | 'BOTH';
  }): Promise<PrintFormatConfig> {
    try {
      const res = await pool.query(`SELECT * FROM print_formats WHERE is_active = true ORDER BY is_default DESC, id ASC`);
      const activeFormats: any[] = res.rows;
      if (activeFormats.length > 0) {
        const b = (params?.branch || '').toLowerCase().trim();
        const t = (params?.terminal || 'ALL').toLowerCase().trim();
        const pid = (params?.printerId || 'ALL').toLowerCase().trim();
        const pt = (params?.printType || 'ALL').toUpperCase().trim();
        const lang = (params?.language || 'BOTH').toUpperCase().trim();

        // 1. Exact match: branch + terminal + printer + printType + language
        let match = activeFormats.find(f => {
          const fb = (f.branch_name || 'All Branches').toLowerCase().trim();
          const ft = (f.terminal || 'ALL').toLowerCase().trim();
          const fpid = (f.printer_id || 'ALL').toLowerCase().trim();
          const fpt = (f.print_type || 'ALL').toUpperCase().trim();
          const flang = (f.language || 'BOTH').toUpperCase().trim();

          const bOk = !b || fb === 'all branches' || fb === b;
          const tOk = ft === 'all' || ft === t;
          const pidOk = fpid === 'all' || fpid === pid;
          const ptOk = fpt === 'ALL' || fpt === pt;
          const langOk = flang === 'BOTH' || flang === lang;

          return bOk && tOk && pidOk && ptOk && langOk;
        });

        // 2. Fallback: match by printType + language
        if (!match && pt) {
          match = activeFormats.find(f => {
            const fpt = (f.print_type || 'ALL').toUpperCase().trim();
            const flang = (f.language || 'BOTH').toUpperCase().trim();
            return (fpt === 'ALL' || fpt === pt) && (flang === 'BOTH' || flang === lang);
          });
        }

        // 3. Fallback: match by printType only
        if (!match && pt) {
          match = activeFormats.find(f => {
            const fpt = (f.print_type || 'ALL').toUpperCase().trim();
            return fpt === 'ALL' || fpt === pt;
          });
        }

        // 4. Default format
        if (!match) {
          match = activeFormats.find(f => f.is_default) || activeFormats[0];
        }

        if (match) {
          return {
            id: match.id,
            formatName: match.format_name,
            branchId: match.branch_id,
            branchName: match.branch_name,
            locationId: match.location_id,
            locationName: match.location_name,
            terminal: match.terminal,
            printerId: match.printer_id,
            printerName: match.printer_name,
            printType: match.print_type,
            language: match.language,
            paperWidth: match.paper_width || '80mm',
            fontSize: match.font_size || 'LARGE',
            fontFamily: match.font_family || 'MONOSPACE',
            fontStyle: match.font_style || 'BOLD',
            headerTitle: match.header_title || 'KIDDIE KRUZZER ENTERTAINMENT',
            headerSubtitle: match.header_subtitle || 'Car Rental Tax Invoice / فاتورة ضريبية',
            showLogo: match.show_logo !== false,
            showCompanyHeader: match.show_company_header !== false,
            showBranchInfo: match.show_branch_info !== false,
            showCustomerInfo: match.show_customer_info !== false,
            showCarDetails: match.show_car_details !== false,
            showPricingBreakdown: match.show_pricing_breakdown !== false,
            showPaymentMethod: match.show_payment_method !== false,
            showCashier: match.show_cashier !== false,
            showBarcode: match.show_barcode !== false,
            footerNotes: match.footer_notes || 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
            termsConditions: match.terms_conditions,
            isDefault: match.is_default === true,
            isActive: match.is_active !== false,
          };
        }
      }
    } catch (e) {
      console.warn('Error resolving print format from DB:', e);
    }

    // Safe fallback
    return {
      id: 'FMT-DEFAULT',
      formatName: 'Default Bilingual Format',
      language: 'BOTH',
      paperWidth: '80mm',
      fontSize: 'LARGE',
      fontFamily: 'MONOSPACE',
      fontStyle: 'BOLD',
      headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
      headerSubtitle: 'Car Rental Tax Invoice / فاتورة ضريبية',
      showLogo: true,
      showCompanyHeader: true,
      showBranchInfo: true,
      showCustomerInfo: true,
      showCarDetails: true,
      showPricingBreakdown: true,
      showPaymentMethod: true,
      showCashier: true,
      showBarcode: true,
      footerNotes: 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
      termsConditions: 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
      isDefault: true,
      isActive: true,
    };
  }

  /**
   * Converts a Canvas to ESC/POS Raster Bit Image Buffer (GS v 0 0)
   * This prints high-definition graphics directly on thermal paper so Arabic & English
   * render crystal-clear without codepage ROM limitations or junk characters.
   */
  static canvasToEscPosRasterBuffer(canvas: Canvas, autoCut = true, cashDrawer = false): Buffer {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const widthInBytes = Math.ceil(width / 8);
    const totalImageBytes = widthInBytes * height;
    const rasterData = Buffer.alloc(totalImageBytes);

    let byteIdx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x += 8) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) {
          const px = x + b;
          if (px < width) {
            const offset = (y * width + px) * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const bl = data[offset + 2];
            const a = data[offset + 3];
            // Luminance calculation
            const brightness = (r * 0.299 + g * 0.587 + bl * 0.114);
            // Black ink dot on thermal paper with crisp contrast
            if (a > 90 && brightness < 215) {
              byteVal |= (1 << (7 - b));
            }
          }
        }
        rasterData[byteIdx++] = byteVal;
      }
    }

    const ESC = 0x1B;
    const GS = 0x1D;

    const chunks: Buffer[] = [];
    
    // 1. Initialize printer
    chunks.push(Buffer.from([ESC, 0x40])); // ESC @

    // 2. Set line spacing to 0 for seamless raster graphic printing
    chunks.push(Buffer.from([ESC, 0x33, 0x00])); // ESC 3 0

    // 3. Print in blocks (max 1200 rows per GS v 0 block)
    const maxBlockHeight = 1200;
    for (let startY = 0; startY < height; startY += maxBlockHeight) {
      const blockHeight = Math.min(maxBlockHeight, height - startY);
      const blockByteLength = widthInBytes * blockHeight;
      const startByte = startY * widthInBytes;
      const blockRasterData = rasterData.subarray(startByte, startByte + blockByteLength);

      const header = Buffer.from([
        GS, 0x76, 0x30, 0x00, // GS v 0 0 (Normal mode)
        widthInBytes & 0xFF,
        (widthInBytes >> 8) & 0xFF,
        blockHeight & 0xFF,
        (blockHeight >> 8) & 0xFF
      ]);

      chunks.push(header);
      chunks.push(blockRasterData);
    }

    // 4. Reset line spacing & feed paper
    chunks.push(Buffer.from([ESC, 0x32])); // ESC 2 (Default line spacing)
    chunks.push(Buffer.from('\n\n\n\n', 'ascii')); // Feed 4 lines for tear-off

    // 5. Auto Cut paper
    if (autoCut) {
      chunks.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // GS V 'B' 0
    }

    // 6. Cash drawer pulse
    if (cashDrawer) {
      chunks.push(Buffer.from([ESC, 0x70, 0x00, 0x19, 0xFA]));
    }

    return Buffer.concat(chunks);
  }

  /**
   * Generates a high-definition raster thermal receipt canvas with English + Arabic both on every label
   */
  static buildThermalCanvas(
    payload: ThermalPrintPayload,
    config: ThermalPrinterConfig,
    format?: PrintFormatConfig,
    translationsMap?: Map<string, { en: string; ar: string }>
  ): Canvas {
    const fmt: PrintFormatConfig = format || payload.formatConfig || {
      language: payload.language || 'BOTH',
      paperWidth: config.paperWidth || '80mm',
      fontSize: 'LARGE',
      fontFamily: 'MONOSPACE',
      fontStyle: 'BOLD',
      showLogo: true,
      showCompanyHeader: true,
      showBranchInfo: true,
      showCustomerInfo: true,
      showCarDetails: true,
      showPricingBreakdown: true,
      showPaymentMethod: true,
      showCashier: true,
      showBarcode: true,
      headerTitle: 'KIDDIE KRUZZER ENTERTAINMENT',
      headerSubtitle: 'Car Rental Tax Invoice / فاتورة ضريبية',
    };

    const dict = translationsMap || translationCache;
    const is80mm = (fmt.paperWidth || config.paperWidth) !== '58mm';
    const canvasWidth = is80mm ? 576 : 384;
    const initialHeight = (payload.printType === 'SHIFT_CLOSE' || payload.printType === 'PERIODIC_REPORT' || payload.printType === 'DAY_CLOSE') ? 8000 : 2200;

    const sizeMode = (fmt.fontSize || 'LARGE').toUpperCase().trim();
    const fontFam = (fmt.fontFamily || 'MONOSPACE').toUpperCase().trim();
    const fontSty = (fmt.fontStyle || 'BOLD').toUpperCase().trim();

    // Font Family resolution
    let famEn = '"Courier New", Courier, monospace';
    let famAr = 'Tahoma, "Segoe UI", Arial, sans-serif';
    if (fontFam === 'SANS_SERIF' || fontFam === 'SANS' || fontFam === 'ARIAL') {
      famEn = 'Arial, Helvetica, "Segoe UI", sans-serif';
      famAr = 'Arial, Tahoma, "Segoe UI", sans-serif';
    } else if (fontFam === 'CONSOLAS') {
      famEn = 'Consolas, "Lucida Console", "Cascadia Code", monospace';
      famAr = 'Tahoma, "Segoe UI", Arial, sans-serif';
    } else if (fontFam === 'ROBOTO') {
      famEn = 'Roboto, "Trebuchet MS", "Segoe UI", sans-serif';
      famAr = 'Tahoma, "Segoe UI", Arial, sans-serif';
    }

    // Font Style & Weight resolution
    let wNormal = 'bold';
    let wHeavy = 'bold';
    if (fontSty === 'BLACK' || fontSty === 'EXTRA_BOLD') {
      wNormal = '900';
      wHeavy = '900';
    } else if (fontSty === 'NORMAL' || fontSty === 'REGULAR') {
      wNormal = 'normal';
      wHeavy = 'bold';
    } else {
      wNormal = 'bold';
      wHeavy = 'bold';
    }

    // Sizing & typography metrics based on font size configuration
    const m = (() => {
      if (is80mm) {
        switch (sizeMode) {
          case 'XLARGE':
            return {
              headerTitle: `${wHeavy} 30px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 26px ${famAr}`,
              headerSubtitleEn: `${wNormal} 21px ${famEn}`,
              branchInfo: `${wNormal} 20px ${famEn}`,
              bannerTitleEn: `${wHeavy} 26px ${famEn}`,
              bannerTitleAr: `${wHeavy} 24px ${famAr}`,
              bannerBoxHeight: 78,
              rowLabel: `${wNormal} 23px ${famEn}`,
              rowLabelBold: `${wHeavy} 25px ${famEn}`,
              rowHighlight: `${wHeavy} 28px ${famEn}`,
              barcodeText: `bold 22px "Courier New", monospace`,
              footerTitle: `${wHeavy} 23px ${famEn}`,
              footerText: `${wNormal} 20px ${famEn}`,
              rowLineHeight: 38,
              sectionSpacing: 24,
            };
          case 'MEDIUM':
            return {
              headerTitle: `${wHeavy} 24px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 21px ${famAr}`,
              headerSubtitleEn: `${wNormal} 18px ${famEn}`,
              branchInfo: `${wNormal} 17px ${famEn}`,
              bannerTitleEn: `${wHeavy} 20px ${famEn}`,
              bannerTitleAr: `${wHeavy} 18px ${famAr}`,
              bannerBoxHeight: 58,
              rowLabel: `${wNormal} 18px ${famEn}`,
              rowLabelBold: `${wHeavy} 20px ${famEn}`,
              rowHighlight: `${wHeavy} 22px ${famEn}`,
              barcodeText: `bold 17px "Courier New", monospace`,
              footerTitle: `${wHeavy} 18px ${famEn}`,
              footerText: `${wNormal} 15px ${famEn}`,
              rowLineHeight: 29,
              sectionSpacing: 18,
            };
          case 'SMALL':
            return {
              headerTitle: `${wHeavy} 21px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 18px ${famAr}`,
              headerSubtitleEn: `${wNormal} 16px ${famEn}`,
              branchInfo: `${wNormal} 15px ${famEn}`,
              bannerTitleEn: `${wHeavy} 17px ${famEn}`,
              bannerTitleAr: `${wHeavy} 15px ${famAr}`,
              bannerBoxHeight: 50,
              rowLabel: `${wNormal} 15px ${famEn}`,
              rowLabelBold: `${wHeavy} 17px ${famEn}`,
              rowHighlight: `${wHeavy} 19px ${famEn}`,
              barcodeText: `bold 14px "Courier New", monospace`,
              footerTitle: `${wHeavy} 15px ${famEn}`,
              footerText: `${wNormal} 13px ${famEn}`,
              rowLineHeight: 25,
              sectionSpacing: 15,
            };
          case 'LARGE':
          default:
            return {
              headerTitle: `${wHeavy} 26px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 24px ${famAr}`,
              headerSubtitleEn: `${wNormal} 19px ${famEn}`,
              branchInfo: `${wNormal} 18px ${famEn}`,
              bannerTitleEn: `${wHeavy} 24px ${famEn}`,
              bannerTitleAr: `${wHeavy} 22px ${famAr}`,
              bannerBoxHeight: 68,
              rowLabel: `${wNormal} 21px ${famEn}`,
              rowLabelBold: `${wHeavy} 23px ${famEn}`,
              rowHighlight: `${wHeavy} 26px ${famEn}`,
              barcodeText: `bold 20px "Courier New", monospace`,
              footerTitle: `${wHeavy} 21px ${famEn}`,
              footerText: `${wNormal} 18px ${famEn}`,
              rowLineHeight: 34,
              sectionSpacing: 22,
            };
        }
      } else {
        // 58mm Paper
        switch (sizeMode) {
          case 'XLARGE':
            return {
              headerTitle: `${wHeavy} 24px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 21px ${famAr}`,
              headerSubtitleEn: `${wNormal} 17px ${famEn}`,
              branchInfo: `${wNormal} 16px ${famEn}`,
              bannerTitleEn: `${wHeavy} 20px ${famEn}`,
              bannerTitleAr: `${wHeavy} 18px ${famAr}`,
              bannerBoxHeight: 62,
              rowLabel: `${wNormal} 18px ${famEn}`,
              rowLabelBold: `${wHeavy} 20px ${famEn}`,
              rowHighlight: `${wHeavy} 23px ${famEn}`,
              barcodeText: `bold 17px "Courier New", monospace`,
              footerTitle: `${wHeavy} 18px ${famEn}`,
              footerText: `${wNormal} 15px ${famEn}`,
              rowLineHeight: 30,
              sectionSpacing: 18,
            };
          case 'MEDIUM':
            return {
              headerTitle: `${wHeavy} 18px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 16px ${famAr}`,
              headerSubtitleEn: `${wNormal} 14px ${famEn}`,
              branchInfo: `${wNormal} 13px ${famEn}`,
              bannerTitleEn: `${wHeavy} 15px ${famEn}`,
              bannerTitleAr: `${wHeavy} 14px ${famAr}`,
              bannerBoxHeight: 46,
              rowLabel: `${wNormal} 14px ${famEn}`,
              rowLabelBold: `${wHeavy} 15px ${famEn}`,
              rowHighlight: `${wHeavy} 17px ${famEn}`,
              barcodeText: `bold 13px "Courier New", monospace`,
              footerTitle: `${wHeavy} 14px ${famEn}`,
              footerText: `${wNormal} 12px ${famEn}`,
              rowLineHeight: 22,
              sectionSpacing: 14,
            };
          case 'SMALL':
            return {
              headerTitle: `${wHeavy} 16px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 14px ${famAr}`,
              headerSubtitleEn: `${wNormal} 12px ${famEn}`,
              branchInfo: `${wNormal} 11px ${famEn}`,
              bannerTitleEn: `${wHeavy} 13px ${famEn}`,
              bannerTitleAr: `${wHeavy} 12px ${famAr}`,
              bannerBoxHeight: 40,
              rowLabel: `${wNormal} 12px ${famEn}`,
              rowLabelBold: `${wHeavy} 13px ${famEn}`,
              rowHighlight: `${wHeavy} 15px ${famEn}`,
              barcodeText: `bold 11px "Courier New", monospace`,
              footerTitle: `${wHeavy} 13px ${famEn}`,
              footerText: `${wNormal} 10px ${famEn}`,
              rowLineHeight: 19,
              sectionSpacing: 12,
            };
          case 'LARGE':
          default:
            return {
              headerTitle: `${wHeavy} 20px ${famEn}`,
              headerSubtitleAr: `${wHeavy} 18px ${famAr}`,
              headerSubtitleEn: `${wNormal} 15px ${famEn}`,
              branchInfo: `${wNormal} 14px ${famEn}`,
              bannerTitleEn: `${wHeavy} 18px ${famEn}`,
              bannerTitleAr: `${wHeavy} 16px ${famAr}`,
              bannerBoxHeight: 54,
              rowLabel: `${wNormal} 16px ${famEn}`,
              rowLabelBold: `${wHeavy} 18px ${famEn}`,
              rowHighlight: `${wHeavy} 20px ${famEn}`,
              barcodeText: `bold 15px "Courier New", monospace`,
              footerTitle: `${wHeavy} 16px ${famEn}`,
              footerText: `${wNormal} 13px ${famEn}`,
              rowLineHeight: 25,
              sectionSpacing: 16,
            };
        }
      }
    })();

    const canvas = createCanvas(canvasWidth, initialHeight);
    const ctx = canvas.getContext('2d');

    // Fill pure white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, initialHeight);

    ctx.fillStyle = '#000000';
    let y = is80mm ? 42 : 30;

    const tr = (key: string, fallbackEn: string, fallbackAr: string): { en: string; ar: string } => {
      const item = dict.get(key);
      return {
        en: item?.en || fallbackEn,
        ar: item?.ar || fallbackAr
      };
    };

    // Maximum safe text width to avoid clipping on thermal paper rolls with physical edge margins
    const maxSafeWidth = is80mm ? Math.min(canvasWidth - 56, 500) : Math.min(canvasWidth - 36, 340);

    const wrapWords = (textToWrap: string, maxW: number): string[] => {
      const words = textToWrap.split(/\s+/);
      const res: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxW) {
          currentLine = testLine;
        } else {
          if (currentLine) res.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) res.push(currentLine);
      return res;
    };

    const drawCenteredWrapped = (
      rawText: string,
      baseSize: number,
      fontFamily: string,
      fontWeight = 'bold',
      lineSpacing = 4,
      allowBilingualSplit = true
    ): void => {
      const text = (rawText || '').trim();
      if (!text) return;

      const minSize = is80mm ? 15 : 12;
      let currentSize = baseSize;

      // 1. First test if whole text fits on a single line by scaling down font size gracefully
      let fitsSingle = false;
      while (currentSize >= minSize) {
        ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
        if (ctx.measureText(text).width <= maxSafeWidth) {
          fitsSingle = true;
          break;
        }
        currentSize -= 1;
      }

      let lines: string[] = [];
      const singleLineThreshold = is80mm
        ? Math.max(minSize, Math.round(baseSize * 0.72))
        : Math.max(minSize, Math.round(baseSize * 0.68));

      if (fitsSingle && currentSize >= singleLineThreshold) {
        lines = [text];
      } else {
        // Multi-line wrapping needed: use readable size
        currentSize = Math.max(minSize, Math.min(baseSize, is80mm ? 22 : 16));
        ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;

        if (allowBilingualSplit && text.includes(' / ')) {
          const parts = text.split(' / ');
          for (const part of parts) {
            lines.push(...wrapWords(part.trim(), maxSafeWidth));
          }
        } else {
          lines = wrapWords(text, maxSafeWidth);
        }

        // Ensure all lines fit within maxSafeWidth
        let allFit = false;
        while (!allFit && currentSize > minSize) {
          ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
          allFit = lines.every((l) => ctx.measureText(l).width <= maxSafeWidth);
          if (!allFit) {
            currentSize -= 1;
          }
        }
      }

      ctx.font = `${fontWeight} ${currentSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      const lineHeight = Math.round(currentSize * 1.28);

      for (const line of lines) {
        ctx.fillText(line, canvasWidth / 2, y);
        y += lineHeight;
      }
      y += lineSpacing;
    };

    // 1. Header Company Name & Subtitle
    if (fmt.showLogo !== false) {
      const headerTitleText = fmt.headerTitle || payload.companyName || 'KIDDIE KRUZZER ENTERTAINMENT';
      const titleBaseSize = is80mm
        ? (sizeMode === 'XLARGE' ? 30 : sizeMode === 'MEDIUM' ? 24 : sizeMode === 'SMALL' ? 21 : 26)
        : (sizeMode === 'XLARGE' ? 24 : sizeMode === 'MEDIUM' ? 18 : sizeMode === 'SMALL' ? 16 : 20);

      drawCenteredWrapped(headerTitleText, titleBaseSize, famEn, wHeavy, is80mm ? 6 : 4, false);

      const subtitleArBaseSize = is80mm
        ? (sizeMode === 'XLARGE' ? 26 : sizeMode === 'MEDIUM' ? 21 : sizeMode === 'SMALL' ? 18 : 24)
        : (sizeMode === 'XLARGE' ? 21 : sizeMode === 'MEDIUM' ? 16 : sizeMode === 'SMALL' ? 14 : 18);

      drawCenteredWrapped('كيدي كروزر للتأجير والترفيه', subtitleArBaseSize, famAr, wHeavy, is80mm ? 6 : 4, false);
    }

    if (fmt.showCompanyHeader !== false && fmt.headerSubtitle) {
      const subEnBaseSize = is80mm
        ? (sizeMode === 'XLARGE' ? 21 : sizeMode === 'MEDIUM' ? 18 : sizeMode === 'SMALL' ? 16 : 19)
        : (sizeMode === 'XLARGE' ? 17 : sizeMode === 'MEDIUM' ? 14 : sizeMode === 'SMALL' ? 12 : 15);

      drawCenteredWrapped(fmt.headerSubtitle, subEnBaseSize, famEn, wNormal, is80mm ? 6 : 4, true);
    }

    if (fmt.showBranchInfo !== false) {
      const bName = (payload.branchName || config.branchName || 'Avenues Mall').trim();
      const lName = (payload.locationName || config.locationName || 'Main Counter').trim();
      const branchString = (bName === lName || !lName)
        ? `${bName} / مجمع الأفنيوز`
        : `${bName} - ${lName} / مجمع الأفنيوز`;

      const branchBaseSize = is80mm
        ? (sizeMode === 'XLARGE' ? 20 : sizeMode === 'MEDIUM' ? 17 : sizeMode === 'SMALL' ? 15 : 18)
        : (sizeMode === 'XLARGE' ? 16 : sizeMode === 'MEDIUM' ? 13 : sizeMode === 'SMALL' ? 11 : 14);

      drawCenteredWrapped(branchString, branchBaseSize, famEn, wNormal, is80mm ? 6 : 4, true);
    }

    // Double Divider Line
    y += 4;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    y += 5;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    y += is80mm ? 28 : 22;

    // 2. Banner Box (Settlement / Duplicate / Cancel / Test)
    let bannerEn = 'OFFICIAL RECEIPT';
    let bannerAr = 'إيصال تأجير رسمي';

    if (payload.printType === 'SETTLEMENT') {
      const t = tr('SETTLEMENT.TITLE', 'SETTLEMENT RECEIPT', 'إيصال تسوية نهائية وتصفية حساب');
      bannerEn = t.en;
      bannerAr = t.ar;
    } else if (payload.printType === 'RECEIPT') {
      const t = tr('POS.DEPOSIT_RECEIPT_TITLE', 'RENTAL & DEPOSIT RECEIPT', 'إيصال تأجير وعربون');
      bannerEn = t.en;
      bannerAr = t.ar;
    } else if (payload.printType === 'DUPLICATE') {
      const t = tr('BILLS.DUPLICATE_TITLE', 'DUPLICATE BILL', 'فاتورة مكررة');
      bannerEn = t.en + (payload.reprintCount ? ` (#${payload.reprintCount})` : '');
      bannerAr = t.ar + (payload.reprintCount ? ` (إعادة #${payload.reprintCount})` : '');
    } else if (payload.printType === 'CANCELLED') {
      const t = tr('BILLS.CANCEL_TITLE', 'CANCELLED BILL (VOID)', 'فاتورة ملغاة');
      bannerEn = t.en;
      bannerAr = t.ar;
    } else if (payload.printType === 'SHIFT_CLOSE') {
      const sNum = payload.shiftData?.shiftNumber || 1;
      bannerEn = `SHIFT #${sNum} CLOSING REPORT`;
      bannerAr = `تقرير إغلاق الوردية رقم #${sNum}`;
    } else if (payload.printType === 'DAY_CLOSE') {
      bannerEn = 'END OF DAY CLOSING REPORT';
      bannerAr = 'تقرير إغلاق نهاية اليوم';
    } else if (payload.printType === 'PERIODIC_REPORT') {
      bannerEn = 'PERIODIC SALES REPORT';
      bannerAr = 'تقرير المبيعات الدوري';
    } else if (payload.printType === 'TEST') {
      const t = tr('PRINTER.TEST_PRINT', 'PRINTER TEST SLIP', 'اختبار اتصال وطباعة الطابعة');
      bannerEn = t.en;
      bannerAr = t.ar;
    }

    const boxHeight = m.bannerBoxHeight;
    ctx.fillStyle = '#000000';
    ctx.fillRect(10, y - (is80mm ? 24 : 18), canvasWidth - 20, boxHeight);
    ctx.fillStyle = '#ffffff';

    const bannerEnText = `*** ${bannerEn} ***`;
    let bannerEnSize = is80mm ? (sizeMode === 'XLARGE' ? 26 : sizeMode === 'MEDIUM' ? 20 : sizeMode === 'SMALL' ? 17 : 24) : 18;
    while (bannerEnSize > 13) {
      ctx.font = `${wHeavy} ${bannerEnSize}px ${famEn}`;
      if (ctx.measureText(bannerEnText).width <= canvasWidth - 40) break;
      bannerEnSize -= 1;
    }
    ctx.font = `${wHeavy} ${bannerEnSize}px ${famEn}`;
    ctx.textAlign = 'center';
    ctx.fillText(bannerEnText, canvasWidth / 2, y + 2);
    y += is80mm ? 28 : 22;

    const bannerArText = `*** ${bannerAr} ***`;
    let bannerArSize = is80mm ? (sizeMode === 'XLARGE' ? 24 : sizeMode === 'MEDIUM' ? 18 : sizeMode === 'SMALL' ? 15 : 22) : 16;
    while (bannerArSize > 13) {
      ctx.font = `${wHeavy} ${bannerArSize}px ${famAr}`;
      if (ctx.measureText(bannerArText).width <= canvasWidth - 40) break;
      bannerArSize -= 1;
    }
    ctx.font = `${wHeavy} ${bannerArSize}px ${famAr}`;
    ctx.fillText(bannerArText, canvasWidth / 2, y + 4);
    y += is80mm ? 40 : 30;

    // Reset fill style
    ctx.fillStyle = '#000000';

    // Helper row drawer with collision check & bold legible typography
    const drawBilingualRow = (labelEn: string, labelAr: string, value: string, isBold = false, isHighlight = false) => {
      let rowFont = m.rowLabel;
      if (isHighlight) {
        rowFont = m.rowHighlight;
      } else if (isBold) {
        rowFont = m.rowLabelBold;
      }
      ctx.font = rowFont;

      let labelText = `${labelEn} / ${labelAr}`;
      if (fmt.language === 'AR') labelText = labelAr;
      else if (fmt.language === 'EN') labelText = labelEn;

      const valWidth = ctx.measureText(value).width;
      const labelWidth = ctx.measureText(labelText).width;
      const padding = 15;
      const availableWidth = canvasWidth - (padding * 2);

      if (labelWidth + valWidth + 16 > availableWidth) {
        // Multi-line rendering if label + value exceed paper width
        ctx.textAlign = 'left';
        if (labelWidth > availableWidth) {
          const lLines = wrapWords(labelText, availableWidth);
          for (const ll of lLines) {
            ctx.fillText(ll, padding, y);
            y += m.rowLineHeight;
          }
        } else {
          ctx.fillText(labelText, padding, y);
          y += m.rowLineHeight;
        }

        ctx.textAlign = 'right';
        if (valWidth > availableWidth) {
          const vLines = wrapWords(value, availableWidth);
          for (const vl of vLines) {
            ctx.fillText(vl, canvasWidth - padding, y);
            y += m.rowLineHeight;
          }
        } else {
          ctx.fillText(value, canvasWidth - padding, y);
          y += m.rowLineHeight;
        }
      } else {
        // Single-line clean left & right aligned
        ctx.textAlign = 'left';
        ctx.fillText(labelText, padding, y);

        ctx.textAlign = 'right';
        ctx.fillText(value, canvasWidth - padding, y);

        y += m.rowLineHeight;
      }
    };

    // Helper to draw horizontal line
    const drawLine = (dashed = false) => {
      y += 6;
      ctx.lineWidth = 1.5;
      if (dashed) ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(canvasWidth - 15, y);
      ctx.stroke();
      if (dashed) ctx.setLineDash([]);
      y += 20;
    };

    // Helper to draw the 6 comprehensive audit summaries on thermal canvas
    const drawSummaries = (sum: any) => {
      if (!sum) return;
      const { cashierSummary, billSummary, carSummary, hourlySummary, cancellationSummary, paymentTypeSummary } = sum;

      // 1) Cashier Summary
      if (cashierSummary?.items?.length) {
        drawLine(false);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('1. CASHIER SUMMARY / ملخص الكاشير', 15, y);
        y += m.rowLineHeight;

        ctx.font = m.footerText;
        ctx.textAlign = 'left';
        ctx.fillText('Cashier / الكاشير', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText('Bills', canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText('Sales (KD)', canvasWidth - 15, y);
        y += m.rowLineHeight - 4;
        drawLine(true);

        ctx.font = m.rowLabel;
        for (const item of cashierSummary.items) {
          ctx.textAlign = 'left';
          ctx.fillText(String(item.cashier).substring(0, 18), 15, y);
          ctx.textAlign = 'center';
          ctx.fillText(String(item.billCount), canvasWidth / 2 + 10, y);
          ctx.textAlign = 'right';
          ctx.fillText(String(item.totalSales), canvasWidth - 15, y);
          y += m.rowLineHeight - 4;
        }

        drawLine(true);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('Sales Total / إجمالي المبيعات:', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText(String(cashierSummary.totalBills), canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${cashierSummary.salesTotal} KWD`, canvasWidth - 15, y);
        y += m.rowLineHeight;
      }

      // 2) Bill-wise Summary
      if (billSummary?.items?.length) {
        drawLine(false);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('2. BILL-WISE SUMMARY / ملخص الفواتير', 15, y);
        y += m.rowLineHeight;

        ctx.font = m.footerText;
        ctx.textAlign = 'left';
        ctx.fillText('Inv# | Car', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText('Pay', canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText('Sales (KD)', canvasWidth - 15, y);
        y += m.rowLineHeight - 4;
        drawLine(true);

        ctx.font = m.rowLabel;
        for (const b of billSummary.items) {
          ctx.textAlign = 'left';
          ctx.fillText(`${b.invoiceNo || b.id} | ${b.carNo}`, 15, y);
          ctx.textAlign = 'center';
          ctx.fillText(String(b.paymentMethod), canvasWidth / 2 + 10, y);
          ctx.textAlign = 'right';
          ctx.fillText(String(b.totalSales), canvasWidth - 15, y);
          y += m.rowLineHeight - 4;
        }

        drawLine(true);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('Sales Total / إجمالي الفواتير:', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText(String(billSummary.totalBills), canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${billSummary.salesTotal} KWD`, canvasWidth - 15, y);
        y += m.rowLineHeight;
      }

      // 3) CAR-wise Summary
      if (carSummary?.items?.length) {
        drawLine(false);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('3. CAR SUMMARY / ملخص السيارات', 15, y);
        y += m.rowLineHeight;

        ctx.font = m.footerText;
        ctx.textAlign = 'left';
        ctx.fillText('Car# | Model', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText('Trips (Mins)', canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText('Sales (KD)', canvasWidth - 15, y);
        y += m.rowLineHeight - 4;
        drawLine(true);

        ctx.font = m.rowLabel;
        for (const cr of carSummary.items) {
          ctx.textAlign = 'left';
          ctx.fillText(`${cr.carNo} ${cr.model ? '(' + cr.model + ')' : ''}`.substring(0, 18), 15, y);
          ctx.textAlign = 'center';
          ctx.fillText(`${cr.tripCount} (${cr.totalMinutes}m)`, canvasWidth / 2 + 10, y);
          ctx.textAlign = 'right';
          ctx.fillText(String(cr.totalSales), canvasWidth - 15, y);
          y += m.rowLineHeight - 4;
        }

        drawLine(true);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('Sales Total / إجمالي السيارات:', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText(`${carSummary.totalTrips} (${carSummary.totalMinutes}m)`, canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${carSummary.salesTotal} KWD`, canvasWidth - 15, y);
        y += m.rowLineHeight;
      }

      // 4) Hourly Sales-wise Summary
      if (hourlySummary?.items?.length) {
        drawLine(false);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('4. HOURLY SALES / مبيعات الساعات', 15, y);
        y += m.rowLineHeight;

        ctx.font = m.footerText;
        ctx.textAlign = 'left';
        ctx.fillText('Hour Window', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText('Bills', canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText('Sales (KD)', canvasWidth - 15, y);
        y += m.rowLineHeight - 4;
        drawLine(true);

        ctx.font = m.rowLabel;
        for (const h of hourlySummary.items) {
          ctx.textAlign = 'left';
          ctx.fillText(String(h.hourLabel || h.hourSlot), 15, y);
          ctx.textAlign = 'center';
          ctx.fillText(String(h.billCount), canvasWidth / 2 + 10, y);
          ctx.textAlign = 'right';
          ctx.fillText(String(h.totalSales), canvasWidth - 15, y);
          y += m.rowLineHeight - 4;
        }

        drawLine(true);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('Sales Total / إجمالي الساعات:', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText(String(hourlySummary.totalBills), canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${hourlySummary.salesTotal} KWD`, canvasWidth - 15, y);
        y += m.rowLineHeight;
      }

      // 5) Cancellation Bills Summary
      if (cancellationSummary) {
        drawLine(false);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('5. CANCELLATION BILLS / فواتير الإلغاء', 15, y);
        y += m.rowLineHeight;

        if (cancellationSummary.items?.length) {
          ctx.font = m.footerText;
          ctx.textAlign = 'left';
          ctx.fillText('Inv# | Reason', 15, y);
          ctx.textAlign = 'right';
          ctx.fillText('Void KD', canvasWidth - 15, y);
          y += m.rowLineHeight - 4;
          drawLine(true);

          ctx.font = m.rowLabel;
          for (const cn of cancellationSummary.items) {
            ctx.textAlign = 'left';
            ctx.fillText(`${cn.invoiceNo || cn.id} - ${cn.cancellationReason}`.substring(0, 24), 15, y);
            ctx.textAlign = 'right';
            ctx.fillText(String(cn.cancelledAmount), canvasWidth - 15, y);
            y += m.rowLineHeight - 4;
          }

          drawLine(true);
          ctx.font = m.rowLabelBold;
          ctx.textAlign = 'left';
          ctx.fillText(`Cancelled Total (${cancellationSummary.totalCancelledBills} bills):`, 15, y);
          ctx.textAlign = 'right';
          ctx.fillText(`${cancellationSummary.salesTotal} KWD`, canvasWidth - 15, y);
          y += m.rowLineHeight;
        } else {
          ctx.font = m.footerText;
          ctx.textAlign = 'left';
          ctx.fillText('No cancelled bills / لا توجد فواتير ملغاة', 15, y);
          y += m.rowLineHeight;
        }
      }

      // 6) Payment Type-wise Summary
      if (paymentTypeSummary?.items?.length) {
        drawLine(false);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('6. PAYMENT TYPE SUMMARY / ملخص طرق الدفع', 15, y);
        y += m.rowLineHeight;

        ctx.font = m.footerText;
        ctx.textAlign = 'left';
        ctx.fillText('Method', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText('Tx | %', canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText('Sales (KD)', canvasWidth - 15, y);
        y += m.rowLineHeight - 4;
        drawLine(true);

        ctx.font = m.rowLabel;
        for (const p of paymentTypeSummary.items) {
          ctx.textAlign = 'left';
          ctx.fillText(String(p.paymentMethod), 15, y);
          ctx.textAlign = 'center';
          ctx.fillText(`${p.transactionCount} (${p.percentage}%)`, canvasWidth / 2 + 10, y);
          ctx.textAlign = 'right';
          ctx.fillText(String(p.totalSales), canvasWidth - 15, y);
          y += m.rowLineHeight - 4;
        }

        drawLine(true);
        ctx.font = m.rowLabelBold;
        ctx.textAlign = 'left';
        ctx.fillText('Sales Total / إجمالي المدفوعات:', 15, y);
        ctx.textAlign = 'center';
        ctx.fillText(String(paymentTypeSummary.totalTransactions), canvasWidth / 2 + 10, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${paymentTypeSummary.salesTotal} KWD`, canvasWidth - 15, y);
        y += m.rowLineHeight;
      }
    };

    // 3A. Test Slip Content
    if (payload.printType === 'TEST') {
      const pId = tr('PRINTER.PRINTER_ID', 'Printer ID', 'معرف الطابعة');
      const pName = tr('PRINTER.NAME', 'Printer Name', 'اسم الطابعة');
      const pInter = tr('PRINTER.INTERFACE', 'Interface', 'نوع الاتصال');
      const pBranch = tr('NAV.BRANCH', 'Branch', 'الفرع');
      const pTerm = tr('PRINTER.TERMINAL', 'Terminal', 'نقطة البيع');
      const pWidth = tr('PRINTER.PAPER_WIDTH', 'Paper Width', 'عرض الورق');
      const pFont = tr('FORMAT.FONT_SIZE', 'Font Size', 'حجم الخط');

      drawBilingualRow(pId.en, pId.ar, config.id || 'PRN-101', true);
      drawBilingualRow(pName.en, pName.ar, config.printerName, true);
      drawBilingualRow(pInter.en, pInter.ar, `${config.interfaceType} (${config.ipAddress}:${config.port})`);
      drawBilingualRow(pBranch.en, pBranch.ar, config.branchName || 'All Branches');
      drawBilingualRow(pTerm.en, pTerm.ar, config.terminal || 'ALL');
      drawBilingualRow(pWidth.en, pWidth.ar, config.paperWidth);
      drawBilingualRow(pFont.en, pFont.ar, sizeMode, true);

      drawLine(true);

      ctx.textAlign = 'center';
      ctx.font = m.footerTitle;
      ctx.fillText('TEST SUCCESSFUL - HARDWARE READY', canvasWidth / 2, y);
      y += is80mm ? 28 : 22;
      ctx.fillText('تم الاختبار بنجاح - الطابعة جاهزة للعمل', canvasWidth / 2, y);
      y += is80mm ? 26 : 20;
      ctx.font = m.footerText;
      ctx.fillText(new Date().toLocaleString(), canvasWidth / 2, y);
      y += 35;

      const finalCanvas = createCanvas(canvasWidth, y);
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(canvas, 0, 0, canvasWidth, y, 0, 0, canvasWidth, y);
      return finalCanvas;
    }

    // 3B. Shift Close Slip Content
    if (payload.printType === 'SHIFT_CLOSE') {
      const s = payload.shiftData || {};
      const sNum = s.shiftNumber || s.shift_number || 1;
      const startTime = s.startTime || s.start_time ? new Date(s.startTime || s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
      const endTime = s.endTime || s.end_time ? new Date(s.endTime || s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const bDate = s.businessDate || s.business_date || new Date().toISOString().split('T')[0];
      const carsUsed = s.totalCarsUsed ?? s.total_cars_used ?? s.totalRentals ?? s.total_rentals ?? 0;

      drawBilingualRow('Shift ID', 'رقم الوردية', `#${s.id || 'SHIFT-' + sNum}`, true);
      drawBilingualRow('Business Date', 'تاريخ العمل', bDate);
      drawBilingualRow('Shift Number', 'الوردية', `Shift ${sNum} / الوردية ${sNum}`, true);
      drawBilingualRow('Cashier Name', 'اسم الكاشير', s.cashierName || s.cashier_name || 'Cashier');
      drawBilingualRow('Start Time', 'وقت البدء', startTime);
      drawBilingualRow('Close Time', 'وقت الإغلاق', endTime);
      drawBilingualRow('Total Cars Used', 'إجمالي السيارات المستخدمة', `${carsUsed} Cars / سيارات`, true);
      drawBilingualRow('Total Trips', 'إجمالي الإيجارات', `${s.totalRentals || s.total_rentals || 0} Trips / رحلات`, true);

      drawLine(false);

      drawBilingualRow('Opening Float', 'العهدة الافتتاحية', `${Number(s.openingCash || s.opening_cash || 0).toFixed(3)} KWD`);
      drawBilingualRow('Cash Collections', 'المقبوضات النقدية (كاش)', `${Number(s.cashTotal || s.cash_total || 0).toFixed(3)} KWD`, true);
      drawBilingualRow('KNET / Card Sales', 'المقبوضات عبر كي نت', `${Number(s.knetTotal || s.knet_total || 0).toFixed(3)} KWD`, true);
      if (Number(s.totalDiscount || s.total_discount || 0) > 0) {
        drawBilingualRow('Total Discounts Granted', 'إجمالي الخصومات الممنوحة', `-${Number(s.totalDiscount || s.total_discount || 0).toFixed(3)} KWD`, true);
      }
      if (Number(s.totalRefund || s.total_refund || 0) > 0) {
        drawBilingualRow('Refunds Returned', 'المبالغ المستردة للعملاء', `-${Number(s.totalRefund || s.total_refund || 0).toFixed(3)} KWD`);
      }

      drawLine(false);

      drawBilingualRow('NET SHIFT AMOUNT', 'إجمالي صافي إيراد الوردية', `${Number(s.overallTotal || s.overall_total || 0).toFixed(3)} KWD`, true, true);

      if (s.summaries) {
        drawSummaries(s.summaries);
      }

      if (s.notes) {
        drawLine(true);
        drawBilingualRow('Notes', 'الملاحظات', String(s.notes));
      }

      drawLine(true);
      ctx.textAlign = 'center';
      ctx.font = m.footerText;
      ctx.fillText('Cashier Signature: __________________', canvasWidth / 2, y);
      y += is80mm ? 26 : 20;
      ctx.fillText('Manager Approval: __________________', canvasWidth / 2, y);
      y += 35;

      const finalCanvas = createCanvas(canvasWidth, y);
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(canvas, 0, 0, canvasWidth, y, 0, 0, canvasWidth, y);
      return finalCanvas;
    }

    // 3C. Day Close Slip Content
    if (payload.printType === 'DAY_CLOSE') {
      const d = payload.dayCloseData || {};
      const bDate = d.closeDate || d.date || new Date().toISOString().split('T')[0];
      const carsUsed = d.totalCarsUsed ?? d.total_cars_used ?? d.totalRentals ?? d.total_rentals ?? 0;

      drawBilingualRow('Audit Date', 'تاريخ الإغلاق', bDate, true);
      drawBilingualRow('Shifts Audited', 'عدد الورديات المدققة', `${d.totalShifts || 2} Shifts (Shift 1 & 2)`, true);
      drawBilingualRow('Total Cars Used', 'إجمالي السيارات المستخدمة', `${carsUsed} Cars / سيارات`, true);
      drawBilingualRow('Total Rentals', 'إجمالي الرحلات والعمليات', `${d.totalRentals || 0} Transactions`, true);
      drawBilingualRow('Closed By', 'أُغلق بواسطة', d.closedBy || 'Admin');

      drawLine(false);

      drawBilingualRow('Total Cash Received', 'إجمالي المدفوعات نقداً (كاش)', `${Number(d.cashAmount || d.cash_amount || 0).toFixed(3)} KWD`, true);
      drawBilingualRow('Total KNET Received', 'إجمالي المدفوعات عبر كي نت', `${Number(d.cardAmount || d.card_amount || 0).toFixed(3)} KWD`, true);
      if (Number(d.discountAmount || d.discount_amount || 0) > 0) {
        drawBilingualRow('Total Discounts Granted', 'إجمالي الخصومات الممنوحة', `-${Number(d.discountAmount || d.discount_amount || 0).toFixed(3)} KWD`, true);
      }
      if (Number(d.refundAmount || d.refund_amount || 0) > 0) {
        drawBilingualRow('Total Customer Refunds', 'إجمالي المبالغ المستردة', `-${Number(d.refundAmount || d.refund_amount || 0).toFixed(3)} KWD`);
      }

      drawLine(false);

      drawBilingualRow('TOTAL NET AMOUNT RECEIVED', 'إجمالي صافي المبلغ المحصل', `${Number(d.totalRevenue || d.total_revenue || 0).toFixed(3)} KWD`, true, true);

      if (d.summaries) {
        drawSummaries(d.summaries);
      }

      if (d.notes) {
        drawLine(true);
        drawBilingualRow('Notes', 'الملاحظات', String(d.notes));
      }

      drawLine(true);
      ctx.textAlign = 'center';
      ctx.font = m.footerText;
      ctx.fillText('Manager Signature: __________________', canvasWidth / 2, y);
      y += is80mm ? 26 : 20;
      ctx.fillText('Auditor Sign-off: __________________', canvasWidth / 2, y);
      y += 35;

      const finalCanvas = createCanvas(canvasWidth, y);
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(canvas, 0, 0, canvasWidth, y, 0, 0, canvasWidth, y);
      return finalCanvas;
    }

    // 3D. Periodic Date-Range Report Content
    if (payload.printType === 'PERIODIC_REPORT') {
      const p = payload.periodicData || {};
      const fromDate = p.fromDate || '-';
      const toDate = p.toDate || '-';
      const days = p.days || [];
      const grand = p.grandTotal || {};

      drawBilingualRow('From Date', 'من تاريخ', fromDate, true);
      drawBilingualRow('To Date', 'إلى تاريخ', toDate, true);
      drawBilingualRow('Total Days', 'إجمالي الأيام', `${days.length} Days`, true);

      drawLine(false);

      // Day-by-day rows
      ctx.font = m.rowLabelBold;
      ctx.textAlign = 'left';
      ctx.fillText('Date / التاريخ', 15, y);
      ctx.textAlign = 'center';
      ctx.fillText('Rentals', canvasWidth / 2 - 20, y);
      ctx.textAlign = 'right';
      ctx.fillText('Net Total (KD)', canvasWidth - 15, y);
      y += m.rowLineHeight;

      drawLine(true);

      for (const day of days) {
        ctx.font = m.rowLabel;
        ctx.textAlign = 'left';
        ctx.fillText(day.date, 15, y);
        ctx.textAlign = 'center';
        ctx.fillText(`${day.rentals || 0}`, canvasWidth / 2 - 20, y);
        ctx.textAlign = 'right';
        ctx.fillText(`${Number(day.total || 0).toFixed(3)}`, canvasWidth - 15, y);
        y += m.rowLineHeight;
      }

      drawLine(false);

      drawBilingualRow('Total Rentals', 'إجمالي المعاملات', `${grand.totalRentals || 0} Transactions`, true);
      drawBilingualRow('Total Cash', 'إجمالي النقد', `${Number(grand.totalCash || 0).toFixed(3)} KWD`);
      drawBilingualRow('Total KNET', 'إجمالي كي نت', `${Number(grand.totalKnet || 0).toFixed(3)} KWD`);
      if (Number(grand.totalDiscount || 0) > 0) {
        drawBilingualRow('Total Discounts', 'إجمالي الخصومات', `-${Number(grand.totalDiscount || 0).toFixed(3)} KWD`);
      }

      drawLine(false);

      drawBilingualRow('GRAND PERIOD TOTAL', 'الإجمالي العام للفترة', `${Number(grand.totalRevenue || 0).toFixed(3)} KWD`, true, true);

      if (p.summaries) {
        drawSummaries(p.summaries);
      }

      drawLine(true);
      ctx.textAlign = 'center';
      ctx.font = m.footerText;
      ctx.fillText('Generated on: ' + new Date().toLocaleString(), canvasWidth / 2, y);
      y += 35;

      const finalCanvas = createCanvas(canvasWidth, y);
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.drawImage(canvas, 0, 0, canvasWidth, y, 0, 0, canvasWidth, y);
      return finalCanvas;
    }

    // 4. Transaction Meta Information & Time Details
    const r = payload.rental || {};
    const invoiceNumber = payload.invoiceNo || r.invoice_no || r.invoiceNo || 'INV-000000';
    const dateStr = payload.settledAt || payload.cancelledAt || (r.start_time ? new Date(r.start_time).toLocaleString() : new Date().toLocaleString());

    const tInv = tr('INVOICE.NUMBER', 'Invoice No', 'رقم الفاتورة');
    const tDate = tr('COMMON.DATE', 'Date & Time', 'التاريخ والوقت');
    const tCust = tr('COMMON.CUSTOMER', 'Customer', 'العميل');
    const tMob = tr('COMMON.MOBILE', 'Mobile', 'الهاتف');
    const tCar = tr('CAR.VEHICLE', 'Vehicle', 'السيارة');

    drawBilingualRow(tInv.en, tInv.ar, invoiceNumber, true, true);
    drawBilingualRow(tDate.en, tDate.ar, dateStr);

    if (fmt.showCustomerInfo !== false) {
      const custName = r.customer_name || r.customerName || 'Walk-in / عميل نقدي';
      const custPhone = r.customer_phone || r.customerPhone || '-';
      drawBilingualRow(tCust.en, tCust.ar, custName);
      if (custPhone && custPhone !== '-') {
        drawBilingualRow(tMob.en, tMob.ar, custPhone);
      }
    }

    if (fmt.showCarDetails !== false) {
      const carNo = r.car_no || r.carNo || '-';
      const model = r.model || '-';
      drawBilingualRow(tCar.en, tCar.ar, `${carNo} (${model})`, true);
    }

    // 1) Time Details on Invoice (Start time, End time, Total usage duration)
    const rawStart = payload.startTime || r.start_time || r.startTime || r.created_at || r.createdAt;
    const isStartSlip = payload.printType === 'RECEIPT';
    let rawEnd = isStartSlip
      ? (payload.endTime || r.expected_end_time || r.expectedEndTime || r.actual_end_time || r.actualEndTime)
      : (payload.endTime || r.actual_end_time || r.actualEndTime || r.end_time || r.endTime || r.expected_end_time || r.expectedEndTime || r.cancelled_at || payload.settledAt);

    const parseFlexibleDate = (d: any): Date | null => {
      if (!d) return null;
      if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
      const direct = new Date(d);
      if (!isNaN(direct.getTime())) return direct;
      // Handle dd/MM/yyyy or dd-MM-yyyy locale strings
      const str = String(d).trim();
      const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?/);
      if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10) - 1;
        const year = parseInt(m[3], 10);
        let hours = m[4] ? parseInt(m[4], 10) : 0;
        const mins = m[5] ? parseInt(m[5], 10) : 0;
        const secs = m[6] ? parseInt(m[6], 10) : 0;
        const ampm = (m[7] || '').toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const parsed = new Date(year, month, day, hours, mins, secs);
        if (!isNaN(parsed.getTime())) return parsed;
      }
      return null;
    };

    const startDateObj = parseFlexibleDate(rawStart);
    let endDateObj = parseFlexibleDate(rawEnd);
    if (!endDateObj && startDateObj) {
      const durMins = Number(r.duration_minutes || r.durationMinutes || 60);
      endDateObj = new Date(startDateObj.getTime() + durMins * 60000);
    }

    const formatTime = (dateObj: Date | null) => {
      if (!dateObj || isNaN(dateObj.getTime())) return '-';
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };
    const startTimeStr = formatTime(startDateObj);
    const endTimeStr = formatTime(endDateObj);
    const totalDurationStr = payload.elapsedDuration || (r.duration_minutes ? `${r.duration_minutes} Mins / دقيقة` : '-');

    const tStart = tr('INVOICE.START_TIME', 'Start Time', 'وقت البدء');
    const tEnd = tr('INVOICE.END_TIME', 'End Time', 'وقت الانتهاء');
    const tTotalDur = tr('INVOICE.USAGE_DURATION', 'Total Usage Duration', 'إجمالي مدة الاستخدام');

    drawBilingualRow(tStart.en, tStart.ar, startTimeStr, true);
    if (!isStartSlip) {
      drawBilingualRow(tEnd.en, tEnd.ar, endTimeStr, true);
    }
    drawBilingualRow(tTotalDur.en, tTotalDur.ar, totalDurationStr, true);

    // Dashed Divider Line
    y += 6;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(15, y);
    ctx.lineTo(canvasWidth - 15, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += m.sectionSpacing;

    // 5. Pricing Breakdown
    if (fmt.showPricingBreakdown !== false) {
      const depositVal = Number(payload.depositAmount ?? (r.rental_amount || r.rentalAmount || 0)).toFixed(3);
      const extraVal = Number(payload.extraAmount ?? (r.extra_amount || r.extraAmount || 0)).toFixed(3);
      const discountVal = Number(payload.discountAmount ?? (r.discount || 0)).toFixed(3);
      const finalVal = Number(payload.finalAmount ?? (r.total_amount || r.totalAmount || 0)).toFixed(3);

      const tDep = tr('POS.DEPOSIT_AMOUNT', 'Deposit Paid', 'المبلغ المدفوع مقدماً');
      const tExt = tr('POS.EXTRA_CHARGE', 'Extra Duration Fee', 'رسوم الوقت الإضافي');
      const tDisc = tr('POS.DISCOUNT', 'Discount Amount (KD)', 'قيمة الخصم (د.ك)');
      const isStartReceipt = payload.printType === 'RECEIPT';
      const tTot = isStartReceipt
        ? tr('POS.TOTAL_DEPOSIT_PAID', 'UPFRONT DEPOSIT PAID', 'إجمالي العربون المدفوع')
        : tr('POS.FINAL_TOTAL', 'TOTAL CHARGE', 'إجمالي المبلغ المستحق');
      const tChg = tr('POS.CHANGE_TO_RETURN', 'CHANGE RETURNED', 'المتبقي المرجع للعميل');

      drawBilingualRow(tDep.en, tDep.ar, `${depositVal} KWD`);

      if (Number(extraVal) > 0) {
        drawBilingualRow(tExt.en, tExt.ar, `+ ${extraVal} KWD`, true);
      }

      if (Number(discountVal) > 0) {
        drawBilingualRow(tDisc.en, tDisc.ar, `- ${discountVal} KWD`, true);
        const discReason = payload.discountReason || r.discount_reason;
        if (discReason) {
          drawBilingualRow('Discount Reason', 'سبب الخصم', String(discReason));
        }
      }

      // Solid Highlight Divider
      y += 6;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(canvasWidth - 15, y);
      ctx.stroke();
      y += is80mm ? 26 : 20;

      drawBilingualRow(tTot.en, tTot.ar, `${finalVal} KWD`, true, true);

      if (payload.changeReturned !== undefined && Number(payload.changeReturned) > 0) {
        drawBilingualRow(tChg.en, tChg.ar, `${Number(payload.changeReturned).toFixed(3)} KWD`, true, true);
      }
    }

    // Dashed Divider Line
    y += 6;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(15, y);
    ctx.lineTo(canvasWidth - 15, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += m.sectionSpacing;

    // 6. Payment Method & Cashier (including Split Payment)
    if (fmt.showPaymentMethod !== false) {
      const method = payload.paymentMethod || r.payment_method || r.paymentMethod || 'CASH';
      const tPay = tr('POS.PAYMENT_METHOD', 'Payment Method', 'طريقة الدفع');
      if (method === 'SPLIT') {
        const cashVal = Number(payload.cashAmount ?? r.cash_amount ?? r.cashAmount ?? 0).toFixed(3);
        const knetVal = Number(payload.knetAmount ?? r.knet_amount ?? r.knetAmount ?? 0).toFixed(3);
        drawBilingualRow(tPay.en, tPay.ar, 'SPLIT / دفع مشترك', true, true);
        drawBilingualRow('• Cash Portion', '• المبلغ نقداً', `${cashVal} KWD`, true);
        drawBilingualRow('• KNET Portion', '• المبلغ عبر كي نت', `${knetVal} KWD`, true);
      } else {
        const methodLabel = method === 'CASH' ? 'CASH / نقداً' : 'KNET / CARD / كي نت - بطاقة';
        drawBilingualRow(tPay.en, tPay.ar, methodLabel, true);
      }
    }

    if (fmt.showCashier !== false) {
      const cashier = payload.cashierName || r.created_by || 'Cashier';
      const tCashier = tr('COMMON.CASHIER', 'Cashier', 'الكاشير');
      const tTerm = tr('PRINTER.TERMINAL', 'Terminal', 'نقطة البيع');
      drawBilingualRow(tCashier.en, tCashier.ar, cashier);
      drawBilingualRow(tTerm.en, tTerm.ar, payload.terminal || config.terminal || 'POS-Terminal-1');
    }

    // Settlement Remarks if present
    const stlRemarks = payload.settlementRemarks || r.settlement_remarks;
    if (stlRemarks && payload.printType !== 'CANCELLED') {
      const tRem = tr('BILLS.REMARKS', 'Remarks', 'ملاحظات');
      drawBilingualRow(tRem.en, tRem.ar, String(stlRemarks));
    }

    // Cancellation Details if applicable
    if (payload.printType === 'CANCELLED') {
      y += 6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(canvasWidth - 15, y);
      ctx.stroke();
      y += 24;

      const tReas = tr('BILLS.REASON', 'Cancel Reason', 'سبب الإلغاء');
      const tRem = tr('BILLS.REMARKS', 'Remarks', 'ملاحظات الإلغاء');
      const tBy = tr('BILLS.CANCELLED_BY', 'Cancelled By', 'أُلغيت بواسطة');

      drawBilingualRow(tReas.en, tReas.ar, payload.cancellationReason || 'Operational', true);
      if (payload.cancellationRemarks) {
        drawBilingualRow(tRem.en, tRem.ar, payload.cancellationRemarks);
      }
      drawBilingualRow(tBy.en, tBy.ar, payload.cancelledBy || 'Manager');
    }

    // 7. Barcode Graphic Simulation
    if (fmt.showBarcode !== false && invoiceNumber) {
      y += 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(canvasWidth - 15, y);
      ctx.stroke();
      y += is80mm ? 24 : 18;

      ctx.textAlign = 'center';
      const barHeight = is80mm ? 52 : 40;
      const barStartX = (canvasWidth - (44 * 7)) / 2;
      ctx.fillStyle = '#000000';
      for (let i = 0; i < 44; i++) {
        const bx = barStartX + (i * 7);
        const thick = (i % 3 === 0 || i % 7 === 0) ? 5 : 2.5;
        ctx.fillRect(bx, y, thick, barHeight);
      }
      y += barHeight + (is80mm ? 20 : 15);

      ctx.font = m.barcodeText;
      ctx.fillText(`* ${invoiceNumber} *`, canvasWidth / 2, y);
      y += is80mm ? 28 : 22;
    }

    // 8. Footer Notes & Rate Tariff (Replaces "Non-refundable after 5 minutes")
    y += 4;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, y);
    ctx.lineTo(canvasWidth - 15, y);
    ctx.stroke();
    y += is80mm ? 24 : 18;

    if (fmt.footerNotes) {
      drawCenteredWrapped('Thank you for choosing Kiddie Kruzzer!', is80mm ? 20 : 16, famEn, wHeavy, is80mm ? 6 : 4, false);
      drawCenteredWrapped('شكراً لاختياركم كيدي كروزر!', is80mm ? 20 : 16, famAr, wHeavy, is80mm ? 6 : 4, false);
    }

    // Rate Tariff Display from Print Format Master / Database
    const tariffContent = fmt.termsConditions || 
      'Rate Tariff / لائحة الأسعار:\n' +
      '• First Hour – Single Car: KWD 1.000\n' +
      '• First Hour – Double Car: KWD 2.000\n' +
      '• Additional Half-Hour – Single Car: KWD 0.500\n' +
      '• Additional Half-Hour – Double Car: KWD 1.000';

    const tariffLines = tariffContent.split('\n');
    for (const line of tariffLines) {
      if (line.trim()) {
        const isHeader = line.includes('Rate Tariff') || line.includes('لائحة الأسعار');
        drawCenteredWrapped(
          line.trim(), 
          is80mm ? (isHeader ? 16 : 14) : (isHeader ? 13 : 11), 
          famEn, 
          isHeader ? wHeavy : wNormal, 
          is80mm ? 6 : 4, 
          false
        );
      }
    }


    // Crop to exact rendered height
    const finalHeight = y + 10;
    const trimmedCanvas = createCanvas(canvasWidth, finalHeight);
    const trimmedCtx = trimmedCanvas.getContext('2d');
    trimmedCtx.drawImage(canvas, 0, 0, canvasWidth, finalHeight, 0, 0, canvasWidth, finalHeight);

    return trimmedCanvas;
  }

  /**
   * Generates a high-definition raster thermal receipt with English + Arabic both on every label
   */
  static buildEscPosBuffer(
    payload: ThermalPrintPayload,
    config: ThermalPrinterConfig,
    format?: PrintFormatConfig,
    translationsMap?: Map<string, { en: string; ar: string }>
  ): Buffer {
    const trimmedCanvas = this.buildThermalCanvas(payload, config, format, translationsMap);
    // Convert Canvas to 1-bit monochrome ESC/POS Raster Bit Image Buffer
    return this.canvasToEscPosRasterBuffer(trimmedCanvas, config.autoCut, config.cashDrawer);
  }

  /**
   * List installed Windows printers for USB printer auto-detection
   */
  static async getSystemPrinters(): Promise<Array<{ name: string; port: string; driver: string; status: string; isDefault: boolean; isUsb: boolean }>> {
    const scriptPath = path.resolve(__dirname, 'win-raw-printer.ps1');
    return new Promise((resolve) => {
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-ListPrinters'], { timeout: 4000 }, (err, stdout) => {
        if (err || !stdout) {
          console.warn('Could not list system printers via PowerShell:', err?.message);
          resolve([]);
          return;
        }
        try {
          const list = JSON.parse(stdout.trim());
          resolve(Array.isArray(list) ? list : [list]);
        } catch (parseErr) {
          console.warn('Failed to parse printer JSON output:', parseErr);
          resolve([]);
        }
      });
    });
  }

  /**
   * Fast check for physical USB printer reachability via Windows Print Spooler
   */
  static async testWindowsUsbPrinter(printerName: string, startTime: number): Promise<{ success: boolean; message: string; error?: string; latencyMs: number }> {
    const scriptPath = path.resolve(__dirname, 'win-raw-printer.ps1');
    const targetName = printerName || 'POS-80';

    return new Promise((resolve) => {
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-PrinterName', targetName, '-CheckOnly'], { timeout: 4000 }, (err, stdout, stderr) => {
        const latencyMs = Date.now() - startTime;
        if (err) {
          const errMsg = (stderr || stdout || err.message || '').trim().replace(/[\r\n]+/g, ' ');
          resolve({
            success: false,
            message: `USB Printer "${targetName}" is not connected or offline (${errMsg}).`,
            error: errMsg,
            latencyMs,
          });
        } else {
          const out = (stdout || '').trim();
          const resolvedName = out.startsWith('OK:') ? out.substring(3).trim() : targetName;
          resolve({
            success: true,
            message: `USB Printer "${resolvedName}" is ONLINE and ready (Windows Spooler RAW).`,
            latencyMs,
          });
        }
      });
    });
  }

  /**
   * Directly sends raw ESC/POS binary raster buffer (or GDI PNG image for PORTPROMPT / PDF printers) to Windows Print Spooler
   */
  static async sendToWindowsUsbPrinter(
    buffer: Buffer,
    config: ThermalPrinterConfig,
    startTime: number,
    pngBuffer?: Buffer
  ): Promise<{ success: boolean; message: string; error?: string; latencyMs: number }> {
    const scriptPath = path.resolve(__dirname, 'win-raw-printer.ps1');
    const targetPrinter = config.windowsPrinterName || config.printerName || 'POS-80';
    const uid = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempFile = path.join(os.tmpdir(), `thermal_${uid}.bin`);
    const tempPngFile = path.join(os.tmpdir(), `thermal_${uid}.png`);

    try {
      fs.writeFileSync(tempFile, buffer);
      if (pngBuffer) {
        fs.writeFileSync(tempPngFile, pngBuffer);
      }
      const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-PrinterName', targetPrinter, '-FilePath', tempFile];
      if (pngBuffer) {
        args.push('-ImagePath', tempPngFile);
      }
      return await new Promise((resolve) => {
        execFile(
          'powershell.exe',
          args,
          { timeout: 120000 },
          (err, stdout, stderr) => {
            const latencyMs = Date.now() - startTime;
            try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
            try { if (fs.existsSync(tempPngFile)) fs.unlinkSync(tempPngFile); } catch {}

            if (err) {
              const errMsg = (stderr || stdout || err.message || '').trim().replace(/[\r\n]+/g, ' ');
              console.error(`[THERMAL PRINTER USB ERROR] Failed to send job to "${targetPrinter}":`, errMsg);
              resolve({
                success: false,
                message: `Failed to print to USB printer "${targetPrinter}": ${errMsg}`,
                error: errMsg,
                latencyMs,
              });
            } else {
              const out = (stdout || '').trim();
              const actualPrinter = out.startsWith('SUCCESS:') ? out.substring(8).trim() : targetPrinter;
              console.log(`[THERMAL PRINTER USB] Print dispatched to "${actualPrinter}" in ${latencyMs}ms (${buffer.length} bytes).`);
              resolve({
                success: true,
                message: `Bilingual print job sent directly to USB printer "${actualPrinter}" in ${latencyMs}ms.`,
                latencyMs,
              });
            }
          }
        );
      });
    } catch (writeErr: any) {
      const latencyMs = Date.now() - startTime;
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
      try { if (fs.existsSync(tempPngFile)) fs.unlinkSync(tempPngFile); } catch {}
      return {
        success: false,
        message: `Failed to create print buffer file for USB spooler: ${writeErr.message}`,
        error: writeErr.message,
        latencyMs,
      };
    }
  }

  /**
   * Fast hardware reachability check for physical thermal printers (LAN, USB, VIRTUAL)
   */
  static async testSocketConnection(config: ThermalPrinterConfig): Promise<{ success: boolean; message: string; error?: string; latencyMs: number }> {
    const startTime = Date.now();

    // 1. USB Direct Windows Printer (Zero network timeouts, instant status)
    if (config.interfaceType === 'USB') {
      const targetName = config.windowsPrinterName || config.printerName || 'POS-80';
      return await this.testWindowsUsbPrinter(targetName, startTime);
    }

    // 2. Virtual / Emulated Printer
    if (config.interfaceType === 'VIRTUAL' || config.ipAddress === '0.0.0.0') {
      return {
        success: true,
        message: `Virtual Thermal Printer (${config.printerName}) is ONLINE (Emulated).`,
        latencyMs: Date.now() - startTime,
      };
    }

    // 3. LAN / Network TCP Socket Ping
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeoutMs = 2500;
      let resolved = false;

      socket.setTimeout(timeoutMs);

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.connect(config.port, config.ipAddress, () => {
        if (!resolved) {
          resolved = true;
          const latencyMs = Date.now() - startTime;
          cleanup();
          resolve({
            success: true,
            message: `Printer ${config.printerName} (${config.ipAddress}:${config.port}) is ONLINE and responding (${latencyMs}ms).`,
            latencyMs,
          });
        }
      });

      socket.on('error', (err: any) => {
        if (!resolved) {
          resolved = true;
          const latencyMs = Date.now() - startTime;
          cleanup();
          resolve({
            success: false,
            message: `Failed to connect to ${config.ipAddress}:${config.port} (${err.code || err.message}).`,
            error: err.message,
            latencyMs,
          });
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          const latencyMs = Date.now() - startTime;
          cleanup();
          resolve({
            success: false,
            message: `Connection to printer at ${config.ipAddress}:${config.port} timed out after ${timeoutMs}ms.`,
            error: 'ETIMEDOUT',
            latencyMs,
          });
        }
      });
    });
  }

  /**
   * Directly dispatches the ESC/POS print job to the physical LAN thermal printer via TCP socket,
   * to USB thermal printer via Windows Spooler, or records virtual output if in test/development mode.
   */
  static async sendToPrinter(
    payload: ThermalPrintPayload,
    config: ThermalPrinterConfig
  ): Promise<{ success: boolean; message: string; error?: string; latencyMs: number }> {
    const startTime = Date.now();

    // 1. Preload translations from DB
    const translationsMap = await this.loadTranslations();

    // 2. Resolve Print Format if not explicitly passed
    let format = payload.formatConfig;
    if (!format) {
      format = await this.resolvePrintFormat({
        branch: payload.branchName || config.branchName || undefined,
        location: payload.locationName || config.locationName || undefined,
        terminal: payload.terminal || config.terminal || undefined,
        printerId: config.id || undefined,
        printType: payload.printType,
        language: payload.language || 'BOTH',
      });
    }

    // 3. Build thermal canvas and binary ESC/POS Raster Buffer with English + Arabic both on every label
    const trimmedCanvas = this.buildThermalCanvas(payload, config, format, translationsMap);
    const escposBuffer = this.canvasToEscPosRasterBuffer(trimmedCanvas, config.autoCut, config.cashDrawer);

    // 4. Inactive printer check
    if (!config.isActive) {
      return {
        success: false,
        message: `Printer "${config.printerName}" is marked INACTIVE in settings.`,
        latencyMs: Date.now() - startTime,
      };
    }

    // 5. USB Direct Windows Printing (Zero LAN socket fallback)
    if (config.interfaceType === 'USB') {
      const pngBuffer = trimmedCanvas.toBuffer('image/png');
      return await this.sendToWindowsUsbPrinter(escposBuffer, config, startTime, pngBuffer);
    }

    // 6. If interface is VIRTUAL or IP is localhost/virtual
    if (config.interfaceType === 'VIRTUAL' || config.ipAddress === '0.0.0.0') {
      const latencyMs = Date.now() - startTime;
      console.log(`[THERMAL PRINTER: VIRTUAL] Print job "${payload.printType}" (Bilingual HD Raster) processed successfully (${escposBuffer.length} bytes).`);
      return {
        success: true,
        message: `Direct bilingual print job dispatched successfully to Virtual Thermal Printer (${config.paperWidth}, ${format.formatName || 'Bilingual'}).`,
        latencyMs,
      };
    }

    // 6. LAN / Network TCP Socket Printing
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      const timeoutMs = 3500;

      socket.setTimeout(timeoutMs);

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.connect(config.port, config.ipAddress, () => {
        socket.write(escposBuffer, (err) => {
          if (err) {
            if (!resolved) {
              resolved = true;
              const latencyMs = Date.now() - startTime;
              cleanup();
              resolve({
                success: false,
                message: `Failed to write print buffer to printer at ${config.ipAddress}:${config.port}`,
                error: err.message,
                latencyMs,
              });
            }
          } else {
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                const latencyMs = Date.now() - startTime;
                cleanup();
                resolve({
                  success: true,
                  message: `Bilingual print job sent directly to ${config.printerName} (${config.ipAddress}:${config.port}) in ${latencyMs}ms.`,
                  latencyMs,
                });
              }
            }, 100);
          }
        });
      });

      socket.on('error', (err: any) => {
        if (!resolved) {
          resolved = true;
          const latencyMs = Date.now() - startTime;
          cleanup();
          console.warn(`[THERMAL PRINTER WARNING] Printer at ${config.ipAddress}:${config.port} unreachable (${err.message}). Logging failure.`);
          resolve({
            success: false,
            message: `Thermal printer at ${config.ipAddress}:${config.port} is unavailable (${err.code || err.message}).`,
            error: err.message,
            latencyMs,
          });
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          const latencyMs = Date.now() - startTime;
          cleanup();
          console.warn(`[THERMAL PRINTER TIMEOUT] Connection to ${config.ipAddress}:${config.port} timed out after ${timeoutMs}ms.`);
          resolve({
            success: false,
            message: `Connection to thermal printer at ${config.ipAddress}:${config.port} timed out.`,
            error: 'ETIMEDOUT',
            latencyMs,
          });
        }
      });
    });
  }
}
