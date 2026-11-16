import { pgTable, varchar, integer, numeric, timestamp, serial, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Companies Table
export const companies = pgTable('companies', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contact: varchar('contact', { length: 100 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Branches Table
export const branches = pgTable('branches', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  companyId: varchar('company_id', { length: 50 }).references(() => companies.id, { onDelete: 'set null' }),
  company: varchar('company', { length: 255 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Locations Table
export const locations = pgTable('locations', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  branchId: varchar('branch_id', { length: 50 }).references(() => branches.id, { onDelete: 'set null' }),
  branch: varchar('branch', { length: 255 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Car Models Table
export const carModels = pgTable('car_models', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  seats: integer('seats').default(1).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Cars Table
export const cars = pgTable('cars', {
  id: varchar('id', { length: 50 }).primaryKey(),
  carNo: varchar('car_no', { length: 50 }).notNull().unique(),
  modelId: varchar('model_id', { length: 50 }).references(() => carModels.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }),
  status: varchar('status', { length: 20 }).default('Available').notNull(),
  batteryLevel: integer('battery_level').default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Rates Setup Table
export const rates = pgTable('rates', {
  id: varchar('id', { length: 50 }).primaryKey(),
  modelId: varchar('model_id', { length: 50 }).references(() => carModels.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 255 }).notNull(),
  duration: integer('duration').notNull(), // duration in minutes
  amount: numeric('amount', { precision: 10, scale: 3 }).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Grace Periods Table
export const gracePeriods = pgTable('grace_periods', {
  id: varchar('id', { length: 50 }).primaryKey(),
  minutes: integer('minutes').notNull().default(10),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Users Table
export const users = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  employeeName: varchar('employee_name', { length: 255 }),
  password: varchar('password', { length: 255 }),
  role: varchar('role', { length: 20 }).default('STAFF').notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Shifts Table (Dynamic Shifts)
export const shifts = pgTable('shifts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  shiftNumber: integer('shift_number').default(1).notNull(),
  businessDate: varchar('business_date', { length: 20 }).notNull(), // YYYY-MM-DD
  startTime: timestamp('start_time', { withTimezone: true }).defaultNow().notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  cashierName: varchar('cashier_name', { length: 100 }).default('Cashier').notNull(),
  openedByUserId: varchar('opened_by_user_id', { length: 50 }).references(() => users.id, { onDelete: 'set null' }),
  openedByUsername: varchar('opened_by_username', { length: 100 }),
  closedByUserId: varchar('closed_by_user_id', { length: 50 }).references(() => users.id, { onDelete: 'set null' }),
  closedByUsername: varchar('closed_by_username', { length: 100 }),
  closedByName: varchar('closed_by_name', { length: 100 }),
  branchName: varchar('branch_name', { length: 255 }),
  locationName: varchar('location_name', { length: 255 }),
  terminalInfo: varchar('terminal_info', { length: 100 }),
  status: varchar('status', { length: 20 }).default('OPEN').notNull(), // OPEN, CLOSED
  openingCash: numeric('opening_cash', { precision: 10, scale: 3 }).default('0.000').notNull(),
  cashTotal: numeric('cash_total', { precision: 12, scale: 3 }).default('0.000').notNull(),
  knetTotal: numeric('knet_total', { precision: 12, scale: 3 }).default('0.000').notNull(),
  totalDiscount: numeric('total_discount', { precision: 12, scale: 3 }).default('0.000').notNull(),
  totalRefund: numeric('total_refund', { precision: 12, scale: 3 }).default('0.000').notNull(),
  totalRentals: integer('total_rentals').default(0).notNull(),
  overallTotal: numeric('overall_total', { precision: 12, scale: 3 }).default('0.000').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Rentals / Invoices Table
export const rentals = pgTable('rentals', {
  id: serial('id').primaryKey(),
  invoiceNo: varchar('invoice_no', { length: 50 }).notNull().unique(),
  carId: varchar('car_id', { length: 50 }).references(() => cars.id, { onDelete: 'restrict' }).notNull(),
  carNo: varchar('car_no', { length: 50 }).notNull(),
  model: varchar('model', { length: 255 }).notNull(),
  rateId: varchar('rate_id', { length: 50 }).references(() => rates.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  startTime: timestamp('start_time', { withTimezone: true }).defaultNow().notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  expectedEndTime: timestamp('expected_end_time', { withTimezone: true }).notNull(),
  actualEndTime: timestamp('actual_end_time', { withTimezone: true }),
  gracePeriodMinutes: integer('grace_period_minutes').default(10),
  rentalAmount: numeric('rental_amount', { precision: 10, scale: 3 }).notNull(),
  extraAmount: numeric('extra_amount', { precision: 10, scale: 3 }).default('0.000'),
  discount: numeric('discount', { precision: 10, scale: 3 }).default('0.000'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 3 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).default('CASH').notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  shiftId: varchar('shift_id', { length: 50 }).references(() => shifts.id, { onDelete: 'set null' }),
  shiftNumber: integer('shift_number').default(1),
  createdBy: varchar('created_by', { length: 100 }),
  
  // Cancellation tracking
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: varchar('cancelled_by', { length: 100 }),
  cancellationReasonId: varchar('cancellation_reason_id', { length: 50 }),
  cancellationReason: varchar('cancellation_reason', { length: 255 }),
  cancellationRemarks: text('cancellation_remarks'),

  // Reprint tracking
  reprintCount: integer('reprint_count').default(0),

  // Settlement, Split Payment & Discount tracking
  remarks: text('remarks'),
  settlementRemarks: text('settlement_remarks'),
  discountType: varchar('discount_type', { length: 50 }),
  discountValue: numeric('discount_value', { precision: 10, scale: 3 }),
  discountReason: varchar('discount_reason', { length: 255 }),
  depositAmount: numeric('deposit_amount', { precision: 10, scale: 3 }).default('0.000'),
  changeReturned: numeric('change_returned', { precision: 10, scale: 3 }).default('0.000'),
  cashAmount: numeric('cash_amount', { precision: 10, scale: 3 }).default('0.000'),
  knetAmount: numeric('knet_amount', { precision: 10, scale: 3 }).default('0.000'),
  swappedFromCarNo: varchar('swapped_from_car_no', { length: 50 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Cancellation Reasons Table
export const cancellationReasons = pgTable('cancellation_reasons', {
  id: varchar('id', { length: 50 }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  englishName: varchar('english_name', { length: 255 }).notNull(),
  arabicName: varchar('arabic_name', { length: 255 }).notNull(),
  isActive: varchar('is_active', { length: 20 }).default('ACTIVE').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Day Close Table
export const dayCloses = pgTable('day_closes', {
  id: serial('id').primaryKey(),
  closeDate: varchar('close_date', { length: 20 }).notNull().unique(),
  totalRentals: integer('total_rentals').default(0).notNull(),
  totalRevenue: numeric('total_revenue', { precision: 12, scale: 3 }).default('0.000').notNull(),
  cashAmount: numeric('cash_amount', { precision: 12, scale: 3 }).default('0.000').notNull(),
  cardAmount: numeric('card_amount', { precision: 12, scale: 3 }).default('0.000').notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 3 }).default('0.000'),
  refundAmount: numeric('refund_amount', { precision: 12, scale: 3 }).default('0.000'),
  totalShifts: integer('total_shifts').default(2).notNull(),
  closedBy: varchar('closed_by', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Translations Table
export const translations = pgTable('translations', {
  id: varchar('id', { length: 50 }).primaryKey(),
  translationKey: varchar('translation_key', { length: 150 }).notNull().unique(),
  englishText: text('english_text').notNull(),
  arabicText: text('arabic_text').notNull(),
  module: varchar('module', { length: 50 }).default('Common').notNull(),
  description: text('description'),
  isActive: varchar('is_active', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Print Audit Logs Table
export const printAuditLogs = pgTable('print_audit_logs', {
  id: serial('id').primaryKey(),
  invoiceNo: varchar('invoice_no', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  username: varchar('username', { length: 100 }).notNull(),
  locationName: varchar('location_name', { length: 255 }),
  terminalInfo: varchar('terminal_info', { length: 255 }),
  printerName: varchar('printer_name', { length: 255 }),
  printerType: varchar('printer_type', { length: 50 }).default('LAN'),
  status: varchar('status', { length: 20 }).default('SUCCESS').notNull(),
  errorMessage: text('error_message'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 15. Printer Settings / Master Table
export const printerSettings = pgTable('printer_settings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  printerName: varchar('printer_name', { length: 255 }).notNull(),
  interfaceType: varchar('interface_type', { length: 50 }).default('LAN').notNull(),
  ipAddress: varchar('ip_address', { length: 100 }).notNull(),
  port: integer('port').default(9100).notNull(),
  branchId: varchar('branch_id', { length: 50 }),
  branchName: varchar('branch_name', { length: 255 }),
  locationId: varchar('location_id', { length: 50 }),
  locationName: varchar('location_name', { length: 255 }),
  terminal: varchar('terminal', { length: 100 }).default('ALL'),
  printerType: varchar('printer_type', { length: 50 }).default('ESC/POS').notNull(),
  printType: varchar('print_type', { length: 50 }).default('ALL').notNull(), // ALL, SETTLEMENT, RECEIPT, DUPLICATE, REPORT
  paperWidth: varchar('paper_width', { length: 20 }).default('80mm').notNull(),
  encoding: varchar('encoding', { length: 50 }).default('CP864').notNull(),
  autoCut: boolean('auto_cut').default(true).notNull(),
  cashDrawer: boolean('cash_drawer').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  printOnStart: boolean('print_on_start').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const printers = printerSettings; // Alias for convenience

// 16. Print Format Master Table
export const printFormats = pgTable('print_formats', {
  id: varchar('id', { length: 50 }).primaryKey(),
  formatName: varchar('format_name', { length: 255 }).notNull(),
  branchId: varchar('branch_id', { length: 50 }),
  branchName: varchar('branch_name', { length: 255 }).default('All Branches'),
  locationId: varchar('location_id', { length: 50 }),
  locationName: varchar('location_name', { length: 255 }).default('All Locations'),
  terminal: varchar('terminal', { length: 100 }).default('ALL'),
  printerId: varchar('printer_id', { length: 50 }).default('ALL'),
  printerName: varchar('printer_name', { length: 255 }).default('ALL'),
  printType: varchar('print_type', { length: 50 }).default('ALL').notNull(), // ALL, SETTLEMENT, RECEIPT, DUPLICATE, CANCELLED, REPORT
  language: varchar('language', { length: 20 }).default('BOTH').notNull(), // EN, AR, BOTH
  paperWidth: varchar('paper_width', { length: 20 }).default('80mm').notNull(), // 80mm, 58mm
  fontSize: varchar('font_size', { length: 50 }).default('LARGE').notNull(), // SMALL, MEDIUM, LARGE, XLARGE
  fontFamily: varchar('font_family', { length: 100 }).default('MONOSPACE').notNull(), // MONOSPACE, SANS_SERIF, CONSOLAS, ROBOTO
  fontStyle: varchar('font_style', { length: 50 }).default('BOLD').notNull(), // BOLD, BLACK, NORMAL
  headerTitle: varchar('header_title', { length: 255 }).default('KIDDIE KRUZZER ENTERTAINMENT'),
  headerSubtitle: varchar('header_subtitle', { length: 255 }).default('Car Rental Tax Invoice'),
  showLogo: boolean('show_logo').default(true).notNull(),
  showCompanyHeader: boolean('show_company_header').default(true).notNull(),
  showBranchInfo: boolean('show_branch_info').default(true).notNull(),
  showCustomerInfo: boolean('show_customer_info').default(true).notNull(),
  showCarDetails: boolean('show_car_details').default(true).notNull(),
  showPricingBreakdown: boolean('show_pricing_breakdown').default(true).notNull(),
  showPaymentMethod: boolean('show_payment_method').default(true).notNull(),
  showCashier: boolean('show_cashier').default(true).notNull(),
  showBarcode: boolean('show_barcode').default(true).notNull(),
  footerNotes: text('footer_notes').default('Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر'),
  termsConditions: text('terms_conditions').default('Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق'),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  printOnStart: boolean('print_on_start').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Role Permissions Table (User Rights & Security)
export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  role: varchar('role', { length: 50 }).notNull(), // ADMIN, MANAGER, STAFF, CASHIER
  module: varchar('module', { length: 50 }).notNull(), // POS, BILLS_DUPLICATE, BILLS_CANCEL, SHIFT_CLOSE, DAY_CLOSE, COMPANY, BRANCH, LOCATION, USER, USER_RIGHTS, PRINTER_MASTER, PRINT_FORMAT_MASTER, etc.
  canView: boolean('can_view').default(true).notNull(),
  canAdd: boolean('can_add').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  canDelete: boolean('can_delete').default(false).notNull(),
  canPrint: boolean('can_print').default(true).notNull(),
  canExport: boolean('can_export').default(false).notNull(),
  canCancel: boolean('can_cancel').default(false).notNull(),
  canExecute: boolean('can_execute').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 18. User Permissions Table (Optional per-user override)
export const userPermissions = pgTable('user_permissions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 50 }).references(() => users.id, { onDelete: 'cascade' }),
  module: varchar('module', { length: 50 }).notNull(),
  canView: boolean('can_view').default(true).notNull(),
  canAdd: boolean('can_add').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  canDelete: boolean('can_delete').default(false).notNull(),
  canPrint: boolean('can_print').default(true).notNull(),
  canExport: boolean('can_export').default(false).notNull(),
  canCancel: boolean('can_cancel').default(false).notNull(),
  canExecute: boolean('can_execute').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 19. Audit Logs Table (Universal Transactional Trail)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 50 }),
  username: varchar('username', { length: 100 }),
  shiftId: varchar('shift_id', { length: 50 }),
  branch: varchar('branch', { length: 255 }),
  location: varchar('location', { length: 255 }),
  terminal: varchar('terminal', { length: 100 }),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 100 }),
  oldValues: text('old_values'),
  newValues: text('new_values'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 20. Customers Master Table (Phone-first Lookup & Customer-wise Reporting)
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  totalVisits: integer('total_visits').default(1).notNull(),
  totalSpent: numeric('total_spent', { precision: 12, scale: 3 }).default('0.000').notNull(),
  lastVisitAt: timestamp('last_visit_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const branchesRelations = relations(branches, ({ one }) => ({
  company: one(companies, {
    fields: [branches.companyId],
    references: [companies.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  branch: one(branches, {
    fields: [locations.branchId],
    references: [branches.id],
  }),
}));

export const carsRelations = relations(cars, ({ one }) => ({
  modelRef: one(carModels, {
    fields: [cars.modelId],
    references: [carModels.id],
  }),
}));

export const rentalsRelations = relations(rentals, ({ one }) => ({
  car: one(cars, {
    fields: [rentals.carId],
    references: [cars.id],
  }),
  rate: one(rates, {
    fields: [rentals.rateId],
    references: [rates.id],
  }),
  shift: one(shifts, {
    fields: [rentals.shiftId],
    references: [shifts.id],
  }),
}));
