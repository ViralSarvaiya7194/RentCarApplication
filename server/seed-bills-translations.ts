import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const billTranslations = [
  // Navigation
  { key: 'NAV.BILLS', en: 'Bills & Reprints', ar: 'الفواتير وإعادة الطباعة', module: 'Navigation' },

  // Bills Management
  { key: 'BILLS.TITLE', en: 'Bill & Receipt Management', ar: 'إدارة الفواتير والإيصالات', module: 'Bills' },
  { key: 'BILLS.SUBTITLE', en: 'Search, view, print duplicate receipts, and cancel bills with direct thermal printing and secure audit logging.', ar: 'بحث وعرض وطباعة فواتير مكررة وإلغاء الفواتير مع الطباعة الحرارية المباشرة والتدقيق الكامل.', module: 'Bills' },
  { key: 'BILLS.TOTAL_BILLS', en: 'Total Invoices', ar: 'إجمالي الفواتير', module: 'Bills' },
  { key: 'BILLS.COMPLETED', en: 'Completed', ar: 'مكتملة', module: 'Bills' },
  { key: 'BILLS.CANCELLED', en: 'Cancelled', ar: 'ملغاة', module: 'Bills' },
  { key: 'BILLS.CANCELLED_BILLS', en: 'Cancelled Bills', ar: 'الفواتير الملغاة', module: 'Bills' },
  { key: 'BILLS.SEARCH_PLACEHOLDER', en: 'Search by Invoice No, Customer, Mobile, Car No...', ar: 'ابحث برقم الفاتورة، العميل، الهاتف، رقم السيارة...', module: 'Bills' },
  { key: 'BILLS.DATE_ALL', en: 'All Dates', ar: 'جميع التواريخ', module: 'Bills' },
  { key: 'BILLS.DATE_TODAY', en: 'Today Only', ar: 'اليوم فقط', module: 'Bills' },
  { key: 'BILLS.VIEW_PREVIEW', en: 'View Bill (On Screen)', ar: 'عرض الفاتورة (معاينة شاشة)', module: 'Bills' },
  { key: 'BILLS.AUDIT_LOG_BTN', en: 'Print Audit Trail', ar: 'سجل تدقيق الطباعة', module: 'Bills' },
  { key: 'BILLS.AUDIT_LOG_TITLE', en: 'Print & Cancellation Audit Trail', ar: 'سجل عمليات الطباعة والإلغاء', module: 'Bills' },

  // Duplicate Bill
  { key: 'DUPLICATE.BADGE', en: 'Reprint', ar: 'نسخة مكررة', module: 'Duplicate' },
  { key: 'DUPLICATE.BANNER', en: 'DUPLICATE BILL / فاتورة مكررة', ar: 'فاتورة مكررة / DUPLICATE BILL', module: 'Duplicate' },
  { key: 'DUPLICATE.PRINT_BTN', en: 'Print Duplicate', ar: 'طباعة نسخة مكررة', module: 'Duplicate' },
  { key: 'DUPLICATE.PRINT_SUCCESS', en: 'Duplicate bill sent directly to thermal printer.', ar: 'تم إرسال الفاتورة المكررة إلى الطابعة الحرارية مباشرة.', module: 'Duplicate' },
  { key: 'DUPLICATE.PRINT_WARNING', en: 'Print job recorded. Printer response notice:', ar: 'تم تسجيل أمر الطباعة. تنبيه الطابعة:', module: 'Duplicate' },

  // Cancel Bill
  { key: 'CANCEL.BTN', en: 'Cancel Bill', ar: 'إلغاء الفاتورة', module: 'Cancel' },
  { key: 'CANCEL.BANNER', en: 'CANCELLED BILL / فاتورة ملغاة', ar: 'فاتورة ملغاة / CANCELLED BILL', module: 'Cancel' },
  { key: 'CANCEL.MODAL_TITLE', en: 'Cancel Bill Transaction', ar: 'إلغاء معاملة الفاتورة', module: 'Cancel' },
  { key: 'CANCEL.WARNING_TEXT', en: 'Cancelling this bill is irreversible. The vehicle will be released and transaction voided.', ar: 'إلغاء الفاتورة لا يمكن التراجع عنه. سيتم تحرير السيارة وإلغاء المعاملة من الإيرادات.', module: 'Cancel' },
  { key: 'CANCEL.REASON_LABEL', en: 'Cancellation Reason', ar: 'سبب الإلغاء', module: 'Cancel' },
  { key: 'CANCEL.REMARKS_LABEL', en: 'Remarks & Explanation', ar: 'الملاحظات والشرح', module: 'Cancel' },
  { key: 'CANCEL.REASON_PLACEHOLDER', en: 'Select cancellation reason', ar: 'اختر سبب الإلغاء', module: 'Cancel' },
  { key: 'CANCEL.REMARKS_PLACEHOLDER', en: 'Enter mandatory explanation for this cancellation...', ar: 'أدخل توضيحاً إلزامياً لسبب الإلغاء...', module: 'Cancel' },
  { key: 'CANCEL.CONFIRM_SUBMIT', en: 'Confirm & Print Void', ar: 'تأكيد الإلغاء والطباعة', module: 'Cancel' },
  { key: 'CANCEL.SUCCESS_MSG', en: 'Bill cancelled successfully! Void receipt sent to thermal printer.', ar: 'تم إلغاء الفاتورة بنجاح! وطباعة إيصال الإلغاء حرارياً.', module: 'Cancel' },
  { key: 'CANCEL.ERR_REASON_REQUIRED', en: 'Please select a cancellation reason.', ar: 'يرجى اختيار سبب الإلغاء.', module: 'Cancel' },
  { key: 'CANCEL.ERR_REMARKS_REQUIRED', en: 'Remarks explanation is mandatory (min 3 chars).', ar: 'حقل الملاحظات والشرح إلزامي (3 أحرف على الأقل).', module: 'Cancel' },
  { key: 'CANCEL.DETAILS_HEADER', en: 'Cancellation Record', ar: 'بيانات الإلغاء المعتمدة', module: 'Cancel' },
  { key: 'CANCEL.CANCELLED_BY', en: 'Cancelled by', ar: 'أُلغيت بواسطة', module: 'Cancel' },

  // Printer Settings
  { key: 'PRINTER.SETTINGS_TITLE', en: 'Thermal Printer Setup', ar: 'إعدادات الطابعة الحرارية', module: 'Printer' },
  { key: 'PRINTER.NAME', en: 'Printer Name', ar: 'اسم الطابعة', module: 'Printer' },
  { key: 'PRINTER.INTERFACE_TYPE', en: 'Interface Connection', ar: 'نوع الاتصال', module: 'Printer' },
  { key: 'PRINTER.IP_ADDRESS', en: 'IP Address', ar: 'عنوان IP', module: 'Printer' },
  { key: 'PRINTER.PORT', en: 'Port (default 9100)', ar: 'المنفذ (الافتراضي 9100)', module: 'Printer' },
  { key: 'PRINTER.PAPER_WIDTH', en: 'Paper Width', ar: 'عرض الورق', module: 'Printer' },
  { key: 'PRINTER.ENCODING', en: 'Code Page / Encoding', ar: 'ترميز المحارف', module: 'Printer' },
  { key: 'PRINTER.AUTO_CUT', en: 'Auto-cut paper', ar: 'قطع الورق تلقائياً', module: 'Printer' },
  { key: 'PRINTER.DRAWER_KICK', en: 'Open Cash Drawer', ar: 'فتح درج النقدية', module: 'Printer' },
  { key: 'PRINTER.TEST_BTN', en: 'Test Thermal Print', ar: 'اختبار الطباعة الحرارية', module: 'Printer' },
  { key: 'PRINTER.SAVED_MSG', en: 'Thermal printer configuration saved successfully.', ar: 'تم حفظ إعدادات الطابعة الحرارية بنجاح.', module: 'Printer' },

  // Common Extras
  { key: 'COMMON.VIEW', en: 'View', ar: 'عرض', module: 'Common' },
  { key: 'COMMON.ACTION', en: 'Action', ar: 'العملية', module: 'Common' },
  { key: 'COMMON.RECORDS', en: 'records', ar: 'سجلات', module: 'Common' },
  { key: 'COMMON.PRESET', en: 'Presets', ar: 'خيارات سريعة', module: 'Common' },
  { key: 'COMMON.QUICK_SELECT', en: 'Quick Select', ar: 'تحديد سريع', module: 'Common' },

  // POS & Settlement Enhanced Features
  { key: 'POS.NEW_RENTAL_TITLE', en: 'Start New Rental', ar: 'بدء تأجير جديد', module: 'POS' },
  { key: 'POS.RENTAL_DEPOSIT', en: 'Rental Deposit', ar: 'مبلغ التأجير / العربون', module: 'POS' },
  { key: 'POS.DEFAULT_10KD', en: 'Default: 10.000 KD', ar: 'الافتراضي: 10.000 د.ك', module: 'POS' },
  { key: 'POS.PRICING_POLICY_TITLE', en: 'Hourly Pricing & Grace Period', ar: 'تسعير الساعات وفترة السماح', module: 'POS' },
  { key: 'POS.GRACE_PERIOD_TEXT', en: 'First {{minutes}} mins: Free of charge (Grace Period)', ar: 'أول {{minutes}} دقائق: مجاناً (فترة سماح)', module: 'POS' },
  { key: 'POS.FIRST_HOUR_TEXT', en: 'First Hour (after grace period): 1.000 KD', ar: 'الساعة الأولى (بعد فترة السماح): 1.000 د.ك', module: 'POS' },
  { key: 'POS.EXTRA_HOURS_TEXT', en: 'Subsequent Hours: 0.500 KD (500 fils) / hour', ar: 'الساعات اللاحقة: 0.500 د.ك (500 فلس) / ساعة', module: 'POS' },
  { key: 'POS.TOTAL_TIME', en: 'Total Time / Elapsed', ar: 'إجمالي الوقت المنقضي', module: 'POS' },
  { key: 'POS.SETTLE_TIME', en: 'Settled At', ar: 'وقت التسوية', module: 'POS' },
  { key: 'POS.FIRST_HOUR_BASE', en: 'First Hour Base Rate', ar: 'سعر الساعة الأولى', module: 'POS' },
  { key: 'POS.EXTRA_HOURS_CHARGE', en: 'Additional Time Charge', ar: 'رسوم الوقت الإضافي', module: 'POS' },
  { key: 'POS.INITIAL_DEPOSIT_PAID', en: 'Initial Deposit Paid', ar: 'العربون المدفوع مسبقاً', module: 'POS' },
  { key: 'POS.GRACE_PERIOD_FREE', en: 'Within Grace Period (Free)', ar: 'ضمن فترة السماح (مجاناً)', module: 'POS' },
  { key: 'POS.DISCOUNT_TYPE_LABEL', en: 'Discount Type & Value', ar: 'نوع وقيمة الخصم', module: 'POS' },
  { key: 'POS.DISCOUNT_FIXED', en: 'Fixed Amount', ar: 'مبلغ ثابت', module: 'POS' },
  { key: 'POS.DISCOUNT_PERCENT', en: 'Percentage', ar: 'نسبة مئوية', module: 'POS' },
  { key: 'POS.REMARKS', en: 'Settlement Remarks / Notes', ar: 'ملاحظات وتفاصيل التسوية', module: 'POS' },
  { key: 'POS.REMARKS_PLACEHOLDER', en: 'Enter optional remarks or comments...', ar: 'أدخل أي ملاحظات أو تفاصيل إضافية...', module: 'POS' },
  { key: 'POS.DEPOSIT_AMOUNT', en: 'Deposit Paid', ar: 'العربون المدفوع', module: 'POS' },
  { key: 'POS.AMOUNT_DUE', en: 'Collect from Customer (Balance Due)', ar: 'المبلغ المطلوب تحصيله من العميل', module: 'POS' },
  { key: 'POS.DEPOSIT_REFUND_NOTE', en: 'Customer deposit exceeds total charges', ar: 'مبلغ العربون يغطي التكلفة ويفيض مسترد للعميل', module: 'POS' },
  { key: 'POS.COLLECT_REMAINDER_NOTE', en: 'Rental charges exceed initial deposit', ar: 'رسوم التأجير تجاوزت العربون ومتبقي مستحق', module: 'POS' },

  // Discount Master Types (Owners 100%, Staff 25%, Other Manual)
  { key: 'POS.NO_DISCOUNT', en: 'No Discount', ar: 'بدون خصم', module: 'POS' },
  { key: 'POS.DISCOUNT_OWNERS', en: 'Owners discount', ar: 'خصم الملاك', module: 'POS' },
  { key: 'POS.DISCOUNT_STAFF', en: 'Staff Discount', ar: 'خصم الموظفين', module: 'POS' },
  { key: 'POS.DISCOUNT_OTHER_MANUAL', en: 'Other Discount (Manual)', ar: 'خصم آخر (يدوي)', module: 'POS' },

  // Shift 1 & Shift 2 Lifecycle & Day Close
  { key: 'SHIFT.SHIFT_1_BADGE', en: 'Shift 1 (Morning)', ar: 'الوردية 1 (صباحية)', module: 'Shift' },
  { key: 'SHIFT.SHIFT_2_BADGE', en: 'Shift 2 (Evening)', ar: 'الوردية 2 (مسائية)', module: 'Shift' },
  { key: 'SHIFT.ACTIVE_CYCLE', en: 'Current Shift Cycle', ar: 'دورة الوردية الحالية', module: 'Shift' },
  { key: 'SHIFT.CLOSE_SHIFT_1_BTN', en: 'Close Shift 1 & Auto-Open Shift 2', ar: 'إغلاق الوردية 1 وفتح الوردية 2 تلقائياً', module: 'Shift' },
  { key: 'SHIFT.CLOSE_SHIFT_2_BTN', en: 'Close Shift 2 & Proceed to Day Close', ar: 'إغلاق الوردية 2 والانتقال لإغلاق اليوم', module: 'Shift' },
  { key: 'SHIFT.CONFIRM_CLOSE_SHIFT_1_PROMPT', en: 'Are you sure you want to close Shift 1? Shift 1 thermal report will be printed and Shift 2 will open immediately.', ar: 'هل أنت متأكد من إغلاق الوردية الأولى؟ ستتم طباعة تقرير الوردية حرارياً وفتح الوردية الثانية فوراً.', module: 'Shift' },
  { key: 'SHIFT.CONFIRM_CLOSE_SHIFT_2_PROMPT', en: 'Are you sure you want to close Shift 2? Shift 2 thermal report will be printed and Day Closing will be ready.', ar: 'هل أنت متأكد من إغلاق الوردية الثانية؟ ستتم طباعة تقرير الوردية حرارياً وتجهيز إغلاق اليوم.', module: 'Shift' },
  { key: 'SHIFT.SHIFT_1_CLOSED_AUTO_2', en: 'Shift 1 closed successfully! Report printed. Shift 2 is now OPEN.', ar: 'تم إغلاق الوردية الأولى وطباعة التقرير! تم فتح الوردية الثانية تلقائياً.', module: 'Shift' },
  { key: 'SHIFT.SHIFT_2_CLOSED_READY_DAY', en: 'Shift 2 closed successfully! Report printed. Please perform Day Closing now.', ar: 'تم إغلاق الوردية الثانية وطباعة التقرير! يرجى تنفيذ إغلاق اليوم الآن.', module: 'Shift' },
  { key: 'SHIFT.BOTH_SHIFTS_CLOSED', en: 'Both Shift 1 & Shift 2 are Closed Today', ar: 'تم إغلاق الورديتين الأولى والثانية لليوم', module: 'Shift' },
  { key: 'SHIFT.DAY_CLOSE_REQUIRED_MSG', en: 'All shifts for today are settled. Please proceed to Day Closing to finalize the day.', ar: 'تمت تصفية جميع ورديات اليوم. يرجى الانتقال إلى إغلاق اليوم لإنهاء الحسابات.', module: 'Shift' },
  { key: 'SHIFT.SHIFTS_CLOSED_LABEL', en: 'Shifts Audited', ar: 'الورديات المدققة', module: 'Shift' },
  { key: 'SHIFT.BLIND_AUDIT_NOTICE', en: '🔒 Blind Audit Mode: Financial amounts are hidden from screen and will be printed automatically on the thermal printer upon closing.', ar: '🔒 نظام الإغلاق الأعمى: المبالغ المالية محجوبة عن الشاشة ويتم تدقيقها وطباعتها تلقائياً عبر الطابعة الحرارية عند الإغلاق.', module: 'Shift' },

  // Day Close
  { key: 'DAY_CLOSE.STATUS_CLOSED', en: 'Day Closed & Audited', ar: 'تم إغلاق اليوم وتدقيقه', module: 'DayClose' },
  { key: 'DAY_CLOSE.STATUS_PENDING', en: 'Day Close Pending', ar: 'بانتظار إغلاق اليوم', module: 'DayClose' },
  { key: 'DAY_CLOSE.DAY_ALREADY_CLOSED_MSG', en: 'This business date has already been closed and finalized.', ar: 'تم إغلاق وتصفية هذا اليوم مسبقاً.', module: 'DayClose' },
  { key: 'DAY_CLOSE.BLIND_AUDIT_NOTICE', en: '🔒 Blind Audit Mode: All shift totals and collections are reconciled and will be printed automatically on the thermal printer.', ar: '🔒 نظام الإغلاق الأعمى: تمت مطابقة كافة إيرادات الورديات وستتم طباعة التقرير الشامل تلقائياً عبر الطابعة الحرارية.', module: 'DayClose' },

  // Navigation & Periodic Report
  { key: 'COMMON.ACCESS_DENIED', en: 'Access Denied', ar: 'غير مصرح بالدخول', module: 'Common' },
  { key: 'COMMON.NO_PERMISSION_REPORTS', en: 'You do not have permission to access Reports & Analytics. Please contact your administrator.', ar: 'ليس لديك صلاحية للوصول إلى مركز التقارير والإحصائيات. يرجى مراجعة المسؤول.', module: 'Common' },
  { key: 'NAV.PERIODIC_REPORT', en: 'Periodic Report', ar: 'التقرير الدوري', module: 'Navigation' },
  { key: 'NAV.REPORTS', en: 'Reports & Analytics', ar: 'التقارير والإحصائيات', module: 'Navigation' },
  { key: 'REPORTS.TITLE', en: 'Reports & Business Intelligence', ar: 'مركز التقارير والإحصائيات المتقدمة', module: 'Reports' },
  { key: 'REPORTS.SUBTITLE', en: 'Real-time sales dashboards, periodic thermal closing reports, aggregator reconciliation, and performance analytics.', ar: 'لوحات قياس المبيعات الحية، تقارير الإغلاق الحرارية الدورية، مطابقة القنوات والمنصات، وتحليلات أداء الكاشير.', module: 'Reports' },
  { key: 'REPORTS.FROM', en: 'From', ar: 'من', module: 'Reports' },
  { key: 'REPORTS.TO', en: 'To', ar: 'إلى', module: 'Reports' },
  { key: 'REPORTS.PRESET_TODAY', en: 'Today', ar: 'اليوم', module: 'Reports' },
  { key: 'REPORTS.PRESET_YESTERDAY', en: 'Yesterday', ar: 'أمس', module: 'Reports' },
  { key: 'REPORTS.PRESET_7DAYS', en: 'Last 7 Days', ar: 'آخر 7 أيام', module: 'Reports' },
  { key: 'REPORTS.PRESET_MONTH', en: 'This Month', ar: 'هذا الشهر', module: 'Reports' },
  { key: 'REPORTS.LOADING_DATA', en: 'Loading report analytics...', ar: 'جاري تحميل بيانات التقارير...', module: 'Reports' },
  { key: 'REPORTS.DISCOUNTS', en: 'Discounts', ar: 'الخصومات', module: 'Reports' },
  { key: 'REPORTS.REFUNDS', en: 'Refunds', ar: 'المستردات', module: 'Reports' },
  { key: 'REPORTS.TODAY_GROSS_REVENUE', en: "Today's Gross Revenue", ar: 'إجمالي إيرادات اليوم', module: 'Reports' },
  { key: 'REPORTS.FLEET_OCCUPANCY_RATE', en: 'Fleet Occupancy Rate', ar: 'معدل إشغال الأسطول', module: 'Reports' },
  { key: 'REPORTS.AVG_TICKET_SIZE', en: 'Average Ticket Value', ar: 'متوسط قيمة المعاملة', module: 'Reports' },
  { key: 'REPORTS.CASH_VS_CARD', en: 'Cash vs KNET Sales', ar: 'مبيعات النقد مقابل كي نت', module: 'Reports' },
  { key: 'REPORTS.TOP_VEHICLES_TITLE', en: 'Top 5 Performing Vehicles', ar: 'أعلى 5 سيارات أداءً وإيراداً', module: 'Reports' },
  { key: 'REPORTS.DAILY_TREND_7DAYS', en: 'Daily Revenue Trend (Last 7 Days)', ar: 'مؤشر الإيرادات اليومية (آخر 7 أيام)', module: 'Reports' },
  { key: 'REPORTS.DAILY_SALES_TITLE', en: 'Daily Detailed Sales Breakdown', ar: 'سجل المبيعات اليومي المفصل', module: 'Reports' },
  { key: 'REPORTS.PERIODIC_REPORT_TITLE', en: 'Periodic Day-wise Closing Report', ar: 'تقرير المبيعات والإغلاق الدوري (يومي)', module: 'Reports' },
  { key: 'REPORTS.PERIODIC_REPORT_SUBTITLE', en: 'Select date range and print formatted day-wise closing summary directly to thermal printer.', ar: 'اختر النطاق الزمني واطبع تقرير المبيعات والإغلاق اليومي مباشرة على الطابعة الحرارية.', module: 'Reports' },
  { key: 'REPORTS.PERIOD_FROM_TO', en: 'Selected Period Range', ar: 'نطاق الفترة المحددة', module: 'Reports' },
  { key: 'REPORTS.PRINT_PERIODIC_THERMAL_BTN', en: 'Print Periodic Thermal Report', ar: 'طباعة التقرير الدوري حرارياً', module: 'Reports' },
  { key: 'PRINT.THERMAL_PRINT_SENT', en: 'Periodic report sent directly to thermal printer.', ar: 'تم إرسال التقرير الدوري إلى الطابعة الحرارية مباشرة.', module: 'Print' },

  // Tabs
  { key: 'REPORTS.TAB_MANAGEMENT_DASHBOARD', en: 'Management Sales Dashboard', ar: 'لوحة مبيعات الإدارة', module: 'Reports' },
  { key: 'REPORTS.TAB_DAILY_SUMMARY', en: 'Daily Sales Summary', ar: 'ملخص المبيعات اليومي', module: 'Reports' },
  { key: 'REPORTS.TAB_PERIODIC_REPORT', en: 'Periodic Reports (Day-wise)', ar: 'التقارير الدورية (حسب اليوم)', module: 'Reports' },
  { key: 'REPORTS.TAB_LOCATION_SALES', en: 'Location-wise Sales', ar: 'المبيعات حسب الموقع والفرع', module: 'Reports' },
  { key: 'REPORTS.TAB_ITEM_SALES', en: 'Item-wise Sales', ar: 'المبيعات حسب الطراز والنوع', module: 'Reports' },
  { key: 'REPORTS.TAB_PAYMENT_COLLECTION', en: 'Payment & Collection', ar: 'المقبوضات وطرق الدفع', module: 'Reports' },
  { key: 'REPORTS.TAB_AGGREGATOR_SALES', en: 'Aggregator Sales & Reconciliation', ar: 'مبيعات القنوات ومطابقة المنصات', module: 'Reports' },
  { key: 'REPORTS.TAB_DISCOUNT_ANALYSIS', en: 'Discount Analysis', ar: 'تحليل وتوزيع الخصومات', module: 'Reports' },
  { key: 'REPORTS.TAB_CANCELLATION_ANALYSIS', en: 'Cancellation & Refund Analysis', ar: 'تحليل الإلغاءات والمبالغ المستردة', module: 'Reports' },
  { key: 'REPORTS.TAB_CASHIER_PERFORMANCE', en: 'Cashier/Employee Performance', ar: 'أداء وإنتاجية الكاشير والموظفين', module: 'Reports' }
];

