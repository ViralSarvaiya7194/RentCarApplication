import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';

export interface Migration {
  name: string;
  description: string;
  up: (client: PoolClient) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  // --------------------------------------------------------------------------
  // MIGRATION 001: Core tables and dynamic shifts/rentals alterations
  // --------------------------------------------------------------------------
  {
    name: '001_core_tables_and_dynamic_schema',
    description: 'Ensure core tables, dynamic shift columns, rentals settlement, and audit logs exist',
    up: async (client: PoolClient) => {
      // 1. Shifts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS shifts (
          id VARCHAR(50) PRIMARY KEY,
          shift_number INTEGER NOT NULL DEFAULT 1,
          business_date VARCHAR(20) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP WITH TIME ZONE,
          cashier_name VARCHAR(100) NOT NULL DEFAULT 'Cashier',
          username VARCHAR(100) DEFAULT 'Cashier',
          opened_by_user_id VARCHAR(50),
          opened_by_username VARCHAR(100),
          closed_by_user_id VARCHAR(50),
          closed_by_username VARCHAR(100),
          closed_by_name VARCHAR(100),
          branch_name VARCHAR(255) DEFAULT 'Kiddie Kruzzer',
          location_name VARCHAR(255) DEFAULT 'Avenues Mall -Phase -4- Gate 25',
          terminal_info VARCHAR(100) DEFAULT 'POS-Terminal-1',
          status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
          opening_cash NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
          cash_total NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          knet_total NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          total_discount NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          total_refund NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          total_rentals INTEGER NOT NULL DEFAULT 0,
          overall_total NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'shifts' AND column_name = 'id' AND data_type != 'character varying'
          ) THEN
            ALTER TABLE shifts ALTER COLUMN id TYPE VARCHAR(50) USING id::varchar;
          END IF;
        END $$;

        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_number INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS business_date VARCHAR(20) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(100) NOT NULL DEFAULT 'Cashier';
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS username VARCHAR(100) DEFAULT 'Cashier';
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS opened_by_user_id VARCHAR(50);
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS opened_by_username VARCHAR(100);
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS closed_by_user_id VARCHAR(50);
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS closed_by_username VARCHAR(100);
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(100);
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255) DEFAULT 'Kiddie Kruzzer';
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS location_name VARCHAR(255) DEFAULT 'Avenues Mall -Phase -4- Gate 25';
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS terminal_info VARCHAR(100) DEFAULT 'POS-Terminal-1';
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS opening_cash NUMERIC(10, 3) NOT NULL DEFAULT 0.000;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cash_total NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS knet_total NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS total_discount NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS total_refund NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS total_rentals INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS overall_total NUMERIC(12, 3) NOT NULL DEFAULT 0.000;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
      `);

      // 2. Rentals alterations (Foreign key dropped, shift_id VARCHAR, discount/deposit columns)
      await client.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'rentals' AND constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%shift_id%'
          ) LOOP
            EXECUTE 'ALTER TABLE rentals DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
          END LOOP;
        END $$;

        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'rentals' AND column_name = 'shift_id' AND data_type != 'character varying'
          ) THEN
            ALTER TABLE rentals ALTER COLUMN shift_id TYPE VARCHAR(50) USING shift_id::varchar;
          END IF;
        END $$;

        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS shift_id VARCHAR(50);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS shift_number INTEGER DEFAULT 1;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS settlement_remarks TEXT;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS change_returned NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS extra_amount NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS reprint_count INTEGER DEFAULT 0;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(100);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_reason_id VARCHAR(50);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_remarks TEXT;

        CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
        CREATE INDEX IF NOT EXISTS idx_rentals_car_id ON rentals(car_id);
        CREATE INDEX IF NOT EXISTS idx_rentals_shift_id ON rentals(shift_id);
      `);

      // 3. Day Closes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS day_closes (
          id SERIAL PRIMARY KEY,
          close_date VARCHAR(20) NOT NULL UNIQUE,
          total_rentals INTEGER NOT NULL DEFAULT 0,
          total_revenue NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          cash_amount NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          card_amount NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          discount_amount NUMERIC(12, 3) DEFAULT 0.000,
          refund_amount NUMERIC(12, 3) DEFAULT 0.000,
          total_shifts INTEGER NOT NULL DEFAULT 2,
          closed_by VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE day_closes ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 3) DEFAULT 0.000;
        ALTER TABLE day_closes ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 3) DEFAULT 0.000;
        ALTER TABLE day_closes ADD COLUMN IF NOT EXISTS total_shifts INTEGER DEFAULT 2;
      `);

      // 4. Audit Logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50),
          username VARCHAR(100),
          shift_id VARCHAR(50),
          branch VARCHAR(255),
          location VARCHAR(255),
          terminal VARCHAR(100),
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50),
          entity_id VARCHAR(100),
          old_values TEXT,
          new_values TEXT,
          remarks TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS shift_id VARCHAR(50);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS branch VARCHAR(255);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS location VARCHAR(255);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS terminal VARCHAR(100);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS remarks TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_shift ON audit_logs(shift_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      `);

      // 5. Cancellation reasons table & seeds
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
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 002: Rates Setup & Cleanup (Single 1.000 KD, Double 2.000 KD)
  // --------------------------------------------------------------------------
  {
    name: '002_update_rates_single_and_double_seater',
    description: 'Delete dummy rates RAT-101..106 and upsert Single Seater (1.000 KD) & Double Seater (2.000 KD)',
    up: async (client: PoolClient) => {
      // 1. Delete conflicting dummy rates
      await client.query(
        "DELETE FROM rates WHERE id IN ('RAT-101', 'RAT-102', 'RAT-103', 'RAT-104', 'RAT-105', 'RAT-106')"
      );

      // 2. Upsert Single Seater rate (1.000 KD, 60 mins)
      await client.query(`
        INSERT INTO rates (id, model_id, model, duration, amount, status)
        VALUES ('RAT-001', 'MOD-101', 'Single Seater', 60, 1.000, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE 
        SET model_id = 'MOD-101', model = 'Single Seater', duration = 60, amount = 1.000, status = 'ACTIVE'
      `);

      // 3. Upsert Double Seater rate (2.000 KD, 60 mins)
      await client.query(`
        INSERT INTO rates (id, model_id, model, duration, amount, status)
        VALUES ('RAT-004', 'MOD-102', 'Double Seater', 60, 2.000, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE 
        SET model_id = 'MOD-102', model = 'Double Seater', duration = 60, amount = 2.000, status = 'ACTIVE'
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 003: Printer Master Settings, Custom Formats & Print Audit Trail
  // --------------------------------------------------------------------------
  {
    name: '003_printer_masters_and_customization',
    description: 'Ensure printer settings, custom formats, fonts, and print audit trail tables exist',
    up: async (client: PoolClient) => {
      // 1. Printer settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS printer_settings (
          id VARCHAR(50) PRIMARY KEY,
          printer_name VARCHAR(255) NOT NULL,
          windows_printer_name VARCHAR(255),
          interface_type VARCHAR(50) NOT NULL DEFAULT 'LAN',
          ip_address VARCHAR(100) NOT NULL,
          port INTEGER NOT NULL DEFAULT 9100,
          branch_id VARCHAR(50),
          branch_name VARCHAR(255),
          location_id VARCHAR(50),
          location_name VARCHAR(255),
          terminal VARCHAR(100) DEFAULT 'ALL',
          printer_type VARCHAR(50) NOT NULL DEFAULT 'ESC/POS',
          print_type VARCHAR(50) NOT NULL DEFAULT 'ALL',
          paper_width VARCHAR(20) NOT NULL DEFAULT '80mm',
          encoding VARCHAR(50) NOT NULL DEFAULT 'CP864',
          auto_cut BOOLEAN NOT NULL DEFAULT TRUE,
          cash_drawer BOOLEAN NOT NULL DEFAULT FALSE,
          print_on_start BOOLEAN NOT NULL DEFAULT TRUE,
          is_default BOOLEAN NOT NULL DEFAULT TRUE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS windows_printer_name VARCHAR(255);
        ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS print_on_start BOOLEAN DEFAULT TRUE;
        ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT TRUE;

        INSERT INTO printer_settings (id, printer_name, interface_type, ip_address, port, paper_width, encoding, auto_cut, cash_drawer, print_on_start, is_default, is_active)
        VALUES ('DEFAULT_PRINTER', 'Counter 1 Thermal Printer', 'LAN', '192.168.1.200', 9100, '80mm', 'CP864', true, false, true, true, true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // 2. Print formats table
      await client.query(`
        CREATE TABLE IF NOT EXISTS print_formats (
          id VARCHAR(50) PRIMARY KEY,
          format_name VARCHAR(255) NOT NULL,
          branch_id VARCHAR(50),
          branch_name VARCHAR(255) DEFAULT 'All Branches',
          location_id VARCHAR(50),
          location_name VARCHAR(255) DEFAULT 'All Locations',
          terminal VARCHAR(100) DEFAULT 'ALL',
          printer_id VARCHAR(50) DEFAULT 'ALL',
          printer_name VARCHAR(255) DEFAULT 'ALL',
          print_type VARCHAR(50) NOT NULL DEFAULT 'ALL',
          language VARCHAR(20) NOT NULL DEFAULT 'BOTH',
          paper_width VARCHAR(20) NOT NULL DEFAULT '80mm',
          font_size VARCHAR(50) NOT NULL DEFAULT 'LARGE',
          font_family VARCHAR(100) NOT NULL DEFAULT 'MONOSPACE',
          font_style VARCHAR(50) NOT NULL DEFAULT 'BOLD',
          header_title VARCHAR(255) DEFAULT 'Your Events Management Company',
          header_subtitle VARCHAR(255) DEFAULT 'Car Rental Tax Invoice',
          show_logo BOOLEAN NOT NULL DEFAULT TRUE,
          show_company_header BOOLEAN NOT NULL DEFAULT TRUE,
          show_branch_info BOOLEAN NOT NULL DEFAULT TRUE,
          show_customer_info BOOLEAN NOT NULL DEFAULT TRUE,
          show_car_details BOOLEAN NOT NULL DEFAULT TRUE,
          show_pricing_breakdown BOOLEAN NOT NULL DEFAULT TRUE,
          show_payment_method BOOLEAN NOT NULL DEFAULT TRUE,
          show_cashier BOOLEAN NOT NULL DEFAULT TRUE,
          show_barcode BOOLEAN NOT NULL DEFAULT TRUE,
          print_on_start BOOLEAN NOT NULL DEFAULT TRUE,
          footer_notes TEXT DEFAULT 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
          terms_conditions TEXT DEFAULT 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_size VARCHAR(50) DEFAULT 'LARGE';
        ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'MONOSPACE';
        ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_style VARCHAR(50) DEFAULT 'BOLD';
        ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS print_on_start BOOLEAN DEFAULT TRUE;

        INSERT INTO print_formats (
          id, format_name, header_title, header_subtitle, font_size, font_family, font_style,
          footer_notes, terms_conditions, is_default, is_active, print_on_start
        ) VALUES (
          'FMT-DEFAULT', 'Standard 80mm ESC/POS Thermal Format', 'Your Events Management Company',
          'Car Rental Tax Invoice', 'LARGE', 'MONOSPACE', 'BOLD',
          'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
          'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
          true, true, true
        ) ON CONFLICT (id) DO NOTHING;
      `);

      // 3. Print audit logs table
      await client.query(`
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
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 004: Enterprise Role Permissions (RBAC)
  // --------------------------------------------------------------------------
  {
    name: '004_role_permissions_rbac',
    description: 'Ensure role_permissions and user_permissions exist with REPORTS, PERIODIC_REPORT, PRINTER_MASTER & BILLS modules',
    up: async (client: PoolClient) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id SERIAL PRIMARY KEY,
          role VARCHAR(50) NOT NULL,
          module VARCHAR(50) NOT NULL,
          can_view BOOLEAN NOT NULL DEFAULT false,
          can_add BOOLEAN NOT NULL DEFAULT false,
          can_edit BOOLEAN NOT NULL DEFAULT false,
          can_delete BOOLEAN NOT NULL DEFAULT false,
          can_print BOOLEAN NOT NULL DEFAULT false,
          can_export BOOLEAN NOT NULL DEFAULT false,
          can_cancel BOOLEAN NOT NULL DEFAULT false,
          can_execute BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (role, module)
        );

        CREATE TABLE IF NOT EXISTS user_permissions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
          module VARCHAR(50) NOT NULL,
          can_view BOOLEAN NOT NULL DEFAULT TRUE,
          can_add BOOLEAN NOT NULL DEFAULT FALSE,
          can_edit BOOLEAN NOT NULL DEFAULT FALSE,
          can_delete BOOLEAN NOT NULL DEFAULT FALSE,
          can_print BOOLEAN NOT NULL DEFAULT TRUE,
          can_export BOOLEAN NOT NULL DEFAULT FALSE,
          can_cancel BOOLEAN NOT NULL DEFAULT FALSE,
          can_execute BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Seed REPORTS Permissions
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES 
          ('ADMIN', 'REPORTS', true, true, true, true, true, true, true, true),
          ('MANAGER', 'REPORTS', true, false, false, false, true, true, false, false),
          ('STAFF', 'REPORTS', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORTS', false, false, false, false, false, false, false, false)
        ON CONFLICT (role, module) DO NOTHING;

        -- Seed PERIODIC_REPORT Permissions
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES 
          ('ADMIN', 'PERIODIC_REPORT', true, true, true, true, true, true, true, true),
          ('MANAGER', 'PERIODIC_REPORT', true, false, false, false, true, true, false, true),
          ('STAFF', 'PERIODIC_REPORT', true, false, false, false, true, false, false, true),
          ('CASHIER', 'PERIODIC_REPORT', true, false, false, false, true, false, false, true)
        ON CONFLICT (role, module) DO NOTHING;

        -- Seed PRINTER_MASTER & PRINT_FORMAT_MASTER Permissions
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES 
          ('ADMIN', 'PRINTER_MASTER', true, true, true, true, true, true, true, true),
          ('ADMIN', 'PRINT_FORMAT_MASTER', true, true, true, true, true, true, true, true)
        ON CONFLICT (role, module) DO NOTHING;

        -- Seed BILLS Module Permissions
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES 
          ('ADMIN', 'BILLS', true, true, true, true, true, true, true, true),
          ('MANAGER', 'BILLS', true, false, true, false, true, true, true, true),
          ('STAFF', 'BILLS', true, false, false, false, true, false, false, false),
          ('CASHIER', 'BILLS', true, false, false, false, true, false, false, false)
        ON CONFLICT (role, module) DO NOTHING;
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 005: System Settings & Sales Date
  // --------------------------------------------------------------------------
  {
    name: '005_sales_date_and_system_settings',
    description: 'Create system_settings table and initialize active CURRENT_SALES_DATE',
    up: async (client: PoolClient) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Initialize CURRENT_SALES_DATE if not present
        INSERT INTO system_settings (key, value, description)
        VALUES ('CURRENT_SALES_DATE', TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), 'Current active business sales date for shifts and operations')
        ON CONFLICT (key) DO NOTHING;
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 006: Comprehensive Bilingual Translations
  // --------------------------------------------------------------------------
  {
    name: '006_bilingual_translations_all',
    description: 'Seed complete bilingual Arabic and English translations for Bills, Reprints, Shifts, Sales Date & POS',
    up: async (client: PoolClient) => {
      const translations: { key: string; en: string; ar: string; module: string }[] = [
        // Sales Date & Shift Close
        { key: 'HEADER.SALES_DATE', en: 'Sales Date', ar: 'تاريخ المبيعات', module: 'Header' },
        { key: 'POS.SALES_DATE', en: 'Sales Date', ar: 'تاريخ المبيعات', module: 'POS' },
        { key: 'SHIFT.ACTIVE_SHIFT', en: 'Active Shift', ar: 'الوردية النشطة', module: 'Closing' },
        { key: 'PRINT.PRINT_SUCCESS', en: 'Receipt sent to printer successfully.', ar: 'تم إرسال الإيصال للطابعة بنجاح.', module: 'Print' },
        { key: 'DAY_CLOSE.RESET_MSG', en: 'Sales date reset to {date}. Next shift will be Shift #1.', ar: 'تمت إعادة تعيين تاريخ المبيعات إلى {date}. ستكون الوردية التالية هي الوردية رقم 1.', module: 'Closing' },

        // Bills & Reprints
        { key: 'NAV.BILLS', en: 'Bills & Reprints', ar: 'الفواتير وإعادة الطباعة', module: 'Navigation' },
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

        // Printer Setup & Start Rental Bill Copy
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
        { key: 'PRINTER.PRINT_ON_START', en: 'Print Bill Copy on Start/Punching', ar: 'طباعة نسخة الفاتورة عند الحجز والبدء', module: 'Printer' },
        { key: 'PRINTER.PRINT_ON_START_DESC', en: 'Give customer a bill copy when punching a rental', ar: 'إصدار نسخة فاتورة/عربون للعميل عند تسجيل بداية التأجير', module: 'Printer' },

        // POS & Punching
        { key: 'POS.PRINT_BILL_COPY', en: 'Give Bill Copy to Customer', ar: 'طباعة نسخة الفاتورة للعميل', module: 'POS' },
        { key: 'POS.PRINT_BILL_COPY_SUBTITLE', en: 'Print customer deposit receipt upon punching', ar: 'طباعة إيصال الحجز والعربون للعميل عند تسجيل البداية', module: 'POS' },
        { key: 'POS.PUNCH_PRINT_SUCCESS', en: 'Start rental bill copy printed successfully', ar: 'تمت طباعة نسخة فاتورة الحجز بنجاح', module: 'POS' },
        { key: 'POS.DEPOSIT_RECEIPT_TITLE', en: 'RENTAL & DEPOSIT RECEIPT', ar: 'إيصال تأجير وعربون', module: 'Receipt' },
        { key: 'POS.TOTAL_DEPOSIT_PAID', en: 'UPFRONT DEPOSIT PAID', ar: 'إجمالي العربون المدفوع', module: 'Receipt' },

        // Shift Lifecycle
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

        // Reports & Periodic Report
        { key: 'COMMON.ACCESS_DENIED', en: 'Access Denied', ar: 'غير مصرح بالدخول', module: 'Common' },
        { key: 'COMMON.NO_PERMISSION_REPORTS', en: 'You do not have permission to access Reports & Analytics. Please contact your administrator.', ar: 'ليس لديك صلاحية للوصول إلى مركز التقارير والإحصائيات. يرجى مراجعة المسؤول.', module: 'Common' },
        { key: 'NAV.PERIODIC_REPORT', en: 'Periodic Report', ar: 'التقرير الدوري', module: 'Navigation' },
        { key: 'NAV.REPORTS', en: 'Reports & Analytics', ar: 'التقارير والإحصائيات', module: 'Navigation' },
        { key: 'REPORTS.TITLE', en: 'Reports & Business Intelligence', ar: 'مركز التقارير والإحصائيات المتقدمة', module: 'Reports' },
        { key: 'REPORTS.SUBTITLE', en: 'Real-time sales dashboards, periodic thermal closing reports, aggregator reconciliation, and performance analytics.', ar: 'لوحات قياس المبيعات الحية، تقارير الإغلاق الحرارية الدورية، مطابقة القنوات والمنصات، وتحليلات أداء الكاشير.', module: 'Reports' },
        { key: 'REPORTS.PERIODIC_REPORT_TITLE', en: 'Periodic Day-wise Closing Report', ar: 'تقرير المبيعات والإغلاق الدوري (يومي)', module: 'Reports' },
        { key: 'REPORTS.PERIODIC_REPORT_SUBTITLE', en: 'Select date range and print formatted day-wise closing summary directly to thermal printer.', ar: 'اختر النطاق الزمني واطبع تقرير المبيعات والإغلاق اليومي مباشرة على الطابعة الحرارية.', module: 'Reports' },
        { key: 'REPORTS.PRINT_PERIODIC_THERMAL_BTN', en: 'Print Periodic Thermal Report', ar: 'طباعة التقرير الدوري حرارياً', module: 'Reports' },
        { key: 'PRINT.THERMAL_PRINT_SENT', en: 'Periodic report sent directly to thermal printer.', ar: 'تم إرسال التقرير الدوري إلى الطابعة الحرارية مباشرة.', module: 'Print' },

        // Rebranding
        { key: 'AUTH.APP_TITLE', en: 'Kiddie Kruzzer POS', ar: 'كيدي كروزر لنقاط البيع', module: 'Auth' },
        { key: 'COMMON.APP_NAME', en: 'Kiddie Kruzzer POS', ar: 'كيدي كروزر لنقاط البيع', module: 'Common' },
        { key: 'RECEIPT.THANK_YOU', en: 'Thank you for choosing Kiddie Kruzzer!', ar: 'شكراً لاختياركم كيدي كروزر!', module: 'Receipt' }
      ];

      for (const t of translations) {
        const id = `TRN-M-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 007: Company, Branch & Location Rebranding Defaults
  // --------------------------------------------------------------------------
  {
    name: '007_company_location_branding',
    description: 'Set default company (Your Events Management Company), branch (Kiddie Kruzzer), and location (Avenues Mall)',
    up: async (client: PoolClient) => {
      await client.query(`
        UPDATE companies SET name = 'Your Events Management Company' 
        WHERE id = 'CMP-101' OR name LIKE '%KidsDrive%' OR name LIKE '%Kids Drive%' OR name LIKE '%Kiddie Kruzzer Entertainment%';

        UPDATE branches SET name = 'Kiddie Kruzzer', company = 'Your Events Management Company' 
        WHERE id = 'BRN-101' OR company LIKE '%KidsDrive%' OR company LIKE '%Kids Drive%' OR company LIKE '%Kiddie Kruzzer Entertainment%';

        UPDATE locations SET name = 'Avenues Mall -Phase -4- Gate 25', branch = 'Kiddie Kruzzer' 
        WHERE id = 'LOC-101' OR name LIKE '%Zone A%' OR name LIKE '%Avenues%';

        UPDATE print_formats SET header_title = 'Your Events Management Company' 
        WHERE header_title LIKE '%KIDS DRIVE%' OR header_title LIKE '%KidsDrive%' OR header_title LIKE '%KIDDIE KRUZZER%';

        UPDATE print_formats SET footer_notes = 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر' 
        WHERE footer_notes LIKE '%KidsDrive%' OR footer_notes LIKE '%Kids Drive%';
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 008: Rate Tariff, Split Payments, Custom Discounts & Car Number Swaps
  // --------------------------------------------------------------------------
  {
    name: '008_rate_tariff_split_payment_custom_discount_shift_features',
    description: 'Add split payment columns, custom discounts, car swapping audit, 30-min rates, and rate tariff footer',
    up: async (client: PoolClient) => {
      // 1. Add rentals columns
      await client.query(`
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS knet_amount NUMERIC(10, 3) DEFAULT 0.000;
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS swapped_from_car_no VARCHAR(50);

        -- Backfill existing cash_amount and knet_amount
        UPDATE rentals SET cash_amount = total_amount 
        WHERE (cash_amount IS NULL OR cash_amount = 0) AND payment_method = 'CASH' AND total_amount > 0;

        UPDATE rentals SET knet_amount = total_amount 
        WHERE (knet_amount IS NULL OR knet_amount = 0) AND payment_method IN ('KNET', 'CARD') AND total_amount > 0;
      `);

      // 2. Ensure Database Rates (Single 60m: 1.000, Single 30m: 0.500, Double 60m: 2.000, Double 30m: 1.000)
      await client.query(`
        INSERT INTO rates (id, model_id, model, duration, amount, status)
        VALUES 
          ('RAT-001', 'MOD-101', 'Single Seater', 60, 1.000, 'ACTIVE'),
          ('RAT-002', 'MOD-101', 'Single Seater', 30, 0.500, 'ACTIVE'),
          ('RAT-004', 'MOD-102', 'Double Seater', 60, 2.000, 'ACTIVE'),
          ('RAT-005', 'MOD-102', 'Double Seater', 30, 1.000, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE 
        SET model = EXCLUDED.model,
            duration = EXCLUDED.duration,
            amount = EXCLUDED.amount,
            status = 'ACTIVE',
            updated_at = NOW();
      `);

      // 3. Ensure Discount Types in Database (Disabilities 50% + Custom Discount)
      await client.query(`
        CREATE TABLE IF NOT EXISTS discount_types (
          id VARCHAR(50) PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          english_name VARCHAR(255) NOT NULL,
          arabic_name VARCHAR(255) NOT NULL,
          calculation_type VARCHAR(50) DEFAULT 'PERCENTAGE' NOT NULL,
          default_value NUMERIC(10, 3) DEFAULT 0.000 NOT NULL,
          max_value NUMERIC(10, 3) DEFAULT 100.000 NOT NULL,
          requires_approval BOOLEAN DEFAULT FALSE NOT NULL,
          is_active VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
          sort_order INTEGER DEFAULT 0 NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        INSERT INTO discount_types (id, code, english_name, arabic_name, calculation_type, default_value, max_value, requires_approval, is_active, sort_order)
        VALUES 
          ('DT-101', 'DISABILITY_50', '50% Discount for Special Needs', 'خصم 50% لذوي الاحتياجات الخاصة', 'PERCENTAGE', 50.000, 50.000, false, 'ACTIVE', 1),
          ('DT-102', 'CUSTOM', 'Custom Staff Discount', 'خصم مخصص', 'PERCENTAGE', 0.000, 100.000, true, 'ACTIVE', 2)
        ON CONFLICT (code) DO UPDATE
        SET english_name = EXCLUDED.english_name,
            arabic_name = EXCLUDED.arabic_name,
            is_active = 'ACTIVE',
            updated_at = NOW();
      `);

      // 4. Update Invoice Footer Rate Tariff in Print Formats Master
      const rateTariffFooter = 
        'Rate Tariff / لائحة الأسعار:\n' +
        '• First Hour – Single Car: KWD 1.000 / الساعة الأولى – سيارة فردية: 1.000 د.ك\n' +
        '• First Hour – Double Car: KWD 2.000 / الساعة الأولى – سيارة زوجية: 2.000 د.ك\n' +
        '• Additional Half-Hour – Single Car: KWD 0.500 / نصف ساعة إضافية – سيارة فردية: 0.500 د.ك\n' +
        '• Additional Half-Hour – Double Car: KWD 1.000 / نصف ساعة إضافية – سيارة زوجية: 1.000 د.ك';

      await client.query(`
        UPDATE print_formats 
        SET terms_conditions = $1
        WHERE terms_conditions LIKE '%5 minutes%' 
           OR terms_conditions LIKE '%5 دقائق%' 
           OR terms_conditions IS NULL 
           OR terms_conditions = '';
      `, [rateTariffFooter]);

      // 5. Ensure Shift Report Permissions
      await client.query(`
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES 
          ('ADMIN', 'SHIFT_REPORT', true, true, true, true, true, true, true, true),
          ('MANAGER', 'SHIFT_REPORT', true, false, false, false, true, true, false, true),
          ('STAFF', 'SHIFT_REPORT', true, false, false, false, true, true, false, false),
          ('CASHIER', 'SHIFT_REPORT', true, false, false, false, true, true, false, false)
        ON CONFLICT (role, module) DO NOTHING;
      `);

      // 6. Seed Bilingual Translations
      const newTranslations = [
        { key: 'INVOICE.START_TIME', en: 'Start Time', ar: 'وقت البدء', module: 'Invoice' },
        { key: 'INVOICE.END_TIME', en: 'End Time', ar: 'وقت الانتهاء', module: 'Invoice' },
        { key: 'INVOICE.USAGE_DURATION', en: 'Total Usage Duration', ar: 'إجمالي مدة الاستخدام', module: 'Invoice' },
        { key: 'INVOICE.RATE_TARIFF', en: 'Rate Tariff', ar: 'لائحة الأسعار', module: 'Invoice' },
        { key: 'POS.SPLIT', en: 'Split (Cash + KNET)', ar: 'مشترك (نقد + كي نت)', module: 'POS' },
        { key: 'POS.SPLIT_PAYMENT', en: 'Split Payment (Cash & KNET)', ar: 'الدفع المشترك (نقد وكي نت)', module: 'POS' },
        { key: 'POS.CASH_PORTION', en: 'Cash Paid', ar: 'المبلغ نقداً', module: 'POS' },
        { key: 'POS.KNET_PORTION', en: 'KNET Paid', ar: 'المبلغ عبر كي نت', module: 'POS' },
        { key: 'POS.SPLIT_MISMATCH', en: 'Cash + KNET must equal Total Due', ar: 'مجموع النقد وكي نت يجب أن يساوي الإجمالي المطلوب', module: 'POS' },
        { key: 'POS.CUSTOM_DISCOUNT', en: 'Custom Discount', ar: 'خصم مخصص', module: 'POS' },
        { key: 'POS.DISCOUNT_REASON', en: 'Discount Reason & Justification', ar: 'سبب الخصم ومبرره', module: 'POS' },
        { key: 'POS.DISCOUNT_REASON_REQ', en: 'Discount reason is mandatory for monitoring', ar: 'سبب الخصم إلزامي للرقابة والتدقيق', module: 'POS' },
        { key: 'POS.DISCOUNT_REASON_PLACEHOLDER', en: 'Enter mandatory reason for granting discount...', ar: 'أدخل سبب ومبرر منح الخصم إلزامياً...', module: 'POS' },
        { key: 'POS.CHANGE_CAR', en: 'Change Car Number', ar: 'تبديل رقم السيارة', module: 'POS' },
        { key: 'POS.CHANGE_CAR_TITLE', en: 'Change Assigned Vehicle', ar: 'تبديل السيارة المخصصة للعميل', module: 'POS' },
        { key: 'POS.SELECT_NEW_CAR', en: 'Select Replacement Vehicle', ar: 'اختر السيارة البديلة المتاحة', module: 'POS' },
        { key: 'POS.CHANGE_CAR_REASON', en: 'Reason for Car Change', ar: 'سبب تبديل السيارة', module: 'POS' },
        { key: 'POS.CHANGE_CAR_SUCCESS', en: 'Car number changed successfully! Time & billing remain intact.', ar: 'تم تبديل رقم السيارة بنجاح! والوقت والحساب مستمران.', module: 'POS' },
        { key: 'POS.CONFIRM_CHANGE_CAR', en: 'Confirm Vehicle Swap', ar: 'تأكيد تبديل السيارة', module: 'POS' },
        { key: 'DAY_CLOSE.CONFIRM_PROMPT', en: 'Are you sure you want to close the report? This will finalize all daily financial figures.', ar: 'هل أنت متأكد من إغلاق التقرير؟ سيتم اعتماد وتصفية جميع الحسابات لليوم.', module: 'DayClose' },
        { key: 'DAY_CLOSE.SUPERVISOR_AUTH', en: 'Supervisor / Manager Authorization', ar: 'اعتماد المشرف / المدير', module: 'DayClose' },
        { key: 'DAY_CLOSE.ENTER_PASSWORD', en: 'Enter supervisor password to authorize report closure', ar: 'أدخل كلمة مرور المشرف لاعتماد إغلاق التقرير', module: 'DayClose' },
        { key: 'DAY_CLOSE.TOTAL_CARS_USED', en: 'Total Cars Used', ar: 'إجمالي السيارات المستخدمة', module: 'DayClose' },
        { key: 'DAY_CLOSE.CASH_RECEIVED', en: 'Payments Received in Cash', ar: 'المقبوضات النقدية (كاش)', module: 'DayClose' },
        { key: 'DAY_CLOSE.KNET_RECEIVED', en: 'Payments Received through KNET', ar: 'المقبوضات عبر كي نت', module: 'DayClose' },
        { key: 'DAY_CLOSE.DISCOUNTS_GRANTED', en: 'Total Discounts Granted', ar: 'إجمالي الخصومات الممنوحة', module: 'DayClose' },
        { key: 'DAY_CLOSE.NET_AMOUNT', en: 'Total Net Amount Received', ar: 'إجمالي صافي المبلغ المحصل', module: 'DayClose' },
        { key: 'NAV.SHIFT_REPORT', en: 'Shift Report', ar: 'تقرير الوردية', module: 'Navigation' },
        { key: 'REPORTS.TAB_SHIFT_REPORT', en: 'Shift Report', ar: 'تقرير الوردية', module: 'Reports' },
        { key: 'SHIFT.TOTAL_CARS_USED', en: 'Cars Used in Shift', ar: 'السيارات المستخدمة بالوردية', module: 'Shift' },
      ];

      for (const t of newTranslations) {
        const id = `TRN-M-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 009: Allow SPLIT in rentals_payment_method_check constraint
  // --------------------------------------------------------------------------
  {
    name: '009_allow_split_payment_method_in_rentals_constraint',
    description: 'Update rentals payment_method CHECK constraint to permit SPLIT payment method',
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_payment_method_check;
        ALTER TABLE rentals ADD CONSTRAINT rentals_payment_method_check 
        CHECK (payment_method IN ('CASH', 'CARD', 'KNET', 'SPLIT'));
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 010: Add remarks column to rentals & Change Car translations
  // --------------------------------------------------------------------------
  {
    name: '010_add_remarks_to_rentals_and_translations',
    description: 'Ensure remarks column exists on rentals table and add change car translations',
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS remarks TEXT;
      `);

      const swapTranslations = [
        { key: 'POS.CHANGE_CAR', en: 'Change Car', ar: 'تغيير السيارة', module: 'POS' },
        { key: 'POS.CHANGE_CAR_TITLE', en: 'Change Assigned Car', ar: 'تغيير السيارة المخصصة', module: 'POS' },
        { key: 'POS.SELECT_NEW_CAR', en: 'Select New Available Car', ar: 'اختر سيارة متاحة جديدة', module: 'POS' },
        { key: 'POS.CHANGE_REASON', en: 'Reason for Change', ar: 'سبب تغيير السيارة', module: 'POS' },
        { key: 'POS.CONFIRM_CAR_CHANGE', en: 'Confirm Car Change', ar: 'تأكيد تغيير السيارة', module: 'POS' },
      ];

      for (const t of swapTranslations) {
        const id = `TRN-SWAP-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 011: Add car_model and elapsed_duration columns to rentals
  // --------------------------------------------------------------------------
  {
    name: '011_add_car_model_and_elapsed_duration_to_rentals',
    description: 'Ensure car_model and elapsed_duration columns exist on rentals table',
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS car_model VARCHAR(255);
        ALTER TABLE rentals ADD COLUMN IF NOT EXISTS elapsed_duration INTEGER;
        UPDATE rentals SET car_model = model WHERE car_model IS NULL;
      `);
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 012: Add color to cars & Change Car translations
  // --------------------------------------------------------------------------
  {
    name: '012_add_color_to_cars_and_change_car_options',
    description: 'Add color column to cars and ensure all change car translations exist',
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE cars ADD COLUMN IF NOT EXISTS color VARCHAR(50);
      `);

      const changeCarTranslations = [
        { key: 'POS.CHANGE_CAR', en: 'Change Car', ar: 'تغيير السيارة', module: 'POS' },
        { key: 'POS.CHANGE_CAR_TITLE', en: 'Change Assigned Car', ar: 'تغيير السيارة المخصصة', module: 'POS' },
        { key: 'POS.CURRENT_CAR', en: 'Currently Assigned Car', ar: 'السيارة المخصصة حالياً', module: 'POS' },
        { key: 'POS.AVAILABLE_CARS', en: 'Available Replacement Cars', ar: 'السيارات البديلة المتاحة', module: 'POS' },
        { key: 'POS.SELECT_NEW_CAR', en: 'Select New Available Car', ar: 'اختر سيارة متاحة جديدة', module: 'POS' },
        { key: 'POS.CHANGE_REASON', en: 'Reason for Change', ar: 'سبب تغيير السيارة', module: 'POS' },
        { key: 'POS.CONFIRM_CAR_CHANGE', en: 'Confirm Car Change', ar: 'تأكيد تغيير السيارة', module: 'POS' },
        { key: 'CAR.COLOR', en: 'Colour / Color', ar: 'اللون', module: 'Fleet' },
        { key: 'BILLS.CHANGE_CAR', en: 'Change Car', ar: 'تغيير السيارة', module: 'Bills' },
      ];

      for (const t of changeCarTranslations) {
        const id = `TRN-SWAP-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 013: Page-wise reports permissions and rights
  // --------------------------------------------------------------------------
  {
    name: '013_page_wise_reports_permissions',
    description: 'Seed individual page-wise permissions and translations for all 11 reports',
    up: async (client: PoolClient) => {
      // 1. Seed role_permissions for all individual reports
      await client.query(`
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES
          -- ADMIN: Full rights for all individual reports
          ('ADMIN', 'REPORT_DASHBOARD', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_DAILY_SUMMARY', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_PERIODIC', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_SHIFT', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_LOCATION', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_ITEM', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_PAYMENT', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_AGGREGATOR', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_DISCOUNT', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_CANCELLATION', true, true, true, true, true, true, true, true),
          ('ADMIN', 'REPORT_CASHIER', true, true, true, true, true, true, true, true),

          -- MANAGER: View, Print, Export rights for all reports
          ('MANAGER', 'REPORT_DASHBOARD', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_DAILY_SUMMARY', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_PERIODIC', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_SHIFT', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_LOCATION', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_ITEM', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_PAYMENT', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_AGGREGATOR', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_DISCOUNT', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_CANCELLATION', true, false, false, false, true, true, false, false),
          ('MANAGER', 'REPORT_CASHIER', true, false, false, false, true, true, false, false),

          -- STAFF: Default Daily Summary and Shift report view/print
          ('STAFF', 'REPORT_DASHBOARD', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_DAILY_SUMMARY', true, false, false, false, true, false, false, false),
          ('STAFF', 'REPORT_PERIODIC', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_SHIFT', true, false, false, false, true, false, false, false),
          ('STAFF', 'REPORT_LOCATION', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_ITEM', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_PAYMENT', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_AGGREGATOR', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_DISCOUNT', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_CANCELLATION', false, false, false, false, false, false, false, false),
          ('STAFF', 'REPORT_CASHIER', false, false, false, false, false, false, false, false),

          -- CASHIER: Default Shift report view/print
          ('CASHIER', 'REPORT_DASHBOARD', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_DAILY_SUMMARY', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_PERIODIC', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_SHIFT', true, false, false, false, true, false, false, false),
          ('CASHIER', 'REPORT_LOCATION', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_ITEM', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_PAYMENT', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_AGGREGATOR', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_DISCOUNT', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_CANCELLATION', false, false, false, false, false, false, false, false),
          ('CASHIER', 'REPORT_CASHIER', false, false, false, false, false, false, false, false)
        ON CONFLICT (role, module) DO NOTHING;
      `);

      // 2. Add translation keys for reports if missing
      const reportTranslations = [
        { key: 'REPORTS.TAB_SHIFT_REPORT', en: 'Shift Sales Report', ar: 'تقرير مبيعات الوردية', module: 'Reports' },
        { key: 'REPORTS.ACCESS_DENIED_TITLE', en: 'Access Denied', ar: 'غير مصرح بالدخول', module: 'Reports' },
        { key: 'REPORTS.ACCESS_DENIED_DESC', en: 'You do not have page permissions to view this report.', ar: 'ليس لديك صلاحية صفحة لعرض هذا التقرير.', module: 'Reports' },
        { key: 'REPORTS.PAGE_RIGHTS_REQUIRED', en: 'Contact an administrator to grant you page rights for this report.', ar: 'يرجى مراجعة مسؤول النظام لمنحك صلاحية الوصول لهذه الصفحة.', module: 'Reports' },
        { key: 'REPORTS.SWITCH_REPORT', en: 'Switch Report', ar: 'تبديل التقرير', module: 'Reports' },
        { key: 'REPORTS.PAGE_TITLE', en: 'Reports & Business Intelligence', ar: 'التقارير وذكاء الأعمال', module: 'Reports' },
        { key: 'NAV.REPORTS_ALL', en: 'Reports & Analytics', ar: 'التقارير والإحصائيات', module: 'Reports' },
      ];

      for (const t of reportTranslations) {
        const id = `TRN-RPT-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 014: Single Permission for Shift Close & Closing Report Supervisor Auth
  // --------------------------------------------------------------------------
  {
    name: '014_shift_close_supervisor_auth_permission',
    description: 'Seed unified SHIFT_CLOSING_SUPERVISOR_AUTH module permission across roles (admin/mgr direct, staff/cashier supervisor auth required)',
    up: async (client: PoolClient) => {
      // 1. Seed SHIFT_CLOSING_SUPERVISOR_AUTH permission
      // can_execute = false means Supervisor Auth is NOT required (direct close)
      // can_execute = true means Supervisor Auth IS required
      await client.query(`
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES
          ('ADMIN', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, true, true, true, true, true, true, false),
          ('MANAGER', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, false, false, false, true, true, false, false),
          ('STAFF', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, false, false, false, true, false, false, true),
          ('CASHIER', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, false, false, false, true, false, false, true)
        ON CONFLICT (role, module) DO NOTHING;
      `);

      // 2. Translations
      const translations = [
        { key: 'RIGHTS.SHIFT_CLOSING_SUPERVISOR_AUTH', en: 'Shift Close & Closing Report (Supervisor Auth Required)', ar: 'إغلاق الوردية والتقرير الختامي (طلب مصادقة المشرف)', module: 'Closing' },
        { key: 'RIGHTS.SUPERVISOR_AUTH_REQUIRED', en: 'Supervisor Authentication Required', ar: 'طلب مصادقة المشرف إلزامي', module: 'Closing' },
        { key: 'RIGHTS.SUPERVISOR_AUTH_NOT_REQUIRED', en: 'Supervisor Authentication Not Required', ar: 'مصادقة المشرف غير مطلوبة', module: 'Closing' }
      ];

      for (const t of translations) {
        const id = `TRN-CLS-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  },

  // --------------------------------------------------------------------------
  // MIGRATION 015: Customers Master Table, Phone-First Lookup & Customer-wise Reporting
  // --------------------------------------------------------------------------
  {
    name: '015_customers_master_and_phone_lookup',
    description: 'Create customers table, backfill from existing rentals, normalize customer names by phone, and seed customer report permissions/translations',
    up: async (client: PoolClient) => {
      // 1. Create customers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          phone VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          total_visits INTEGER NOT NULL DEFAULT 1,
          total_spent NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
          last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(LOWER(name));
        CREATE INDEX IF NOT EXISTS idx_rentals_customer_phone ON rentals(customer_phone);
      `);

      // 2. Backfill customers from existing rentals (taking most recent non-walk-in name per phone)
      await client.query(`
        WITH canonical_names AS (
          SELECT DISTINCT ON (TRIM(customer_phone))
            TRIM(customer_phone) AS phone,
            TRIM(customer_name) AS name
          FROM rentals
          WHERE customer_phone IS NOT NULL
            AND TRIM(customer_phone) <> ''
            AND customer_name IS NOT NULL
            AND TRIM(customer_name) <> ''
            AND LOWER(TRIM(customer_name)) NOT IN ('walk-in customer', 'walk-in', 'عميل نقدي', 'عميل عابر')
          ORDER BY TRIM(customer_phone), COALESCE(start_time, created_at) DESC
        ),
        phone_stats AS (
          SELECT
            TRIM(r.customer_phone) AS phone,
            MAX(COALESCE(NULLIF(TRIM(r.customer_name), ''), 'Walk-in Customer')) AS fallback_name,
            COUNT(*)::int AS total_visits,
            COALESCE(SUM(CASE WHEN r.status != 'CANCELLED' THEN COALESCE(r.total_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS total_spent,
            MAX(COALESCE(r.start_time, r.created_at, CURRENT_TIMESTAMP)) AS last_visit_at,
            MIN(COALESCE(r.start_time, r.created_at, CURRENT_TIMESTAMP)) AS created_at
          FROM rentals r
          WHERE r.customer_phone IS NOT NULL AND TRIM(r.customer_phone) <> ''
          GROUP BY TRIM(r.customer_phone)
        )
        INSERT INTO customers (phone, name, total_visits, total_spent, last_visit_at, created_at, updated_at)
        SELECT
          ps.phone,
          COALESCE(cn.name, ps.fallback_name, 'Walk-in Customer') AS name,
          ps.total_visits,
          ps.total_spent,
          ps.last_visit_at,
          ps.created_at,
          CURRENT_TIMESTAMP AS updated_at
        FROM phone_stats ps
        LEFT JOIN canonical_names cn ON cn.phone = ps.phone
        ON CONFLICT (phone) DO UPDATE
        SET name = CASE 
              WHEN LOWER(customers.name) IN ('walk-in customer', 'walk-in', '') THEN EXCLUDED.name 
              ELSE customers.name 
            END,
            total_visits = EXCLUDED.total_visits,
            total_spent = EXCLUDED.total_spent,
            last_visit_at = EXCLUDED.last_visit_at,
            updated_at = NOW();
      `);

      // 3. Unify existing rentals customer_name by phone from customers master to eliminate junk/split entries in reports
      await client.query(`
        UPDATE rentals r
        SET customer_name = c.name,
            customer_phone = c.phone
        FROM customers c
        WHERE TRIM(r.customer_phone) = c.phone
          AND c.name IS NOT NULL
          AND TRIM(c.name) <> ''
          AND r.customer_name IS DISTINCT FROM c.name;
      `);

      // 4. Seed REPORT_CUSTOMER permission for all roles
      await client.query(`
        INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
        VALUES
          ('ADMIN', 'REPORT_CUSTOMER', true, true, true, true, true, true, true, true),
          ('MANAGER', 'REPORT_CUSTOMER', true, false, false, false, true, true, false, false),
          ('STAFF', 'REPORT_CUSTOMER', true, false, false, false, true, false, false, false),
          ('CASHIER', 'REPORT_CUSTOMER', true, false, false, false, true, false, false, false)
        ON CONFLICT (role, module) DO NOTHING;
      `);

      // 5. Seed translations for Phone-first Customer Lookup & Customer-wise Report
      const translations = [
        { key: 'POS.MOBILE_NO', en: 'Customer Phone / Mobile No', ar: 'رقم هاتف العميل', module: 'POS' },
        { key: 'POS.MOBILE_PLACEHOLDER', en: 'Enter phone to search customer (e.g. 99887766)...', ar: 'أدخل رقم الهاتف للبحث التلقائي عن العميل...', module: 'POS' },
        { key: 'POS.CUSTOMER_NAME', en: 'Customer Name', ar: 'اسم العميل', module: 'POS' },
        { key: 'POS.CUSTOMER_NAME_PLACEHOLDER', en: 'Auto-filled from phone or enter new customer name', ar: 'يُعبأ تلقائياً من رقم الهاتف أو أدخل اسم عميل جديد', module: 'POS' },
        { key: 'POS.AUTO_SEARCH_HINT', en: 'Auto-searches Customer Name', ar: 'بحث تلقائي عن اسم العميل', module: 'POS' },
        { key: 'POS.EXISTING_CUSTOMER', en: 'Registered Customer', ar: 'عميل مسجل', module: 'POS' },
        { key: 'POS.VISITS', en: 'visits', ar: 'زيارات', module: 'POS' },
        { key: 'POS.AUTO_FILLED_FROM_PHONE', en: 'Customer name auto-filled from phone number to avoid duplicate entries.', ar: 'تمت تعبئة اسم العميل تلقائياً من رقم الهاتف لمنع التكرار.', module: 'POS' },
        { key: 'POS.CUSTOMER_FOUND_BADGE', en: 'Registered Customer', ar: 'عميل مسجل', module: 'POS' },
        { key: 'POS.NEW_CUSTOMER_BADGE', en: 'New Customer', ar: 'عميل جديد', module: 'POS' },
        { key: 'POS.SELECT_CUSTOMER', en: 'Select Customer (Phone First)', ar: 'اختر العميل (رقم الهاتف أولاً)', module: 'POS' },
        { key: 'POS.EDIT_CUSTOMER_NAME', en: 'Edit Name', ar: 'تعديل الاسم', module: 'POS' },
        { key: 'COMMON.CLEAR', en: 'Clear', ar: 'مسح', module: 'Common' },
        { key: 'COMMON.LOCK', en: 'Lock', ar: 'قفل', module: 'Common' },
        { key: 'REPORTS.TAB_CUSTOMER_SALES', en: 'Customer-wise Sales', ar: 'مبيعات العملاء (حسب العميل)', module: 'Reports' }
      ];

      for (const t of translations) {
        const id = `TRN-CUST-${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
        await client.query(`
          INSERT INTO translations (id, translation_key, english_text, arabic_text, module, is_active)
          VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
          ON CONFLICT (translation_key) DO UPDATE
          SET english_text = EXCLUDED.english_text,
              arabic_text = EXCLUDED.arabic_text,
              module = EXCLUDED.module,
              updated_at = NOW();
        `, [id, t.key, t.en, t.ar, t.module]);
      }
    }
  }
];

/**
 * Executes registered database migrations.
 * Only pending migrations are executed. Once a migration has run, it is recorded in
 * schema_migrations and will NEVER run again on subsequent boots or restarts.
 */
export async function runDatabaseMigrations(pool: Pool): Promise<{ applied: number; skipped: number; total: number }> {
  // Step 1: Ensure the schema_migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(150) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER,
      success BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  // Step 2: Fetch all previously applied migrations
  const { rows } = await pool.query<{ migration_name: string }>(
    `SELECT migration_name FROM schema_migrations WHERE success = true`
  );
  const appliedSet = new Set(rows.map(r => r.migration_name));

  const pending = MIGRATIONS.filter(m => !appliedSet.has(m.name));

  if (pending.length === 0) {
    console.log(`ℹ️ [Database Migrations] All ${MIGRATIONS.length} migrations already applied. Skipping execution.`);
    return { applied: 0, skipped: appliedSet.size, total: MIGRATIONS.length };
  }

  console.log(`========================================================================`);
  console.log(`🚀 [Database Migrations] Found ${pending.length} pending migration(s) out of ${MIGRATIONS.length}.`);
  console.log(`   Running each pending migration once...`);
  console.log(`========================================================================`);

  let appliedCount = 0;
  for (const m of pending) {
    const startTime = Date.now();
    console.log(`  ⏳ [${m.name}] Applying: ${m.description}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await m.up(client);
      const durationMs = Date.now() - startTime;
      await client.query(
        `INSERT INTO schema_migrations (migration_name, execution_time_ms, success) VALUES ($1, $2, true)`,
        [m.name, durationMs]
      );
      await client.query('COMMIT');
      console.log(`  ✅ [${m.name}] Finished in ${durationMs}ms.`);
      appliedCount++;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`  ❌ [${m.name}] Failed:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`========================================================================`);
  console.log(`🎉 [Database Migrations] Successfully applied ${appliedCount} migration(s). Database schema is current.`);
  console.log(`========================================================================\n`);

  return { applied: appliedCount, skipped: appliedSet.size, total: MIGRATIONS.length };
}