async function seed() {
  const client = new Client({
    host: process.env['DB_HOST'] || '127.0.0.1',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'postgres',
    database: process.env['DB_NAME'] || 'rental_car_db',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL. Seeding Bills & Thermal Printer translations...');

    // 1. Create tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS cancellation_reasons (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        english_name VARCHAR(255) NOT NULL,
        arabic_name VARCHAR(255) NOT NULL,
        is_active VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (is_active IN ('ACTIVE', 'INACTIVE')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS print_audit_logs (
        id SERIAL PRIMARY KEY,
        invoice_no VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        location_name VARCHAR(255),
        terminal_info VARCHAR(255),
        printer_name VARCHAR(255),
        printer_type VARCHAR(50) DEFAULT 'LAN',
        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        error_message TEXT,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS printer_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'DEFAULT_PRINTER',
        printer_name VARCHAR(255) NOT NULL DEFAULT 'Counter 1 Thermal Printer',
        interface_type VARCHAR(50) NOT NULL DEFAULT 'LAN',
        ip_address VARCHAR(100) NOT NULL DEFAULT '192.168.1.200',
        port INTEGER NOT NULL DEFAULT 9100,
        paper_width VARCHAR(20) NOT NULL DEFAULT '80mm',
        encoding VARCHAR(50) NOT NULL DEFAULT 'CP864',
        auto_cut BOOLEAN NOT NULL DEFAULT TRUE,
        cash_drawer BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS reprint_count INTEGER DEFAULT 0;
      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(100);
      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_reason_id VARCHAR(50);
      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);
      ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_remarks TEXT;
    `);

    // 2. Insert Cancellation Reasons Seeds
    await client.query(`
      INSERT INTO cancellation_reasons (id, code, english_name, arabic_name, is_active, sort_order) VALUES
        ('CR-101', 'CUSTOMER_REQUEST', 'Customer Requested Cancellation', 'طلب العميل إلغاء الفاتورة', 'ACTIVE', 1),
        ('CR-102', 'CAR_MALFUNCTION', 'Vehicle Technical Issue / Malfunction', 'عطل فني في السيارة', 'ACTIVE', 2),
        ('CR-103', 'BILLING_ERROR', 'Cashier Billing / Keying Error', 'خطأ في إدخال بيانات الفاتورة', 'ACTIVE', 3),
        ('CR-104', 'DUPLICATE_ENTRY', 'Duplicate Rental Entry', 'تكرار إدخال المعاملة', 'ACTIVE', 4),
        ('CR-105', 'CHILD_REFUSAL', 'Child Refused to Ride', 'عدم رغبة الطفل في الركوب', 'ACTIVE', 5),
        ('CR-106', 'MANAGEMENT_OVERRIDE', 'Management Authorization', 'إلغاء بتفويض من الإدارة', 'ACTIVE', 6)
      ON CONFLICT (code) DO UPDATE
      SET english_name = EXCLUDED.english_name,
          arabic_name = EXCLUDED.arabic_name,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order;
    `);

    // 3. Insert default printer settings if empty
    await client.query(`
      INSERT INTO printer_settings (id, printer_name, interface_type, ip_address, port, paper_width, encoding, auto_cut, cash_drawer, is_active)
      VALUES ('DEFAULT_PRINTER', 'Counter 1 Thermal Printer', 'LAN', '192.168.1.200', 9100, '80mm', 'CP864', true, false, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Upsert translations
    for (const item of billTranslations) {
      const id = `TRN-BILL-${Math.floor(1000 + Math.random() * 9000)}`;
      await client.query(`
        INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        ON CONFLICT (translation_key) DO UPDATE
        SET english_text = EXCLUDED.english_text,
            arabic_text = EXCLUDED.arabic_text,
            module = EXCLUDED.module,
            updated_at = NOW();
      `, [id, item.key, item.en, item.ar, item.module]);
    }

    console.log(`✅ Successfully seeded ${billTranslations.length} translation keys and initialized printer tables.`);
  } catch (err: any) {
    console.error('Error seeding translations/schema:', err.message);
  } finally {
    await client.end();
  }
}

seed();
