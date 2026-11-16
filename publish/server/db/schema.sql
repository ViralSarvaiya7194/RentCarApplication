-- ==========================================================
-- PostgreSQL Database Schema: Rental Car Management System
-- Database: rental_car_db
-- Schema: public
-- ==========================================================

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE SET NULL,
    company VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL,
    branch VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Car Models Table
CREATE TABLE IF NOT EXISTS car_models (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Cars Fleet Table
CREATE TABLE IF NOT EXISTS cars (
    id VARCHAR(50) PRIMARY KEY,
    car_no VARCHAR(50) NOT NULL UNIQUE,
    model_id VARCHAR(50) REFERENCES car_models(id) ON DELETE SET NULL,
    model VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Rented', 'Maintenance', 'INACTIVE')),
    battery_level INTEGER DEFAULT 100 CHECK (battery_level BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Rate Setup Table
CREATE TABLE IF NOT EXISTS rates (
    id VARCHAR(50) PRIMARY KEY,
    model_id VARCHAR(50) REFERENCES car_models(id) ON DELETE SET NULL,
    model VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0), -- duration in minutes
    amount NUMERIC(10, 3) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Grace Periods Table
CREATE TABLE IF NOT EXISTS grace_periods (
    id VARCHAR(50) PRIMARY KEY,
    minutes INTEGER NOT NULL DEFAULT 10 CHECK (minutes >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Users Master Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    employee_name VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Cashier Shifts Table (Dynamic Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(50) PRIMARY KEY,
    shift_number INTEGER NOT NULL DEFAULT 1,
    business_date VARCHAR(20) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    cashier_name VARCHAR(100) NOT NULL DEFAULT 'Cashier',
    opened_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    opened_by_username VARCHAR(100),
    closed_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
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

-- 10. Cancellation Reasons Master Table (Bilingual)
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

-- 11. Discount Types Master Table (Bilingual)
CREATE TABLE IF NOT EXISTS discount_types (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    english_name VARCHAR(255) NOT NULL,
    arabic_name VARCHAR(255) NOT NULL,
    calculation_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE' CHECK (calculation_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    default_value NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    max_value NUMERIC(10, 3),
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_active VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (is_active IN ('ACTIVE', 'INACTIVE')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Rentals / Invoices Table
CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    car_id VARCHAR(50) REFERENCES cars(id) ON DELETE RESTRICT NOT NULL,
    car_no VARCHAR(50) NOT NULL,
    model VARCHAR(255) NOT NULL,
    rate_id VARCHAR(50) REFERENCES rates(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER NOT NULL,
    expected_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    grace_period_minutes INTEGER DEFAULT 10,
    rental_amount NUMERIC(10, 3) NOT NULL,
    deposit_amount NUMERIC(10, 3) DEFAULT 0.000,
    change_returned NUMERIC(10, 3) DEFAULT 0.000,
    extra_amount NUMERIC(10, 3) DEFAULT 0.000,
    discount NUMERIC(10, 3) DEFAULT 0.000,
    discount_type VARCHAR(50),
    discount_value NUMERIC(10, 3) DEFAULT 0.000,
    discount_type_id VARCHAR(50) REFERENCES discount_types(id) ON DELETE SET NULL,
    discount_type_name VARCHAR(255),
    total_amount NUMERIC(10, 3) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD', 'KNET')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    shift_id VARCHAR(50) REFERENCES shifts(id) ON DELETE SET NULL,
    shift_number INTEGER DEFAULT 1,
    created_by VARCHAR(100),
    
    -- 10-Minute Grace Period tracking
    grace_period_eligible BOOLEAN DEFAULT TRUE,
    grace_period_used BOOLEAN DEFAULT FALSE,
    grace_period_start_time TIMESTAMP WITH TIME ZONE,
    grace_period_end_time TIMESTAMP WITH TIME ZONE,
    grace_period_used_at TIMESTAMP WITH TIME ZONE,
    grace_period_used_by VARCHAR(100),
    grace_period_remarks TEXT,

    -- Cancellation tracking
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by VARCHAR(100),
    cancellation_reason_id VARCHAR(50) REFERENCES cancellation_reasons(id) ON DELETE SET NULL,
    cancellation_reason VARCHAR(255),
    cancellation_remarks TEXT,

    -- Duplicate & Settlement tracking
    reprint_count INTEGER DEFAULT 0,
    settlement_remarks TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Grace Period Audit Logs Table
CREATE TABLE IF NOT EXISTS grace_period_logs (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
    invoice_no VARCHAR(50) NOT NULL,
    grace_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    grace_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(100) NOT NULL,
    branch_name VARCHAR(255),
    location_name VARCHAR(255),
    terminal_info VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Bill Reprint / Duplicate Audit Logs Table
CREATE TABLE IF NOT EXISTS bill_reprint_logs (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
    invoice_no VARCHAR(50) NOT NULL,
    reprinted_by VARCHAR(100) NOT NULL,
    reprint_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    branch_name VARCHAR(255),
    location_name VARCHAR(255),
    reprint_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Day Close Table
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

-- 16. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED', 'DISABLED')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. Audit Logs Table (Universal Transactional Trail)
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

-- 19. Translations Table
CREATE TABLE IF NOT EXISTS translations (
    id VARCHAR(50) PRIMARY KEY,
    translation_key VARCHAR(150) NOT NULL UNIQUE,
    english_text TEXT NOT NULL,
    arabic_text TEXT NOT NULL,
    module VARCHAR(50) NOT NULL DEFAULT 'Common',
    description TEXT,
    is_active VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (is_active IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 20. Print & Cancellation Audit Logs Table
CREATE TABLE IF NOT EXISTS print_audit_logs (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- DUPLICATE_BILL_VIEW, DUPLICATE_BILL_PRINT, BILL_CANCELLATION, CANCEL_BILL_PRINT
    username VARCHAR(100) NOT NULL,
    location_name VARCHAR(255),
    terminal_info VARCHAR(255),
    printer_name VARCHAR(255),
    printer_type VARCHAR(50) DEFAULT 'LAN', -- LAN, USB, VIRTUAL
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, VIEWED
    error_message TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 21. Thermal Printer Configurations & Master Table
CREATE TABLE IF NOT EXISTS printer_settings (
    id VARCHAR(50) PRIMARY KEY,
    printer_name VARCHAR(255) NOT NULL,
    interface_type VARCHAR(50) NOT NULL DEFAULT 'LAN', -- LAN, USB, VIRTUAL
    ip_address VARCHAR(100) NOT NULL,
    port INTEGER NOT NULL DEFAULT 9100,
    branch_id VARCHAR(50),
    branch_name VARCHAR(255),
    location_id VARCHAR(50),
    location_name VARCHAR(255),
    terminal VARCHAR(100) DEFAULT 'ALL',
    printer_type VARCHAR(50) NOT NULL DEFAULT 'ESC/POS', -- ESC/POS, Thermal, Network
    print_type VARCHAR(50) NOT NULL DEFAULT 'ALL', -- ALL, SETTLEMENT, RECEIPT, DUPLICATE, REPORT
    paper_width VARCHAR(20) NOT NULL DEFAULT '80mm', -- 80mm, 58mm
    encoding VARCHAR(50) NOT NULL DEFAULT 'CP864', -- CP864, CP437, UTF-8
    auto_cut BOOLEAN NOT NULL DEFAULT TRUE,
    cash_drawer BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 22. Print Format Master Table
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
    print_type VARCHAR(50) NOT NULL DEFAULT 'ALL', -- ALL, SETTLEMENT, RECEIPT, DUPLICATE, CANCELLED, REPORT
    language VARCHAR(20) NOT NULL DEFAULT 'BOTH', -- EN, AR, BOTH
    paper_width VARCHAR(20) NOT NULL DEFAULT '80mm', -- 80mm, 58mm
    font_size VARCHAR(50) NOT NULL DEFAULT 'LARGE', -- SMALL, MEDIUM, LARGE, XLARGE
    font_family VARCHAR(100) NOT NULL DEFAULT 'MONOSPACE', -- MONOSPACE, SANS_SERIF, CONSOLAS, ROBOTO
    font_style VARCHAR(50) NOT NULL DEFAULT 'BOLD', -- BOLD, BLACK, NORMAL
    header_title VARCHAR(255) DEFAULT 'KIDDIE KRUZZER ENTERTAINMENT',
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
    footer_notes TEXT DEFAULT 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
    terms_conditions TEXT DEFAULT 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 23. Role Permissions Table (User Rights & Security Engine)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL, -- ADMIN, MANAGER, STAFF, CASHIER
    module VARCHAR(50) NOT NULL, -- POS, BILLS_DUPLICATE, BILLS_CANCEL, SHIFT_CLOSE, DAY_CLOSE, COMPANY, BRANCH, LOCATION, USER, USER_RIGHTS, CAR_MODEL, CAR, RATE, GRACE_PERIOD, TRANSLATIONS, PRINTER_MASTER, PRINT_FORMAT_MASTER, MASTER_EXPORT
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_add BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_print BOOLEAN NOT NULL DEFAULT TRUE,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    can_cancel BOOLEAN NOT NULL DEFAULT FALSE,
    can_execute BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (role, module)
);

-- 24. User Specific Permissions Table (Optional per-user override)
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, module)
);

-- Migration safety for existing tables
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50);
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS location_id VARCHAR(50);
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS terminal VARCHAR(100) DEFAULT 'ALL';
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS printer_type VARCHAR(50) DEFAULT 'ESC/POS';
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS print_type VARCHAR(50) DEFAULT 'ALL';
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Indices for high performance
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_invoice_no ON rentals(invoice_no);
CREATE INDEX IF NOT EXISTS idx_rentals_start_time ON rentals(start_time);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(translation_key);
CREATE INDEX IF NOT EXISTS idx_translations_module ON translations(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_print_audit_invoice ON print_audit_logs(invoice_no);
CREATE INDEX IF NOT EXISTS idx_print_audit_action ON print_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_print_audit_created ON print_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_printer_settings_branch ON printer_settings(branch_name);
CREATE INDEX IF NOT EXISTS idx_printer_settings_terminal ON printer_settings(terminal);
CREATE INDEX IF NOT EXISTS idx_printer_settings_active ON printer_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_print_formats_branch ON print_formats(branch_name);
CREATE INDEX IF NOT EXISTS idx_print_formats_type ON print_formats(print_type);
CREATE INDEX IF NOT EXISTS idx_print_formats_lang ON print_formats(language);
CREATE INDEX IF NOT EXISTS idx_print_formats_active ON print_formats(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Ensure font_size column exists for seamless migration
ALTER TABLE print_formats ADD COLUMN IF NOT EXISTS font_size VARCHAR(50) DEFAULT 'LARGE';

-- ==========================================================
-- SEED DATA
-- ==========================================================

-- Companies Seed
TRUNCATE TABLE cars CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE branches CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE discount_types CASCADE;
TRUNCATE TABLE users CASCADE;

INSERT INTO companies (id, name, contact, status) VALUES
    ('CMP-101', 'Your Events Management Company', '+965 2200 1100', 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, contact = EXCLUDED.contact, status = EXCLUDED.status;

-- Branches Seed
INSERT INTO branches (id, name, company_id, company, status) VALUES
    ('BRN-101', 'Kiddie Kruzzer', 'CMP-101', 'Your Events Management Company', 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, company_id = EXCLUDED.company_id, company = EXCLUDED.company, status = EXCLUDED.status;

-- Locations Seed
INSERT INTO locations (id, name, branch_id, branch, status) VALUES
    ('LOC-101', 'Avenues Mall -Phase -4- Gate 25', 'BRN-101', 'Kiddie Kruzzer', 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, branch_id = EXCLUDED.branch_id, branch = EXCLUDED.branch, status = EXCLUDED.status;

-- Car Models Seed
INSERT INTO car_models (id, name, seats, status) VALUES
    ('MOD-101', 'Single Seater', 1, 'ACTIVE'),
    ('MOD-102', 'Double Seater', 2, 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, seats = EXCLUDED.seats, status = EXCLUDED.status;

-- Rate Setup Seed
INSERT INTO rates (id, model_id, model, duration, amount, status) VALUES
    ('RAT-001', 'MOD-101', 'Single Seater', 60, 1.000, 'ACTIVE'),
    ('RAT-004', 'MOD-102', 'Double Seater', 60, 2.000, 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET model_id = EXCLUDED.model_id, model = EXCLUDED.model, duration = EXCLUDED.duration, amount = EXCLUDED.amount, status = EXCLUDED.status;

-- Grace Period Seed
INSERT INTO grace_periods (id, minutes, status) VALUES
    ('GRP-101', 10, 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET minutes = EXCLUDED.minutes, status = EXCLUDED.status;

-- Users Master Seed
INSERT INTO users (id, username, employee_name, password, role, status) VALUES
    ('USR-101', 'ahmed.thabet', 'Ahmed Thabet Tawfik Mahran', '123456', 'STAFF', 'ACTIVE'),
    ('USR-102', 'mustafa.sabra', 'Mustafa Sabra', '123456', 'STAFF', 'ACTIVE'),
    ('USR-103', 'yahia.zakariya', 'Yahia Zakariya', '123456', 'MANAGER', 'ACTIVE'),
    ('USR-100', 'admin', 'System Administrator', 'admin123', 'ADMIN', 'ACTIVE')
ON CONFLICT (username) DO UPDATE 
SET employee_name = EXCLUDED.employee_name, password = EXCLUDED.password, role = EXCLUDED.role, status = EXCLUDED.status;

-- Cancellation Reasons Seed (Bilingual)
INSERT INTO cancellation_reasons (id, code, english_name, arabic_name, is_active, sort_order) VALUES
    ('CR-101', 'CUSTOMER_REQUEST', 'Customer Requested Cancellation', 'طلب العميل إلغاء الفاتورة', 'ACTIVE', 1),
    ('CR-102', 'CAR_MALFUNCTION', 'Vehicle Technical Issue / Malfunction', 'عطل فني في السيارة', 'ACTIVE', 2),
    ('CR-103', 'BILLING_ERROR', 'Cashier Billing / Keying Error', 'خطأ في إدخال بيانات الفاتورة', 'ACTIVE', 3),
    ('CR-104', 'DUPLICATE_ENTRY', 'Duplicate Rental Entry', 'تكرار إدخال المعاملة', 'ACTIVE', 4),
    ('CR-105', 'CHILD_REFUSAL', 'Child Refused to Ride', 'عدم رغبة الطفل في الركوب', 'ACTIVE', 5),
    ('CR-106', 'MANAGEMENT_OVERRIDE', 'Management Authorization', 'إلغاء بتفويض من الإدارة', 'ACTIVE', 6)
ON CONFLICT (id) DO UPDATE
SET code = EXCLUDED.code, english_name = EXCLUDED.english_name, arabic_name = EXCLUDED.arabic_name, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- Discount Types Seed (Bilingual - Only 50% Discount for Customers with Disabilities)
INSERT INTO discount_types (id, code, english_name, arabic_name, calculation_type, default_value, max_value, requires_approval, is_active, sort_order) VALUES
    ('DT-101', 'DISABILITY_50', '50% Discount for Customers with Disabilities', 'خصم 50% لذوي الاحتياجات الخاصة', 'PERCENTAGE', 50.000, 50.000, false, 'ACTIVE', 1)
ON CONFLICT (id) DO UPDATE
SET code = EXCLUDED.code, english_name = EXCLUDED.english_name, arabic_name = EXCLUDED.arabic_name, calculation_type = EXCLUDED.calculation_type, default_value = EXCLUDED.default_value, max_value = EXCLUDED.max_value, requires_approval = EXCLUDED.requires_approval, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- System Settings Seed
INSERT INTO system_settings (key, value, description) VALUES
    ('ENABLE_DAY_CLOSE_EMAIL', 'false', 'Enable or disable automated Day Close report email dispatch'),
    ('SMTP_HOST', 'smtp.gmail.com', 'SMTP Server Host'),
    ('SMTP_PORT', '587', 'SMTP Server Port'),
    ('SMTP_USER', 'notifications@kiddiekruzzer.com', 'SMTP Username'),
    ('SMTP_PASS', 'securepassword123', 'SMTP Password'),
    ('EMAIL_SENDER', 'Kiddie Kruzzer POS <noreply@kiddiekruzzer.com>', 'Sender Email Address'),
    ('EMAIL_RECIPIENTS', 'manager@kiddiekruzzer.com, audit@kiddiekruzzer.com', 'Comma-separated recipient emails for Day Close'),
    ('EMAIL_SUBJECT_TEMPLATE', 'Kiddie Kruzzer POS - Daily Close & Audit Report ({date})', 'Email Subject Template')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP;

-- Fleet Cars Seed (30 Cars: Double Seater 1 to 5 + Single Seater 6 to 30)
INSERT INTO cars (id, car_no, model_id, model, status, battery_level) VALUES
    ('CAR-001', '1',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-002', '2',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-003', '3',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-004', '4',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-005', '5',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-006', '6',  'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-007', '7',  'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-008', '8',  'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-009', '9',  'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-010', '10', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-011', '11', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-012', '12', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-013', '13', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-014', '14', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-015', '15', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-016', '16', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-017', '17', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-018', '18', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-019', '19', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-020', '20', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-021', '21', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-022', '22', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-023', '23', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-024', '24', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-025', '25', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-026', '26', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-027', '27', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-028', '28', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-029', '29', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-030', '30', 'MOD-101', 'Single Seater', 'Available', 100)
ON CONFLICT (id) DO UPDATE 
SET car_no = EXCLUDED.car_no, model_id = EXCLUDED.model_id, model = EXCLUDED.model;

-- Multilingual Translations Seed (Comprehensive Dictionary)
TRUNCATE TABLE translations;
INSERT INTO translations (id, translation_key, english_text, arabic_text, module, description, is_active) VALUES
    -- COMMON & GLOBAL
    ('TRN-001', 'COMMON.APP_NAME', 'Kiddie Kruzzer POS', 'كيدي كروزر لنقاط البيع', 'Common', 'Application title', 'ACTIVE'),
    ('TRN-002', 'COMMON.POSTGRESQL_LIVE', 'System Live', 'مباشر', 'Common', 'Live database indicator badge', 'ACTIVE'),
    ('TRN-003', 'COMMON.SAVE', 'Save', 'حفظ', 'Common', 'Save button', 'ACTIVE'),
    ('TRN-004', 'COMMON.CANCEL', 'Cancel', 'إلغاء', 'Common', 'Cancel button', 'ACTIVE'),
    ('TRN-005', 'COMMON.DELETE', 'Delete', 'حذف', 'Common', 'Delete button', 'ACTIVE'),
    ('TRN-006', 'COMMON.EDIT', 'Edit', 'تعديل', 'Common', 'Edit button', 'ACTIVE'),
    ('TRN-007', 'COMMON.CLOSE', 'Close', 'إغلاق', 'Common', 'Close button', 'ACTIVE'),
    ('TRN-008', 'COMMON.REFRESH', 'Refresh Data', 'تحديث البيانات', 'Common', 'Refresh button tooltip', 'ACTIVE'),
    ('TRN-009', 'COMMON.ACTIONS', 'Actions', 'الإجراءات', 'Common', 'Table column header for actions', 'ACTIVE'),
    ('TRN-010', 'COMMON.STATUS', 'Status', 'الحالة', 'Common', 'Status label/column', 'ACTIVE'),
    ('TRN-011', 'COMMON.ACTIVE', 'ACTIVE', 'نشط', 'Common', 'Active status badge', 'ACTIVE'),
    ('TRN-012', 'COMMON.INACTIVE', 'INACTIVE', 'غير نشط', 'Common', 'Inactive status badge', 'ACTIVE'),
    ('TRN-013', 'COMMON.ID', 'ID', 'المعرف', 'Common', 'ID column header', 'ACTIVE'),
    ('TRN-014', 'COMMON.NAME', 'Name', 'الاسم', 'Common', 'Name label/column', 'ACTIVE'),
    ('TRN-015', 'COMMON.SEARCH', 'Search...', 'بحث...', 'Common', 'Search input placeholder', 'ACTIVE'),
    ('TRN-016', 'COMMON.FILTER', 'Filter', 'تصفية', 'Common', 'Filter label', 'ACTIVE'),
    ('TRN-017', 'COMMON.ALL', 'All', 'الكل', 'Common', 'All options label', 'ACTIVE'),
    ('TRN-018', 'COMMON.LOADING', 'Loading records...', 'جاري تحميل السجلات...', 'Common', 'Loading indicator', 'ACTIVE'),
    ('TRN-019', 'COMMON.NO_RECORDS', 'No records found.', 'لم يتم العثور على سجلات.', 'Common', 'Empty table message', 'ACTIVE'),
    ('TRN-020', 'COMMON.SAVE_TO_POSTGRES', 'Save Changes', 'حفظ التغييرات', 'Common', 'Form submit button', 'ACTIVE'),
    ('TRN-021', 'COMMON.KWD', 'KD', 'د.ك', 'Common', 'Kuwaiti Dinar currency code', 'ACTIVE'),
    ('TRN-022', 'COMMON.MINUTES', 'Mins', 'دقيقة', 'Common', 'Minutes abbreviation', 'ACTIVE'),
    ('TRN-023', 'COMMON.VEHICLES', '{count} vehicles', '{count} سيارات', 'Common', 'Vehicles count indicator', 'ACTIVE'),
    ('TRN-024', 'COMMON.EXPORT_CSV', 'Export CSV', 'تصدير CSV', 'Common', 'Export to CSV button', 'ACTIVE'),
    ('TRN-025', 'COMMON.PRINT', 'Print', 'طباعة', 'Common', 'Print button', 'ACTIVE'),

    -- AUTH & LOGIN
    ('TRN-030', 'AUTH.APP_TITLE', 'Kiddie Kruzzer POS', 'كيدي كروزر نقطة البيع', 'Auth', 'Login screen title', 'ACTIVE'),
    ('TRN-031', 'AUTH.SUBTITLE', 'System Authentication', 'تسجيل الدخول الآمن', 'Auth', 'Login screen subtitle', 'ACTIVE'),
    ('TRN-032', 'AUTH.USERNAME', 'Username', 'اسم المستخدم', 'Auth', 'Username label', 'ACTIVE'),
    ('TRN-033', 'AUTH.USERNAME_PLACEHOLDER', 'Enter username', 'أدخل اسم المستخدم', 'Auth', 'Username placeholder', 'ACTIVE'),
    ('TRN-034', 'AUTH.PASSWORD', 'Password', 'كلمة المرور', 'Auth', 'Password label', 'ACTIVE'),
    ('TRN-035', 'AUTH.PASSWORD_PLACEHOLDER', 'Enter password', 'أدخل كلمة المرور', 'Auth', 'Password placeholder', 'ACTIVE'),
    ('TRN-036', 'AUTH.LOGIN_BUTTON', 'LOGIN TO SYSTEM', 'تسجيل الدخول إلى النظام', 'Auth', 'Login button', 'ACTIVE'),
    ('TRN-037', 'AUTH.AUTHENTICATING', 'AUTHENTICATING...', 'جاري التحقق والمصادقة...', 'Auth', 'Login loading state', 'ACTIVE'),
    ('TRN-038', 'AUTH.DEFAULT_ACCOUNTS', 'Default accounts:', 'الحسابات الافتراضية:', 'Auth', 'Demo accounts hint', 'ACTIVE'),
    ('TRN-039', 'AUTH.LOGOUT', 'Logout', 'تسجيل الخروج', 'Auth', 'Logout button text', 'ACTIVE'),
    ('TRN-040', 'AUTH.ERR_REQUIRED', 'Please enter both username and password.', 'يرجى إدخال اسم المستخدم وكلمة المرور.', 'Auth', 'Login validation error', 'ACTIVE'),
    ('TRN-041', 'AUTH.ERR_INVALID', 'Invalid username or password.', 'اسم المستخدم أو كلمة المرور غير صحيحة.', 'Auth', 'Invalid credentials error', 'ACTIVE'),

    -- NAVIGATION & MENU
    ('TRN-050', 'NAV.MAIN', 'Main', 'الرئيسية', 'Navigation', 'Sidebar main section', 'ACTIVE'),
    ('TRN-051', 'NAV.POS_FLEET', 'POS Fleet', 'أسطول نقطة البيع', 'Navigation', 'POS fleet menu link', 'ACTIVE'),
    ('TRN-052', 'NAV.MASTERS', 'Masters', 'البيانات الأساسية', 'Navigation', 'Sidebar masters section', 'ACTIVE'),
    ('TRN-053', 'NAV.COMPANY', 'Company Master', 'إدارة الشركات', 'Navigation', 'Company master menu link', 'ACTIVE'),
    ('TRN-054', 'NAV.BRANCH', 'Branch Master', 'إدارة الفروع', 'Navigation', 'Branch master menu link', 'ACTIVE'),
    ('TRN-055', 'NAV.LOCATION', 'Location Master', 'إدارة المواقع', 'Navigation', 'Location master menu link', 'ACTIVE'),
    ('TRN-056', 'NAV.USER_MASTER', 'User Master', 'إدارة المستخدمين', 'Navigation', 'User master menu link', 'ACTIVE'),
    ('TRN-057', 'NAV.OPERATIONS', 'Operations', 'العمليات والتسعير', 'Navigation', 'Sidebar operations section', 'ACTIVE'),
    ('TRN-058', 'NAV.CAR_MODEL', 'Car Model Master', 'موديلات السيارات', 'Navigation', 'Car model menu link', 'ACTIVE'),
    ('TRN-059', 'NAV.CAR_NUMBER', 'Car Number Master', 'أرقام السيارات', 'Navigation', 'Car number menu link', 'ACTIVE'),
    ('TRN-060', 'NAV.RATE_SETUP', 'Rate Setup Master', 'إعداد الأسعار', 'Navigation', 'Rate setup menu link', 'ACTIVE'),
    ('TRN-061', 'NAV.GRACE_PERIOD', 'Grace Period Master', 'فترات السماح', 'Navigation', 'Grace period menu link', 'ACTIVE'),
    ('TRN-062', 'NAV.CANCELLATION_REASONS', 'Cancellation Reasons', 'أسباب الإلغاء', 'Navigation', 'Cancellation reasons menu link', 'ACTIVE'),
    ('TRN-063', 'NAV.DISCOUNT_TYPES', 'Discount Types', 'أنواع الخصومات', 'Navigation', 'Discount types menu link', 'ACTIVE'),
    ('TRN-064', 'NAV.DUPLICATE_BILL', 'Duplicate Bill', 'نسخة مكررة / إعادة طباعة', 'Navigation', 'Duplicate bill menu link', 'ACTIVE'),
    ('TRN-065', 'NAV.PERIODIC_REPORT', 'Periodic Reports', 'التقارير الدورية', 'Navigation', 'Periodic reports menu link', 'ACTIVE'),
    ('TRN-066', 'NAV.AUDIT_LOGS', 'Audit Trail', 'سجل التدقيق والمراجعة', 'Navigation', 'Audit trail menu link', 'ACTIVE'),
    ('TRN-067', 'NAV.ADMINISTRATION', 'Administration', 'الإدارة والترجمة', 'Navigation', 'Sidebar administration section', 'ACTIVE'),
    ('TRN-068', 'NAV.TRANSLATIONS', 'Translations', 'إدارة الترجمات', 'Navigation', 'Translations menu link', 'ACTIVE'),
    ('TRN-069', 'NAV.CLOSING', 'Closing & Settlement', 'الإقفال والتسوية', 'Navigation', 'Sidebar closing section', 'ACTIVE'),
    ('TRN-070', 'NAV.SHIFT_CLOSING', 'Shift Closing', 'إقفال الوردية', 'Navigation', 'Shift closing menu link', 'ACTIVE'),
    ('TRN-071', 'NAV.DAY_CLOSING', 'Day Closing & Audit', 'إقفال اليوم والتدقيق', 'Navigation', 'Day closing menu link', 'ACTIVE'),

    -- HEADER & FOOTER
    ('TRN-080', 'HEADER.BRANCH', 'Branch: {name}', 'الفرع: {name}', 'Header', 'Branch indicator in header', 'ACTIVE'),
    ('TRN-081', 'HEADER.LOCATION', 'Location: {name}', 'الموقع: {name}', 'Header', 'Location indicator in header', 'ACTIVE'),
    ('TRN-082', 'HEADER.SALES_DATE_TIME', 'Sales Date & Time', 'تاريخ ووقت المبيعات', 'Header', 'Sales time header label', 'ACTIVE'),
    ('TRN-083', 'HEADER.LANGUAGE', 'Language', 'اللغة', 'Header', 'Language selector title', 'ACTIVE'),
    ('TRN-084', 'FOOTER.REVENUE_TODAY', 'REVENUE TODAY:', 'إيراد اليوم:', 'Footer', 'Today revenue footer label', 'ACTIVE'),
    ('TRN-085', 'FOOTER.FLEET_OCCUPANCY', 'FLEET OCCUPANCY:', 'نسبة إشغال الأسطول:', 'Footer', 'Occupancy footer label', 'ACTIVE'),
    ('TRN-086', 'FOOTER.POSTGRES_CONNECTED', 'System Connected', 'النظام متصل', 'Footer', 'PostgreSQL status in footer', 'ACTIVE'),
    ('TRN-087', 'FOOTER.VERSION', 'v2.5 Enterprise', 'الإصدار 2.5 مؤسسي', 'Footer', 'App version in footer', 'ACTIVE'),

    -- POS FLEET & RENTALS
    ('TRN-090', 'POS.AVAILABLE', 'AVAILABLE:', 'المتاح:', 'POS', 'Available cars stat', 'ACTIVE'),
    ('TRN-091', 'POS.RENTED', 'RENTED:', 'المؤجر:', 'POS', 'Rented cars stat', 'ACTIVE'),
    ('TRN-092', 'POS.FLEET_TOTAL', 'FLEET TOTAL:', 'إجمالي الأسطول:', 'POS', 'Total fleet stat', 'ACTIVE'),
    ('TRN-093', 'POS.LIVE_FLEET', 'Live Fleet', 'الأسطول المباشر', 'POS', 'Live fleet badge', 'ACTIVE'),
    ('TRN-094', 'POS.ALL_TYPES', 'ALL TYPES', 'جميع الأنواع', 'POS', 'Filter all car types', 'ACTIVE'),
    ('TRN-095', 'POS.SINGLE_SEATER_BTN', 'SINGLE SEATER', 'مقعد فردي', 'POS', 'Single seater filter button', 'ACTIVE'),
    ('TRN-096', 'POS.DOUBLE_SEATER_BTN', 'DOUBLE SEATER', 'مقعد مزدوج', 'POS', 'Double seater filter button', 'ACTIVE'),
    ('TRN-097', 'POS.SINGLE_FLEET_TITLE', 'Single Seater Fleet (1-Seat)', 'أسطول السيارات الفردية (مقعد واحد)', 'POS', 'Single fleet section header', 'ACTIVE'),
    ('TRN-098', 'POS.DOUBLE_FLEET_TITLE', 'Double Seater Fleet (2-Seat)', 'أسطول السيارات المزدوجة (مقعدين)', 'POS', 'Double fleet section header', 'ACTIVE'),
    ('TRN-099', 'POS.READY', 'READY', 'جاهزة', 'POS', 'Available car status', 'ACTIVE'),
    ('TRN-100', 'POS.RENTED_BADGE', 'RENTED', 'مؤجرة', 'POS', 'Rented car status badge', 'ACTIVE'),
    ('TRN-101', 'POS.SINGLE_BADGE', 'Single', 'فردي', 'POS', 'Single car badge', 'ACTIVE'),
    ('TRN-102', 'POS.DOUBLE_BADGE', 'Double', 'مزدوج', 'POS', 'Double car badge', 'ACTIVE'),
    ('TRN-103', 'POS.LOADING_FLEET', 'Loading fleet...', 'جاري تحميل الأسطول...', 'POS', 'Fleet loading indicator', 'ACTIVE'),

    -- POS START RENTAL MODAL
    ('TRN-110', 'POS.NEW_RENTAL_TITLE', 'START NEW RENTAL', 'بدء تأجير جديد', 'POS', 'New rental modal header', 'ACTIVE'),
    ('TRN-111', 'POS.CAR_NO', 'Car No', 'رقم السيارة', 'POS', 'Car number label', 'ACTIVE'),
    ('TRN-112', 'POS.CURR_TIME', 'Current Time', 'الوقت الحالي', 'POS', 'Current time label', 'ACTIVE'),
    ('TRN-113', 'POS.RATE_TIER', 'Select Rate Tier / Duration', 'اختر فئة التسعير / المدة', 'POS', 'Rate tier selector label', 'ACTIVE'),
    ('TRN-114', 'POS.DURATION_15', '15 Minutes Tier', 'باقة 15 دقيقة', 'POS', '15 mins option', 'ACTIVE'),
    ('TRN-115', 'POS.DURATION_30', '30 Minutes Tier', 'باقة 30 دقيقة', 'POS', '30 mins option', 'ACTIVE'),
    ('TRN-116', 'POS.DURATION_60', '60 Minutes Tier', 'باقة 60 دقيقة', 'POS', '60 mins option', 'ACTIVE'),
    ('TRN-117', 'POS.CUSTOMER_NAME', 'Customer Name', 'اسم العميل', 'POS', 'Customer name field', 'ACTIVE'),
    ('TRN-118', 'POS.CUSTOMER_NAME_PLACEHOLDER', 'Optional (Walk-in)', 'اختياري (عميل مباشر)', 'POS', 'Customer placeholder', 'ACTIVE'),
    ('TRN-119', 'POS.MOBILE_NO', 'Mobile Number', 'رقم الهاتف المحمول', 'POS', 'Mobile number field', 'ACTIVE'),
    ('TRN-120', 'POS.MOBILE_PLACEHOLDER', 'Optional contact number', 'رقم الاتصال (اختياري)', 'POS', 'Mobile placeholder', 'ACTIVE'),
    ('TRN-121', 'POS.RENTAL_DEPOSIT', 'Rental Deposit / Upfront (KD)', 'مبلغ التأجير / الدفعة المقدمة (د.ك)', 'POS', 'Rental deposit label', 'ACTIVE'),
    ('TRN-122', 'POS.START_RENTAL_BTN', 'START RENTAL & DISPATCH CAR', 'بدء التأجير وتفعيل انطلاق السيارة', 'POS', 'Start rental submit button', 'ACTIVE'),
    ('TRN-123', 'POS.GRACE_PERIOD_NOTE', 'Grace Period: 10 mins allowed for return/settlement adjustments.', 'فترة السماح: 10 دقائق متاحة لتعديلات الإرجاع والتسوية.', 'POS', 'Grace period notice', 'ACTIVE'),

    -- POS CLOSE RENTAL MODAL & SETTLEMENT
    ('TRN-130', 'POS.CLOSE_RENTAL_TITLE', 'CLOSE RENTAL & RETURN CAR', 'إغلاق التأجير وإرجاع السيارة', 'POS', 'Close rental modal title', 'ACTIVE'),
    ('TRN-131', 'POS.CUSTOMER_REF', 'Customer Ref', 'بيانات العميل / المرجع', 'POS', 'Customer ref label', 'ACTIVE'),
    ('TRN-132', 'POS.STARTED_AT', 'Started At', 'وقت بدء التأجير', 'POS', 'Start time label', 'ACTIVE'),
    ('TRN-133', 'POS.ELAPSED_DURATION', 'Elapsed Duration', 'الوقت المنقضي', 'POS', 'Elapsed duration label', 'ACTIVE'),
    ('TRN-134', 'POS.CALCULATED_CHARGE', 'Calculated Rental Charge', 'إجمالي رسوم التأجير المحسوبة', 'POS', 'Calculated charge label', 'ACTIVE'),
    ('TRN-135', 'POS.DISCOUNT_TYPE_LABEL', 'Discount Type', 'نوع الخصم', 'POS', 'Discount type field label', 'ACTIVE'),
    ('TRN-136', 'POS.DISCOUNT', 'Discount Amount (KD)', 'قيمة الخصم (د.ك)', 'POS', 'Discount input label', 'ACTIVE'),
    ('TRN-137', 'POS.PAYMENT_METHOD', 'Payment Method', 'طريقة الدفع', 'POS', 'Payment method label', 'ACTIVE'),
    ('TRN-138', 'POS.CASH', 'CASH', 'نقداً (كاش)', 'POS', 'Cash payment option', 'ACTIVE'),
    ('TRN-139', 'POS.KNET', 'KNET / CARD', 'كي نت / بطاقة', 'POS', 'KNET payment option', 'ACTIVE'),
    ('TRN-140', 'POS.FINAL_CHARGE', 'Final Charge / Total', 'المبلغ الصافي المستحق', 'POS', 'Final charge label', 'ACTIVE'),
    ('TRN-141', 'POS.RETURN_TO_CUSTOMER', 'Return to Customer (Deposit Balance)', 'المبلغ المسترد للعميل (المتبقي من العربون)', 'POS', 'Return change label', 'ACTIVE'),
    ('TRN-142', 'POS.CONFIRM_CLOSE_BTN', 'CONFIRM RETURN & SETTLE BILL', 'تأكيد الإرجاع وتسوية الفاتورة', 'POS', 'Confirm close rental button', 'ACTIVE'),
    ('TRN-143', 'POS.WALK_IN_CUSTOMER', 'Walk-in Customer', 'عميل مباشر', 'POS', 'Default customer fallback', 'ACTIVE'),
    ('TRN-144', 'POS.NO_DISCOUNT', 'No Discount', 'بدون خصم', 'POS', 'No discount option', 'ACTIVE'),
    ('TRN-145', 'POS.DISCOUNT_DISABILITY_50', '50% Discount for Customers with Disabilities', 'خصم 50% لذوي الاحتياجات الخاصة', 'POS', '50% disability discount option', 'ACTIVE'),

    -- 10-MINUTE BILL GRACE PERIOD
    ('TRN-150', 'GRACE_BILL.TITLE', '10-Minute Bill Grace Period', 'فترة سماح الفاتورة (10 دقائق)', 'GracePeriod', 'Grace period header', 'ACTIVE'),
    ('TRN-151', 'GRACE_BILL.STATUS_ELIGIBLE', 'Grace Period: Active ({remaining} remaining)', 'فترة السماح: نشطة (متبقي {remaining})', 'GracePeriod', 'Eligible badge', 'ACTIVE'),
    ('TRN-152', 'GRACE_BILL.STATUS_EXPIRED', 'Grace Period: Expired', 'فترة السماح: منتهية الصلاحية', 'GracePeriod', 'Expired badge', 'ACTIVE'),
    ('TRN-153', 'GRACE_BILL.STATUS_USED', 'Grace Period: Already Used', 'فترة السماح: تم استخدامها مسبقاً', 'GracePeriod', 'Used badge', 'ACTIVE'),
    ('TRN-154', 'GRACE_BILL.CLAIM_BTN', 'Apply 10-Min Grace Period Adjustment', 'تطبيق تعديل فترة السماح (10 دقائق)', 'GracePeriod', 'Claim button', 'ACTIVE'),
    ('TRN-155', 'GRACE_BILL.ALREADY_USED_ERR', 'Grace period has already been used for this bill and can only be used once.', 'تم استخدام فترة السماح لهذه الفاتورة مسبقاً ولا يمكن استخدامها إلا مرة واحدة فقط.', 'GracePeriod', 'Already used error', 'ACTIVE'),
    ('TRN-156', 'GRACE_BILL.EXPIRED_ERR', 'The 10-minute grace period has expired for this bill.', 'انتهت مهلة فترة السماح (10 دقائق) لهذه الفاتورة.', 'GracePeriod', 'Expired error', 'ACTIVE'),
    ('TRN-157', 'GRACE_BILL.SUCCESS_MSG', '10-minute grace period successfully applied and audited.', 'تم تطبيق فترة السماح (10 دقائق) وتسجيلها في سجل التدقيق بنجاح.', 'GracePeriod', 'Success alert', 'ACTIVE'),

    -- CANCEL BILL MODAL
    ('TRN-160', 'CANCEL.MODAL_TITLE', 'Cancel Bill & Rental', 'إلغاء الفاتورة والتأجير', 'CancelBill', 'Cancel bill modal title', 'ACTIVE'),
    ('TRN-161', 'CANCEL.REASON_LABEL', 'Cancellation Reason *', 'سبب الإلغاء *', 'CancelBill', 'Cancellation reason label', 'ACTIVE'),
    ('TRN-162', 'CANCEL.REASON_PLACEHOLDER', 'Select cancellation reason...', 'اختر سبب الإلغاء...', 'CancelBill', 'Reason placeholder', 'ACTIVE'),
    ('TRN-163', 'CANCEL.REMARKS_LABEL', 'Mandatory Remarks *', 'ملاحظات الإلغاء الإلزامية *', 'CancelBill', 'Remarks label', 'ACTIVE'),
    ('TRN-164', 'CANCEL.REMARKS_PLACEHOLDER', 'Enter detailed explanation for bill cancellation...', 'أدخل شرحاً تفصيلياً لسبب إلغاء الفاتورة...', 'CancelBill', 'Remarks placeholder', 'ACTIVE'),
    ('TRN-165', 'CANCEL.CONFIRM_BTN', 'CONFIRM BILL CANCELLATION', 'تأكيد إلغاء الفاتورة', 'CancelBill', 'Confirm cancel button', 'ACTIVE'),
    ('TRN-166', 'CANCEL.ERR_REQUIRED_FIELDS', 'Cancellation Reason and Remarks are strictly mandatory.', 'سبب الإلغاء والملاحظات حقول إلزامية لا يمكن تركها فارغة.', 'CancelBill', 'Required error', 'ACTIVE'),
    ('TRN-167', 'CANCEL.SUCCESS_MSG', 'Bill has been successfully cancelled and audited.', 'تم إلغاء الفاتورة وتسجيلها في سجل التدقيق بنجاح.', 'CancelBill', 'Success message', 'ACTIVE'),
    ('TRN-168', 'CANCEL.ALREADY_CANCELLED', 'This bill is already cancelled.', 'هذه الفاتورة ملغاة بالفعل.', 'CancelBill', 'Already cancelled error', 'ACTIVE'),
    ('TRN-169', 'CANCEL.DAY_CLOSED_ERR', 'Cannot cancel bill: The day close for this transaction has already been completed.', 'لا يمكن إلغاء الفاتورة: تم إقفال اليوم لهذه المعاملة بالفعل.', 'CancelBill', 'Day closed error', 'ACTIVE'),

    -- SETTLEMENT REMARKS
    ('TRN-175', 'SETTLEMENT.REMARKS_LABEL', 'Settlement Remarks *', 'ملاحظات التسوية والإقفال *', 'Settlement', 'Settlement remarks label', 'ACTIVE'),
    ('TRN-176', 'SETTLEMENT.REMARKS_PLACEHOLDER', 'Enter mandatory shift settlement remarks and cash handover details...', 'أدخل ملاحظات التسوية الإلزامية وتفاصيل تسليم العهدة النقدية...', 'Settlement', 'Settlement remarks placeholder', 'ACTIVE'),
    ('TRN-177', 'SETTLEMENT.ERR_REMARKS_REQUIRED', 'Please enter settlement remarks before closing the register.', 'يرجى إدخال ملاحظات التسوية قبل إقفال الصندوق.', 'Settlement', 'Remarks required error', 'ACTIVE'),

    -- DUPLICATE BILL
    ('TRN-180', 'DUPLICATE.TITLE', 'Duplicate Bill / Reprint Management', 'إدارة النسخ المكررة وإعادة طباعة الفواتير', 'DuplicateBill', 'Duplicate bill screen title', 'ACTIVE'),
    ('TRN-181', 'DUPLICATE.SUBTITLE', 'Search historical bills and generate certified duplicate copies without affecting financial totals or sales ledgers.', 'البحث في الفواتير السابقة وإصدار نسخ مكررة معتمدة دون التأثير على إجمالي المبيعات أو القيود المالية.', 'DuplicateBill', 'Duplicate bill subtitle', 'ACTIVE'),
    ('TRN-182', 'DUPLICATE.SEARCH_BOX', 'Search by Invoice No, Customer Name or Car No...', 'ابحث برقم الفاتورة، اسم العميل أو رقم السيارة...', 'DuplicateBill', 'Search placeholder', 'ACTIVE'),
    ('TRN-183', 'DUPLICATE.BADGE', 'DUPLICATE', 'نسخة مكررة', 'DuplicateBill', 'Watermark and badge', 'ACTIVE'),
    ('TRN-184', 'DUPLICATE.REPRINT_COUNT', 'Reprint Count: {count}', 'عدد مرات إعادة الطباعة: {count}', 'DuplicateBill', 'Reprint count label', 'ACTIVE'),
    ('TRN-185', 'DUPLICATE.REPRINT_BTN', 'Print Duplicate Copy', 'طباعة نسخة مكررة', 'DuplicateBill', 'Reprint button', 'ACTIVE'),
    ('TRN-186', 'DUPLICATE.AUDIT_LOGGED', 'Duplicate bill reprint logged in audit trail.', 'تم تسجيل إعادة طباعة النسخة المكررة في سجل التدقيق.', 'DuplicateBill', 'Audit notice', 'ACTIVE'),

    -- PERIODIC REPORT
    ('TRN-190', 'REPORT.TITLE', 'Periodic Reports & Analytics', 'التقارير الدورية والتحليلات', 'Reports', 'Periodic reports title', 'ACTIVE'),
    ('TRN-191', 'REPORT.SUBTITLE', 'Generate custom date & time range financial, transactional, and audit reports with server-side aggregation.', 'توليد تقارير مالية وتشغيلية وتقارير تدقيق مخصصة حسب التاريخ والوقت مع تجميع البيانات من الخادم.', 'Reports', 'Periodic reports subtitle', 'ACTIVE'),
    ('TRN-192', 'REPORT.FROM_DATE', 'From Date', 'من تاريخ', 'Reports', 'From date label', 'ACTIVE'),
    ('TRN-193', 'REPORT.TO_DATE', 'To Date', 'إلى تاريخ', 'Reports', 'To date label', 'ACTIVE'),
    ('TRN-194', 'REPORT.FROM_TIME', 'From Time (Optional)', 'من وقت (اختياري)', 'Reports', 'From time label', 'ACTIVE'),
    ('TRN-195', 'REPORT.TO_TIME', 'To Time (Optional)', 'إلى وقت (اختياري)', 'Reports', 'To time label', 'ACTIVE'),
    ('TRN-196', 'REPORT.TYPE_LABEL', 'Report Type', 'نوع التقرير', 'Reports', 'Report type label', 'ACTIVE'),
    ('TRN-197', 'REPORT.TYPE_ALL_RENTALS', 'Detailed Rental Transactions', 'تقرير معاملات التأجير التفصيلية', 'Reports', 'All rentals report option', 'ACTIVE'),
    ('TRN-198', 'REPORT.TYPE_REVENUE_SUMMARY', 'Revenue & Settlement Summary', 'ملخص الإيرادات والتسويات', 'Reports', 'Revenue summary report option', 'ACTIVE'),
    ('TRN-199', 'REPORT.TYPE_CANCELLATIONS', 'Cancelled Bills Report', 'تقرير الفواتير الملغاة', 'Reports', 'Cancellations report option', 'ACTIVE'),
    ('TRN-200', 'REPORT.TYPE_GRACE_PERIOD', 'Grace Period Usage Report', 'تقرير استخدام فترات السماح', 'Reports', 'Grace period report option', 'ACTIVE'),
    ('TRN-201', 'REPORT.TYPE_PAYMENT_METHODS', 'Payment Methods Breakdown', 'تقرير تفصيل طرق الدفع', 'Reports', 'Payment methods report option', 'ACTIVE'),
    ('TRN-202', 'REPORT.GENERATE_BTN', 'Generate Report', 'توليد التقرير', 'Reports', 'Generate button', 'ACTIVE'),
    ('TRN-203', 'REPORT.ERR_INVALID_DATES', 'From Date cannot be greater than To Date.', 'لا يمكن أن يكون تاريخ البداية أكبر من تاريخ النهاية.', 'Reports', 'Date validation error', 'ACTIVE'),
    ('TRN-204', 'REPORT.TOTAL_REVENUE', 'Total Revenue', 'إجمالي الإيرادات', 'Reports', 'Total revenue metric', 'ACTIVE'),
    ('TRN-205', 'REPORT.TOTAL_TRANSACTIONS', 'Total Transactions', 'إجمالي المعاملات', 'Reports', 'Total transactions metric', 'ACTIVE'),
    ('TRN-206', 'REPORT.TOTAL_DISCOUNTS', 'Total Discounts', 'إجمالي الخصومات', 'Reports', 'Total discounts metric', 'ACTIVE'),
    ('TRN-207', 'REPORT.TOTAL_CANCELLATIONS', 'Total Cancelled', 'إجمالي الملغي', 'Reports', 'Total cancelled metric', 'ACTIVE'),

    -- DAY CLOSE PENDING VALIDATION & PREVIOUS DAY CHECK
    ('TRN-210', 'DAY_CLOSE.PENDING_BLOCKED_TITLE', 'Day Close Blocked: Pending Bills Detected', 'تم حظر إقفال اليوم: توجد فواتير معلقة', 'DayClose', 'Blocked title', 'ACTIVE'),
    ('TRN-211', 'DAY_CLOSE.PENDING_BLOCKED_MSG', 'Day Close cannot be completed because there are pending or unsettled bills. Please settle or complete all pending bills before performing Day Close.', 'لا يمكن إتمام إقفال اليوم لوجود فواتير تأجير نشطة أو غير مسواة. يرجى تسوية أو إغلاق جميع الفواتير المعلقة قبل تنفيذ إقفال اليوم.', 'DayClose', 'Blocked message', 'ACTIVE'),
    ('TRN-212', 'DAY_CLOSE.PENDING_BILLS_COUNT', '{count} Pending / Active Rentals Require Resolution', '{count} فواتير تأجير معلقة تتطلب الإغلاق والتسوية', 'DayClose', 'Pending count', 'ACTIVE'),
    ('TRN-213', 'DAY_CLOSE.PREV_DAY_TITLE', 'Previous Day Close Pending', 'إقفال اليوم السابق معلق', 'DayClose', 'Prev day title', 'ACTIVE'),
    ('TRN-214', 'DAY_CLOSE.PREV_DAY_MSG', 'Day Close for {date} has not been completed. Please complete the Day Close process before continuing with today''s operations.', 'لم يتم إتمام إقفال اليوم لتاريخ {date}. يرجى إتمام عملية إقفال اليوم قبل المتابعة في عمليات اليوم.', 'DayClose', 'Prev day message', 'ACTIVE'),
    ('TRN-215', 'DAY_CLOSE.GO_TO_DAY_CLOSE', 'Go to Day Close Screen', 'الانتقال إلى شاشة إقفال اليوم', 'DayClose', 'Go to day close button', 'ACTIVE'),

    -- EMAIL SETTINGS & AUTOMATIC DAY CLOSE REPORT EMAIL
    ('TRN-220', 'EMAIL.SETTINGS_TITLE', 'Day Close Email Configuration', 'إعدادات البريد الإلكتروني لإقفال اليوم', 'EmailSettings', 'Settings title', 'ACTIVE'),
    ('TRN-221', 'EMAIL.ENABLE_LABEL', 'Enable Automatic Day Close Report Email', 'تفعيل الإرسال التلقائي لتقرير إقفال اليوم بالبريد', 'EmailSettings', 'Enable toggle', 'ACTIVE'),
    ('TRN-222', 'EMAIL.RECIPIENTS_LABEL', 'Recipient Email Addresses (Comma-separated)', 'عناوين البريد الإلكتروني للمستلمين (مفصولة بفواصل)', 'EmailSettings', 'Recipients label', 'ACTIVE'),
    ('TRN-223', 'EMAIL.SMTP_HOST_LABEL', 'SMTP Server Host', 'خادم SMTP', 'EmailSettings', 'SMTP host label', 'ACTIVE'),
    ('TRN-224', 'EMAIL.SMTP_PORT_LABEL', 'SMTP Server Port', 'منفذ SMTP', 'EmailSettings', 'SMTP port label', 'ACTIVE'),
    ('TRN-225', 'EMAIL.STATUS_SENT', 'Email Sent Successfully', 'تم إرسال البريد الإلكتروني بنجاح', 'EmailSettings', 'Sent status', 'ACTIVE'),
    ('TRN-226', 'EMAIL.STATUS_FAILED', 'Email Dispatch Failed (Offline or SMTP Error)', 'تعذر إرسال البريد الإلكتروني (خطأ في الاتصال أو الخادم)', 'EmailSettings', 'Failed status', 'ACTIVE'),
    ('TRN-227', 'EMAIL.STATUS_DISABLED', 'Email Dispatch Disabled in Settings', 'الإرسال عبر البريد الإلكتروني معطل في الإعدادات', 'EmailSettings', 'Disabled status', 'ACTIVE'),
    ('TRN-228', 'EMAIL.RESEND_BTN', 'Retry Sending Email Report', 'إعادة محاولة إرسال التقرير', 'EmailSettings', 'Resend button', 'ACTIVE'),

    -- AUDIT TRAIL
    ('TRN-235', 'AUDIT.TITLE', 'System Audit Trail', 'سجل تدقيق ومراجعة النظام', 'Audit', 'Audit trail title', 'ACTIVE'),
    ('TRN-236', 'AUDIT.SUBTITLE', 'Comprehensive chronological log of sensitive financial, cancellation, grace period, settlement, and master data operations.', 'سجل زمني شامل لجميع العمليات الحساسة من إلغاءات، فترات سماح، تسويات، وتعديلات البيانات الأساسية.', 'Audit', 'Audit subtitle', 'ACTIVE'),
    ('TRN-237', 'AUDIT.ACTION', 'Action Type', 'نوع الإجراء', 'Audit', 'Action column', 'ACTIVE'),
    ('TRN-238', 'AUDIT.ENTITY', 'Entity / ID', 'السجل / المعرف', 'Audit', 'Entity column', 'ACTIVE'),
    ('TRN-239', 'AUDIT.USER', 'Performed By', 'تم بواسطة', 'Audit', 'User column', 'ACTIVE'),
    ('TRN-240', 'AUDIT.DATE', 'Timestamp', 'الوقت والتاريخ', 'Audit', 'Timestamp column', 'ACTIVE'),
    ('TRN-241', 'AUDIT.REMARKS', 'Audit Remarks', 'ملاحظات التدقيق', 'Audit', 'Remarks column', 'ACTIVE'),

    -- RECEIPT & BILL DESIGN
    ('TRN-245', 'RECEIPT.TITLE', 'RENTAL RECEIPT', 'إيصال تأجير', 'Receipt', 'Receipt header title', 'ACTIVE'),
    ('TRN-246', 'RECEIPT.INVOICE_NO', 'Invoice No', 'رقم الفاتورة', 'Receipt', 'Invoice number label', 'ACTIVE'),
    ('TRN-247', 'RECEIPT.DATE', 'Date & Time', 'التاريخ والوقت', 'Receipt', 'Receipt date label', 'ACTIVE'),
    ('TRN-248', 'RECEIPT.CAR', 'Car & Model', 'السيارة والموديل', 'Receipt', 'Car info label', 'ACTIVE'),
    ('TRN-249', 'RECEIPT.DURATION', 'Duration Tier', 'مدة التأجير', 'Receipt', 'Duration label', 'ACTIVE'),
    ('TRN-250', 'RECEIPT.SUBTOTAL', 'Rental Subtotal', 'المبلغ الأساسي للتأجير', 'Receipt', 'Subtotal label', 'ACTIVE'),
    ('TRN-251', 'RECEIPT.DISCOUNT', 'Applied Discount', 'الخصم المطبق', 'Receipt', 'Discount label', 'ACTIVE'),
    ('TRN-252', 'RECEIPT.EXTRA_CHARGE', 'Overtime Surcharge', 'رسوم الوقت الإضافي', 'Receipt', 'Extra charge label', 'ACTIVE'),
    ('TRN-253', 'RECEIPT.TOTAL_PAID', 'Total Amount Paid', 'إجمالي المبلغ المدفوع', 'Receipt', 'Total paid label', 'ACTIVE'),
    ('TRN-254', 'RECEIPT.CASHIER', 'Cashier', 'المحاسب', 'Receipt', 'Cashier label', 'ACTIVE'),
    ('TRN-255', 'RECEIPT.THANK_YOU', 'Thank you for riding with KidsDrive!', 'شكراً لاختياركم كيدز درايف!', 'Receipt', 'Thank you note', 'ACTIVE'),
    ('TRN-256', 'RECEIPT.TERMS', 'Terms: Children must be supervised at all times. Non-refundable after grace period.', 'الشروط: يجب مرافقة الأطفال دائماً. لا يسترد المبلغ بعد انتهاء فترة السماح.', 'Receipt', 'Terms text', 'ACTIVE'),
    ('TRN-257', 'RECEIPT.PRINT_BTN', 'Print Receipt', 'طباعة الإيصال', 'Receipt', 'Print receipt button', 'ACTIVE'),

    -- MASTERS
    ('TRN-260', 'COMPANY.TITLE', 'Company Master', 'إدارة الشركات', 'Company', 'Company page title', 'ACTIVE'),
    ('TRN-261', 'COMPANY.SUBTITLE', 'Manage all operating companies.', 'إدارة جميع الشركات المشغلة.', 'Company', 'Company subtitle', 'ACTIVE'),
    ('TRN-262', 'COMPANY.ADD_TITLE', 'Add Company', 'إضافة شركة جديدة', 'Company', 'Add company button/modal', 'ACTIVE'),
    ('TRN-263', 'COMPANY.EDIT_TITLE', 'Edit Company', 'تعديل بيانات الشركة', 'Company', 'Edit company modal', 'ACTIVE'),
    ('TRN-264', 'COMPANY.NAME', 'Company Name', 'اسم الشركة', 'Company', 'Company name field', 'ACTIVE'),
    ('TRN-265', 'COMPANY.NAME_PLACEHOLDER', 'Enter Company Name', 'أدخل اسم الشركة', 'Company', 'Company name placeholder', 'ACTIVE'),
    ('TRN-266', 'COMPANY.CONTACT', 'Contact Number', 'رقم الهاتف / الاتصال', 'Company', 'Contact field', 'ACTIVE'),
    ('TRN-267', 'COMPANY.CONTACT_PLACEHOLDER', 'Enter Contact Number', 'أدخل رقم الاتصال', 'Company', 'Contact placeholder', 'ACTIVE'),
    ('TRN-268', 'COMPANY.CONFIRM_DELETE', 'Are you sure you want to delete this company?', 'هل أنت متأكد من رغبتك في حذف هذه الشركة؟', 'Company', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-270', 'BRANCH.TITLE', 'Branch Master', 'إدارة الفروع', 'Branch', 'Branch page title', 'ACTIVE'),
    ('TRN-271', 'BRANCH.SUBTITLE', 'Manage company branches.', 'إدارة جميع فروع الشركات.', 'Branch', 'Branch subtitle', 'ACTIVE'),
    ('TRN-272', 'BRANCH.ADD_TITLE', 'Add Branch', 'إضافة فرع جديد', 'Branch', 'Add branch button/modal', 'ACTIVE'),
    ('TRN-273', 'BRANCH.EDIT_TITLE', 'Edit Branch', 'تعديل بيانات الفرع', 'Branch', 'Edit branch modal', 'ACTIVE'),
    ('TRN-274', 'BRANCH.NAME', 'Branch Name', 'اسم الفرع', 'Branch', 'Branch name field', 'ACTIVE'),
    ('TRN-275', 'BRANCH.NAME_PLACEHOLDER', 'Enter Branch Name', 'أدخل اسم الفرع', 'Branch', 'Branch name placeholder', 'ACTIVE'),
    ('TRN-276', 'BRANCH.COMPANY_SELECT', 'Parent Company', 'الشركة التابع لها', 'Branch', 'Company dropdown', 'ACTIVE'),
    ('TRN-277', 'BRANCH.CONFIRM_DELETE', 'Are you sure you want to delete this branch?', 'هل أنت متأكد من رغبتك في حذف هذا الفرع؟', 'Branch', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-280', 'LOCATION.TITLE', 'Location Master', 'إدارة المواقع', 'Location', 'Location page title', 'ACTIVE'),
    ('TRN-281', 'LOCATION.SUBTITLE', 'Manage operating locations and zones.', 'إدارة مواقع وأجنحة العمل.', 'Location', 'Location subtitle', 'ACTIVE'),
    ('TRN-282', 'LOCATION.ADD_TITLE', 'Add Location', 'إضافة موقع جديد', 'Location', 'Add location button/modal', 'ACTIVE'),
    ('TRN-283', 'LOCATION.EDIT_TITLE', 'Edit Location', 'تعديل بيانات الموقع', 'Location', 'Edit location modal', 'ACTIVE'),
    ('TRN-284', 'LOCATION.NAME', 'Location Name', 'اسم الموقع / الجناح', 'Location', 'Location name field', 'ACTIVE'),
    ('TRN-285', 'LOCATION.NAME_PLACEHOLDER', 'Enter Location Name', 'أدخل اسم الموقع', 'Location', 'Location placeholder', 'ACTIVE'),
    ('TRN-286', 'LOCATION.BRANCH_SELECT', 'Parent Branch', 'الفرع التابع له', 'Location', 'Branch dropdown', 'ACTIVE'),
    ('TRN-287', 'LOCATION.CONFIRM_DELETE', 'Are you sure you want to delete this location?', 'هل أنت متأكد من رغبتك في حذف هذا الموقع؟', 'Location', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-290', 'USER_MGMT.TITLE', 'User Master', 'إدارة المستخدمين', 'User', 'User master title', 'ACTIVE'),
    ('TRN-291', 'USER_MGMT.SUBTITLE', 'Manage users, employee names, passwords, and access roles.', 'إدارة حسابات المستخدمين وأسماء الموظفين وكلمات المرور والصلاحيات.', 'User', 'User master subtitle', 'ACTIVE'),
    ('TRN-292', 'USER_MGMT.ADD_TITLE', 'Add User', 'إضافة مستخدم جديد', 'User', 'Add user button/modal', 'ACTIVE'),
    ('TRN-293', 'USER_MGMT.EDIT_TITLE', 'Edit User', 'تعديل بيانات المستخدم', 'User', 'Edit user modal', 'ACTIVE'),
    ('TRN-294', 'USER_MGMT.USERNAME', 'Username', 'اسم المستخدم', 'User', 'Username field', 'ACTIVE'),
    ('TRN-295', 'USER_MGMT.USERNAME_PLACEHOLDER', 'Enter username', 'أدخل اسم المستخدم', 'User', 'Username placeholder', 'ACTIVE'),
    ('TRN-296', 'USER_MGMT.EMPLOYEE_NAME', 'Employee Full Name', 'اسم الموظف الثلاثي', 'User', 'Employee name field', 'ACTIVE'),
    ('TRN-297', 'USER_MGMT.EMPLOYEE_NAME_PLACEHOLDER', 'Enter full employee name', 'أدخل اسم الموظف كاملاً', 'User', 'Employee placeholder', 'ACTIVE'),
    ('TRN-298', 'USER_MGMT.PASSWORD', 'Password', 'كلمة المرور', 'User', 'Password field', 'ACTIVE'),
    ('TRN-299', 'USER_MGMT.PASSWORD_PLACEHOLDER', 'Enter password', 'أدخل كلمة المرور', 'User', 'Password placeholder', 'ACTIVE'),
    ('TRN-300', 'USER_MGMT.ROLE', 'System Role / Permission', 'الصلاحية / الدور', 'User', 'Role dropdown', 'ACTIVE'),
    ('TRN-301', 'USER_MGMT.CONFIRM_DELETE', 'Are you sure you want to delete this user account?', 'هل أنت متأكد من رغبتك في حذف حساب هذا المستخدم؟', 'User', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-310', 'CAR_MODEL.TITLE', 'Car Model Master', 'إدارة موديلات السيارات', 'CarModel', 'Car model title', 'ACTIVE'),
    ('TRN-311', 'CAR_MODEL.SUBTITLE', 'Manage car categories and seating capacities.', 'إدارة فئات السيارات وسعة المقاعد.', 'CarModel', 'Car model subtitle', 'ACTIVE'),
    ('TRN-312', 'CAR_MODEL.ADD_TITLE', 'Add Car Model', 'إضافة موديل سيارة', 'CarModel', 'Add car model button/modal', 'ACTIVE'),
    ('TRN-313', 'CAR_MODEL.EDIT_TITLE', 'Edit Car Model', 'تعديل موديل السيارة', 'CarModel', 'Edit car model modal', 'ACTIVE'),
    ('TRN-314', 'CAR_MODEL.NAME', 'Model Name', 'اسم الموديل', 'CarModel', 'Model name field', 'ACTIVE'),
    ('TRN-315', 'CAR_MODEL.NAME_PLACEHOLDER', 'Enter Model Name', 'أدخل اسم الموديل', 'CarModel', 'Model placeholder', 'ACTIVE'),
    ('TRN-316', 'CAR_MODEL.SEATS', 'Seating Capacity', 'عدد المقاعد', 'CarModel', 'Seats field', 'ACTIVE'),
    ('TRN-317', 'CAR_MODEL.CONFIRM_DELETE', 'Are you sure you want to delete this car model?', 'هل أنت متأكد من رغبتك في حذف موديل السيارة هذا؟', 'CarModel', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-320', 'CAR.TITLE', 'Car Number Master', 'إدارة أرقام السيارات', 'Car', 'Car number title', 'ACTIVE'),
    ('TRN-321', 'CAR.SUBTITLE', 'Manage individual vehicle fleet, plates, and statuses.', 'إدارة أسطول المركبات الفردية وأرقام اللوحات والحالات.', 'Car', 'Car number subtitle', 'ACTIVE'),
    ('TRN-322', 'CAR.ADD_TITLE', 'Add Car Number', 'إضافة رقم سيارة', 'Car', 'Add car number button/modal', 'ACTIVE'),
    ('TRN-323', 'CAR.EDIT_TITLE', 'Edit Car Number', 'تعديل رقم السيارة', 'Car', 'Edit car modal', 'ACTIVE'),
    ('TRN-324', 'CAR.NUMBER', 'Car Number / Code', 'رقم السيارة / الكود', 'Car', 'Car number field', 'ACTIVE'),
    ('TRN-325', 'CAR.NUMBER_PLACEHOLDER', 'Enter Car Number (e.g. KD-01)', 'أدخل رقم السيارة (مثال: KD-01)', 'Car', 'Car number placeholder', 'ACTIVE'),
    ('TRN-326', 'CAR.MODEL_SELECT', 'Model Category', 'الفئة والموديل', 'Car', 'Model dropdown', 'ACTIVE'),
    ('TRN-327', 'CAR.BATTERY_LEVEL', 'Battery Level', 'مستوى شحن البطارية', 'Car', 'Battery level field', 'ACTIVE'),
    ('TRN-328', 'CAR.CONFIRM_DELETE', 'Are you sure you want to delete this car?', 'هل أنت متأكد من رغبتك في حذف هذه السيارة؟', 'Car', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-330', 'RATE.TITLE', 'Rate Setup Master', 'إدارة إعداد الأسعار', 'Rate', 'Rate setup title', 'ACTIVE'),
    ('TRN-331', 'RATE.SUBTITLE', 'Manage rental tariffs based on duration and model.', 'إدارة تعرفة وأسعار التأجير حسب المدة والموديل.', 'Rate', 'Rate setup subtitle', 'ACTIVE'),
    ('TRN-332', 'RATE.ADD_TITLE', 'Add Rate Setup', 'إضافة تسعيرة جديدة', 'Rate', 'Add rate button/modal', 'ACTIVE'),
    ('TRN-333', 'RATE.EDIT_TITLE', 'Edit Rate Setup', 'تعديل التسعيرة', 'Rate', 'Edit rate modal', 'ACTIVE'),
    ('TRN-334', 'RATE.MODEL', 'Car Model', 'موديل السيارة', 'Rate', 'Rate model dropdown', 'ACTIVE'),
    ('TRN-335', 'RATE.DURATION', 'Duration (Minutes)', 'المدة (بالدقائق)', 'Rate', 'Rate duration field', 'ACTIVE'),
    ('TRN-336', 'RATE.AMOUNT', 'Price (KD)', 'السعر (د.ك)', 'Rate', 'Rate amount field', 'ACTIVE'),
    ('TRN-337', 'RATE.CONFIRM_DELETE', 'Are you sure you want to delete this rate configuration?', 'هل أنت متأكد من رغبتك في حذف هذه التسعيرة؟', 'Rate', 'Delete confirmation prompt', 'ACTIVE'),

    ('TRN-340', 'GRACE.TITLE', 'Grace Period Master', 'إدارة فترة السماح', 'GracePeriod', 'Grace period title', 'ACTIVE'),
    ('TRN-341', 'GRACE.SUBTITLE', 'Manage allowable grace periods for rentals.', 'إدارة فترات السماح المسموح بها للتأجير.', 'GracePeriod', 'Grace period subtitle', 'ACTIVE'),
    ('TRN-342', 'GRACE.ADD_TITLE', 'Add Grace Period', 'إضافة فترة سماح', 'GracePeriod', 'Add grace period button/modal', 'ACTIVE'),
    ('TRN-343', 'GRACE.EDIT_TITLE', 'Edit Grace Period', 'تعديل فترة السماح', 'GracePeriod', 'Edit grace period modal', 'ACTIVE'),
    ('TRN-344', 'GRACE.MINUTES', 'Grace Period (Minutes)', 'فترة السماح (بالدقائق)', 'GracePeriod', 'Minutes field', 'ACTIVE'),
    ('TRN-345', 'GRACE.CONFIRM_DELETE', 'Are you sure you want to delete this grace period?', 'هل أنت متأكد من رغبتك في حذف فترة السماح هذه؟', 'GracePeriod', 'Delete confirmation prompt', 'ACTIVE'),

    -- SHIFT CLOSING
    ('TRN-350', 'SHIFT.TITLE', 'Shift Closing & Cash Handover', 'إقفال الوردية وتسليم العهدة', 'ShiftClose', 'Shift close title', 'ACTIVE'),
    ('TRN-351', 'SHIFT.SUBTITLE', 'Close current active shift register, verify cash & KNET totals, and submit mandatory settlement remarks.', 'إقفال سجل الوردية النشطة حالياً، ومطابقة النقد والكي نت، وإدخال ملاحظات التسوية الإلزامية.', 'ShiftClose', 'Shift close subtitle', 'ACTIVE'),
    ('TRN-352', 'SHIFT.LOADING', 'Loading shift summary...', 'جاري تحميل ملخص الوردية...', 'ShiftClose', 'Shift loading indicator', 'ACTIVE'),
    ('TRN-353', 'SHIFT.CASHIER', 'Cashier / User', 'المحاسب / المستخدم', 'ShiftClose', 'Shift user label', 'ACTIVE'),
    ('TRN-354', 'SHIFT.STARTED_AT', 'Shift Started', 'بدء الوردية', 'ShiftClose', 'Shift start time', 'ACTIVE'),
    ('TRN-355', 'SHIFT.CASH_TOTAL', 'Cash Total', 'إجمالي النقد (كاش)', 'ShiftClose', 'Cash total label', 'ACTIVE'),
    ('TRN-356', 'SHIFT.KNET_TOTAL', 'KNET Total', 'إجمالي كي نت', 'ShiftClose', 'KNET total label', 'ACTIVE'),
    ('TRN-357', 'SHIFT.OVERALL_TOTAL', 'Overall Shift Total', 'الإجمالي العام للوردية', 'ShiftClose', 'Overall total label', 'ACTIVE'),
    ('TRN-358', 'SHIFT.CLOSING_NOTES', 'Closing & Settlement Remarks *', 'ملاحظات الإقفال والتسوية الإلزامية *', 'ShiftClose', 'Closing notes field', 'ACTIVE'),
    ('TRN-359', 'SHIFT.NOTES_PLACEHOLDER', 'Enter required shift handover and cash settlement remarks...', 'أدخل ملاحظات تسليم الوردية ومطابقة العهدة النقدية...', 'ShiftClose', 'Notes placeholder', 'ACTIVE'),
    ('TRN-360', 'SHIFT.CONFIRM_BTN', 'CONFIRM SHIFT SETTLEMENT & CLOSE', 'تأكيد تسوية الوردية والإقفال', 'ShiftClose', 'Confirm shift close button', 'ACTIVE'),
    ('TRN-361', 'SHIFT.CONFIRM_PROMPT', 'Are you sure you want to close and settle the current shift?', 'هل أنت متأكد من رغبتك في إقفال وتسوية الوردية الحالية؟', 'ShiftClose', 'Confirm prompt', 'ACTIVE'),
    ('TRN-362', 'SHIFT.SUCCESS_MSG', 'Shift settled and closed successfully.', 'تم إقفال وتسوية الوردية بنجاح.', 'ShiftClose', 'Success alert message', 'ACTIVE'),

    -- DAY CLOSING
    ('TRN-370', 'DAY_CLOSE.TITLE', 'Day Closing & Audit', 'إقفال وتدقيق اليوم', 'DayClose', 'Day close title', 'ACTIVE'),
    ('TRN-371', 'DAY_CLOSE.SUBTITLE', 'Perform end-of-day audit, verify all completed transactions, validate pending bills, and record daily closing.', 'إجراء تدقيق نهاية اليوم، والتحقق من المعاملات المكتملة، وفحص الفواتير المعلقة، وحفظ سجل الإقفال.', 'DayClose', 'Day close subtitle', 'ACTIVE'),
    ('TRN-372', 'DAY_CLOSE.LOADING', 'Auditing today''s transactions...', 'جاري تدقيق معاملات اليوم...', 'DayClose', 'Day close loading indicator', 'ACTIVE'),
    ('TRN-373', 'DAY_CLOSE.AUDIT_DATE', 'Audit Date', 'تاريخ التدقيق', 'DayClose', 'Audit date label', 'ACTIVE'),
    ('TRN-374', 'DAY_CLOSE.TOTAL_RENTALS', 'Total Completed Rentals', 'إجمالي عمليات التأجير المكتملة', 'DayClose', 'Completed rentals count label', 'ACTIVE'),
    ('TRN-375', 'DAY_CLOSE.CASH_REVENUE', 'Cash Revenue', 'الإيراد النقدي (كاش)', 'DayClose', 'Cash revenue label', 'ACTIVE'),
    ('TRN-376', 'DAY_CLOSE.KNET_REVENUE', 'KNET Revenue', 'إيراد كي نت / البطاقات', 'DayClose', 'KNET revenue label', 'ACTIVE'),
    ('TRN-377', 'DAY_CLOSE.TOTAL_REVENUE', 'Total Revenue Audited', 'إجمالي الإيرادات المدققة', 'DayClose', 'Total audited revenue label', 'ACTIVE'),
    ('TRN-378', 'DAY_CLOSE.AUDIT_NOTES', 'Audit Notes', 'ملاحظات التدقيق', 'DayClose', 'Audit notes field label', 'ACTIVE'),
    ('TRN-379', 'DAY_CLOSE.NOTES_PLACEHOLDER', 'Optional end-of-day audit notes...', 'ملاحظات تدقيق نهاية اليوم (اختياري)...', 'DayClose', 'Audit notes placeholder', 'ACTIVE'),
    ('TRN-380', 'DAY_CLOSE.CONFIRM_BTN', 'CONFIRM DAY CLOSE IN DATABASE', 'تأكيد إقفال اليوم في قاعدة البيانات', 'DayClose', 'Confirm day close button', 'ACTIVE'),
    ('TRN-381', 'DAY_CLOSE.CONFIRM_PROMPT', 'Are you sure you want to perform the End of Day closing?', 'هل أنت متأكد من رغبتك في تنفيذ إقفال نهاية اليوم؟', 'DayClose', 'Confirm prompt', 'ACTIVE'),
    ('TRN-382', 'DAY_CLOSE.SUCCESS_MSG', 'Day close record successfully saved!', 'تم حفظ سجل إقفال اليوم بنجاح!', 'DayClose', 'Success alert message', 'ACTIVE'),

    -- TRANSLATION MANAGEMENT ADMIN & EXPORT/IMPORT
    ('TRN-390', 'TRANS.TITLE', 'Translation Management', 'إدارة الترجمات واللغات', 'Translations', 'Translation admin page title', 'ACTIVE'),
    ('TRN-391', 'TRANS.SUBTITLE', 'Manage centralized multilingual translation keys, English text, Arabic translations, and Excel/CSV export & import.', 'إدارة مفاتيح الترجمة المركزية والنصوص الإنجليزية والترجمات العربية وتصدير واستيراد ملفات Excel/CSV.', 'Translations', 'Translation admin subtitle', 'ACTIVE'),
    ('TRN-392', 'TRANS.ADD_TITLE', 'Add New Translation Key', 'إضافة مفتاح ترجمة جديد', 'Translations', 'Add translation title', 'ACTIVE'),
    ('TRN-393', 'TRANS.EDIT_TITLE', 'Edit Translation Key', 'تعديل مفتاح الترجمة', 'Translations', 'Edit translation title', 'ACTIVE'),
    ('TRN-394', 'TRANS.KEY', 'Translation Key', 'مفتاح الترجمة', 'Translations', 'Translation key column/field', 'ACTIVE'),
    ('TRN-395', 'TRANS.KEY_PLACEHOLDER', 'e.g. COMMON.MY_LABEL', 'مثال: COMMON.MY_LABEL', 'Translations', 'Translation key placeholder', 'ACTIVE'),
    ('TRN-396', 'TRANS.ENGLISH_TEXT', 'English Text', 'النص الإنجليزي', 'Translations', 'English text column/field', 'ACTIVE'),
    ('TRN-397', 'TRANS.ENGLISH_PLACEHOLDER', 'Enter English text', 'أدخل النص باللغة الإنجليزية', 'Translations', 'English placeholder', 'ACTIVE'),
    ('TRN-398', 'TRANS.ARABIC_TEXT', 'Arabic Text', 'النص العربي', 'Translations', 'Arabic text column/field', 'ACTIVE'),
    ('TRN-399', 'TRANS.ARABIC_PLACEHOLDER', 'أدخل النص باللغة العربية', 'أدخل النص باللغة العربية', 'Translations', 'Arabic placeholder', 'ACTIVE'),
    ('TRN-400', 'TRANS.MODULE', 'Module', 'الوحدة / القسم', 'Translations', 'Module column/field', 'ACTIVE'),
    ('TRN-401', 'TRANS.DESCRIPTION', 'Description / Context', 'الوصف / السياق', 'Translations', 'Description field', 'ACTIVE'),
    ('TRN-402', 'TRANS.DESCRIPTION_PLACEHOLDER', 'Optional context for translators...', 'سياق توضيحي للمترجمين (اختياري)...', 'Translations', 'Description placeholder', 'ACTIVE'),
    ('TRN-403', 'TRANS.SEARCH_PLACEHOLDER', 'Search by Key, English text or Arabic text...', 'ابحث بواسطة المفتاح، النص الإنجليزي أو العربي...', 'Translations', 'Search input placeholder', 'ACTIVE'),
    ('TRN-404', 'TRANS.FILTER_MODULE', 'Filter by Module', 'تصفية حسب الوحدة', 'Translations', 'Module filter label', 'ACTIVE'),
    ('TRN-405', 'TRANS.FILTER_STATUS', 'Filter by Status', 'تصفية حسب الحالة', 'Translations', 'Status filter label', 'ACTIVE'),
    ('TRN-406', 'TRANS.TOTAL_KEYS', 'Total Keys', 'إجمالي المفاتيح', 'Translations', 'Stats total keys label', 'ACTIVE'),
    ('TRN-407', 'TRANS.ACTIVE_KEYS', 'Active Keys', 'المفاتيح النشطة', 'Translations', 'Stats active keys label', 'ACTIVE'),
    ('TRN-408', 'TRANS.CONFIRM_DELETE', 'Are you sure you want to delete this translation key?', 'هل أنت متأكد من رغبتك في حذف مفتاح الترجمة هذا؟', 'Translations', 'Delete confirmation prompt', 'ACTIVE'),
    ('TRN-409', 'TRANS.EXPORT_ENGLISH_BTN', 'Export English Captions', 'تصدير النصوص الإنجليزية', 'Translations', 'Export English button', 'ACTIVE'),
    ('TRN-410', 'TRANS.EXPORT_ALL_BTN', 'Export Bilingual Dictionary', 'تصدير القاموس ثنائي اللغة', 'Translations', 'Export all button', 'ACTIVE'),
    ('TRN-411', 'TRANS.IMPORT_BTN', 'Import Translations', 'استيراد الترجمات', 'Translations', 'Import translations button', 'ACTIVE'),
    ('TRN-412', 'TRANS.IMPORT_MODAL_TITLE', 'Import Translations from File', 'استيراد الترجمات من ملف', 'Translations', 'Import modal title', 'ACTIVE'),
    ('TRN-413', 'TRANS.IMPORT_SUMMARY', 'Import Summary: {updated} updated, {newCount} new keys added, {errors} errors.', 'ملخص الاستيراد: تم تحديث {updated}، وإضافة {newCount} مفتاح جديد، مع {errors} أخطاء.', 'Translations', 'Import summary message', 'ACTIVE'),
    ('TRN-414', 'TRANS.IMPORT_MODAL_DESC', 'Upload an Excel (.xlsx, .xls), CSV (.csv), or JSON file in the exact same format as the exported file to batch import or update translation keys.', 'قم برفع ملف Excel (.xlsx, .xls) أو CSV (.csv) أو JSON بنفس تنسيق ملف التصدير تماماً لاستيراد وتحديث مفاتيح الترجمة دفعة واحدة.', 'Translations', 'Import description', 'ACTIVE'),
    ('TRN-415', 'TRANS.IMPORT_DROP_ZONE', 'Drag & drop your Excel/CSV/JSON file here, or click to browse', 'اسحب وأفلت ملف Excel/CSV/JSON هنا، أو انقر للاختيار من جهازك', 'Translations', 'Drop zone label', 'ACTIVE'),
    ('TRN-416', 'TRANS.IMPORT_MODE_UPSERT', 'Update Existing & Add New (Upsert - Recommended)', 'تحديث المفاتيح الحالية وإضافة الجديدة (موصى به)', 'Translations', 'Import mode upsert', 'ACTIVE'),
    ('TRN-417', 'TRANS.IMPORT_MODE_NEW_ONLY', 'Add New Keys Only (Preserve Existing)', 'إضافة المفاتيح الجديدة فقط (الحفاظ على الحالية)', 'Translations', 'Import mode new only', 'ACTIVE'),
    ('TRN-418', 'TRANS.DOWNLOAD_TEMPLATE', 'Download Sample Template', 'تحميل نموذج استيراد جاهز', 'Translations', 'Download sample template', 'ACTIVE'),
    ('TRN-419', 'TRANS.IMPORT_PREVIEW_TITLE', 'Import Preview & Validation', 'معاينة وبيانات الاستيراد', 'Translations', 'Preview title', 'ACTIVE'),
    ('TRN-524', 'TRANS.CLEAR_FILE', 'Clear File', 'إلغاء الملف', 'Translations', 'Clear file button', 'ACTIVE'),
    ('TRN-525', 'TRANS.ACTION_NEW', 'NEW KEY', 'مفتاح جديد', 'Translations', 'New key badge', 'ACTIVE'),
    ('TRN-526', 'TRANS.ACTION_UPDATE', 'UPDATE', 'تحديث', 'Translations', 'Update badge', 'ACTIVE'),
    ('TRN-527', 'TRANS.ACTION_INVALID', 'INVALID', 'غير صالح', 'Translations', 'Invalid badge', 'ACTIVE'),
    ('TRN-528', 'TRANS.IMPORT_SUCCESS', 'Translations imported successfully!', 'تم استيراد الترجمات بنجاح!', 'Translations', 'Import success alert', 'ACTIVE'),

    -- VALIDATION & SYSTEM MESSAGES
    ('TRN-420', 'VALIDATION.REQUIRED', 'This field is required.', 'هذا الحقل مطلوب.', 'Validation', 'Required field validation', 'ACTIVE'),
    ('TRN-421', 'VALIDATION.INVALID_EMAIL', 'Please enter a valid email address.', 'يرجى إدخال عنوان بريد إلكتروني صالح.', 'Validation', 'Invalid email error', 'ACTIVE'),
    ('TRN-422', 'VALIDATION.INVALID_DATA', 'Invalid input data. Please check and try again.', 'بيانات الإدخال غير صالحة. يرجى المراجعة والمحاولة مرة أخرى.', 'Validation', 'Invalid data error', 'ACTIVE'),
    ('TRN-423', 'MESSAGE.SAVE_SUCCESS', 'Record saved successfully.', 'تم حفظ السجل بنجاح.', 'Message', 'Save success notification', 'ACTIVE'),
    ('TRN-424', 'MESSAGE.UPDATE_SUCCESS', 'Record updated successfully.', 'تم تحديث السجل بنجاح.', 'Message', 'Update success notification', 'ACTIVE'),
    ('TRN-425', 'MESSAGE.DELETE_SUCCESS', 'Record deleted successfully.', 'تم حذف السجل بنجاح.', 'Message', 'Delete success notification', 'ACTIVE'),
    ('TRN-426', 'MESSAGE.SERVER_ERROR', 'An unexpected server error occurred.', 'حدث خطأ غير متوقع في الخادم.', 'Message', 'Server error notification', 'ACTIVE'),
    ('TRN-427', 'MESSAGE.DB_CONNECTED', 'Database connected successfully.', 'تم الاتصال بقاعدة البيانات بنجاح.', 'Message', 'DB connect notice', 'ACTIVE'),

    -- MASTER EXPORT, PRINT & THERMAL PRINTING
    ('TRN-430', 'NAV.MASTER_EXPORT', 'Master Export', 'تصدير السجلات الرئيسية', 'Navigation', 'Master export navigation item', 'ACTIVE'),
    ('TRN-431', 'MASTER_EXPORT.TITLE', 'Master Data Export', 'تصدير بيانات السجلات الرئيسية', 'Export', 'Master export page title', 'ACTIVE'),
    ('TRN-432', 'MASTER_EXPORT.SUBTITLE', 'Universal export for all existing master entities (Company, Branch, Location, User, Car Model, Fleet, Rate, Grace Period, Translations) with Excel, PDF, CSV, Standard & Thermal Printing.', 'تصدير شامل لجميع السجلات والبيانات الرئيسية القائمة في النظام مع دعم Excel و PDF و CSV والطباعة العادية والحرارية.', 'Export', 'Master export subtitle', 'ACTIVE'),
    ('TRN-433', 'MASTER_EXPORT.SELECT_MASTER', 'Select Master Entity', 'اختر السجل الرئيسي', 'Export', 'Master selector label', 'ACTIVE'),
    ('TRN-434', 'MASTER_EXPORT.FILTER_PLACEHOLDER', 'Filter records by keyword...', 'تصفية السجلات بكلمة مفتاحية...', 'Export', 'Filter input placeholder', 'ACTIVE'),
    ('TRN-435', 'MASTER_EXPORT.PROCESSING_MODE', 'Processing Mode', 'نمط المعالجة', 'Export', 'Processing mode selector', 'ACTIVE'),
    ('TRN-436', 'MASTER_EXPORT.CLIENT_FAST', 'Instant (Client)', 'فوري (المتصفح)', 'Export', 'Client processing toggle', 'ACTIVE'),
    ('TRN-437', 'MASTER_EXPORT.SERVER_LARGE', 'Server Streaming', 'تدفق الخادم', 'Export', 'Server processing toggle', 'ACTIVE'),
    ('TRN-438', 'MASTER_EXPORT.SELECT_COLUMNS', 'Select Columns to Export', 'تحديد الأعمدة للتصدير', 'Export', 'Column selector label', 'ACTIVE'),
    ('TRN-439', 'MASTER_EXPORT.PREVIEW_TITLE', 'Live Data Preview', 'معاينة البيانات الحية', 'Export', 'Preview table title', 'ACTIVE'),
    ('TRN-440', 'MASTER_EXPORT.SHOWING_FIRST_100', 'Showing first 100 rows of {count} matching records in preview.', 'يتم عرض أول 100 سجل من أصل {count} سجل مطابق في المعاينة.', 'Export', 'Preview truncation notice', 'ACTIVE'),
    ('TRN-441', 'EXPORT.BUTTON', 'Export Data', 'تصدير البيانات', 'Export', 'Export dropdown button', 'ACTIVE'),
    ('TRN-442', 'EXPORT.OPTIONS_TITLE', 'Export & Print Formats', 'صيغ التصدير والطباعة', 'Export', 'Export dropdown title', 'ACTIVE'),
    ('TRN-443', 'EXPORT.EXCEL', 'Export to Excel', 'تصدير إلى Excel', 'Export', 'Excel export option', 'ACTIVE'),
    ('TRN-444', 'EXPORT.PDF', 'Export to PDF', 'تصدير إلى PDF', 'Export', 'PDF export option', 'ACTIVE'),
    ('TRN-445', 'EXPORT.CSV', 'Export to CSV', 'تصدير إلى CSV', 'Export', 'CSV export option', 'ACTIVE'),
    ('TRN-446', 'PRINT.PRINT_A4', 'Print (A4 Standard)', 'طباعة عادية (A4)', 'Print', 'Standard print button', 'ACTIVE'),
    ('TRN-447', 'PRINT.STANDARD_A4_DESC', 'Standard A4 Document Format', 'تنسيق مستند A4 القياسي', 'Print', 'A4 format description', 'ACTIVE'),
    ('TRN-448', 'PRINT.THERMAL_PRINT', 'Thermal Print', 'طباعة إيصال حراري', 'Print', 'Thermal print button', 'ACTIVE'),
    ('TRN-449', 'PRINT.OFFER_THERMAL_PRINT', 'Would you like to print a thermal receipt?', 'هل ترغب في طباعة إيصال حراري الآن؟', 'Print', 'Thermal print offer prompt', 'ACTIVE'),
    ('TRN-450', 'COMMON.ROWS', 'Rows', 'صفوف', 'Common', 'Row count suffix', 'ACTIVE'),
    ('TRN-451', 'COMMON.MINUTES_FULL', 'Minutes', 'دقائق', 'Common', 'Minutes suffix', 'ACTIVE'),
    ('TRN-452', 'COMMON.SELECT_ALL', 'Select All', 'تحديد الكل', 'Common', 'Select all button', 'ACTIVE'),
    ('TRN-453', 'COMMON.DESELECT_ALL', 'Deselect All', 'إلغاء تحديد الكل', 'Common', 'Deselect all button', 'ACTIVE'),
    ('TRN-454', 'COMMON.TOTAL_COUNT', 'Total Records', 'إجمالي السجلات', 'Common', 'Total count label', 'ACTIVE'),
    ('TRN-455', 'COMMON.FILTERED_COUNT', 'Filtered Records', 'السجلات المصفاة', 'Common', 'Filtered count label', 'ACTIVE'),

    -- PRINTER MASTER & POS DIRECT PRINTING
    ('TRN-460', 'NAV.PRINTER_MASTER', 'Printer Master', 'إدارة الطابعات', 'Navigation', 'Printer master navigation item', 'ACTIVE'),
    ('TRN-461', 'PRINTER.TITLE', 'Printer Master', 'إدارة الطابعات', 'Printer', 'Printer master page title', 'ACTIVE'),
    ('TRN-462', 'PRINTER.SUBTITLE', 'Manage POS thermal printers, network bindings, and hardware profiles with live testing.', 'إدارة طابعات الإيصالات الحرارية ونقاط الشبكة وربط الأجهزة مع فحص الاتصال الحي.', 'Printer', 'Printer master subtitle', 'ACTIVE'),
    ('TRN-463', 'PRINTER.ADD_TITLE', 'Add New Printer', 'إضافة طابعة جديدة', 'Printer', 'Add printer button/title', 'ACTIVE'),
    ('TRN-464', 'PRINTER.EDIT_TITLE', 'Edit Printer', 'تعديل بيانات الطابعة', 'Printer', 'Edit printer modal title', 'ACTIVE'),
    ('TRN-465', 'PRINTER.PRINTER_ID', 'Printer ID', 'معرف الطابعة', 'Printer', 'Printer ID label', 'ACTIVE'),
    ('TRN-466', 'PRINTER.NAME', 'Printer Name', 'اسم الطابعة', 'Printer', 'Printer name label', 'ACTIVE'),
    ('TRN-467', 'PRINTER.IP_ADDRESS', 'IP Address', 'عنوان IP', 'Printer', 'Printer IP address label', 'ACTIVE'),
    ('TRN-468', 'PRINTER.PORT', 'Port', 'المنفذ', 'Printer', 'Printer port label', 'ACTIVE'),
    ('TRN-469', 'PRINTER.INTERFACE', 'Interface', 'نوع الاتصال', 'Printer', 'Interface type label', 'ACTIVE'),
    ('TRN-470', 'PRINTER.TERMINAL', 'Terminal', 'نقطة البيع / المحطة', 'Printer', 'Terminal binding label', 'ACTIVE'),
    ('TRN-471', 'PRINTER.PRINT_TYPE', 'Print Type / Role', 'نوع الطباعة / الدور', 'Printer', 'Print type role label', 'ACTIVE'),
    ('TRN-472', 'PRINTER.PAPER_WIDTH', 'Paper Width', 'عرض الورق', 'Printer', 'Paper width label', 'ACTIVE'),
    ('TRN-473', 'PRINTER.ENCODING', 'Encoding', 'ترميز المحارف', 'Printer', 'Encoding label', 'ACTIVE'),
    ('TRN-474', 'PRINTER.TEST_CONNECTION', 'Test Connection', 'فحص الاتصال', 'Printer', 'Test connection button', 'ACTIVE'),
    ('TRN-475', 'PRINTER.TEST_PRINT', 'Test Print', 'طباعة تجريبية', 'Printer', 'Test print button', 'ACTIVE'),
    ('TRN-476', 'PRINTER.AUTO_CUT', 'Auto Cut Paper', 'قص الورق تلقائياً', 'Printer', 'Auto cut toggle label', 'ACTIVE'),
    ('TRN-477', 'PRINTER.CASH_DRAWER', 'Open Cash Drawer', 'فتح درج النقود', 'Printer', 'Cash drawer toggle label', 'ACTIVE'),
    ('TRN-478', 'PRINTER.TEST_SUCCESS', 'Connection Successful', 'تم الاتصال بنجاح', 'Printer', 'Test success badge/msg', 'ACTIVE'),
    ('TRN-479', 'PRINTER.TEST_FAILED', 'Connection Failed / Unreachable', 'فشل الاتصال / غير متاح', 'Printer', 'Test failed badge/msg', 'ACTIVE'),
    ('TRN-480', 'SETTLEMENT.PRINT_SUCCESS', 'Thermal receipt printed successfully', 'تمت طباعة إيصال التسوية الحراري بنجاح', 'Settlement', 'Settlement print success notice', 'ACTIVE'),
    ('TRN-481', 'SETTLEMENT.PRINT_WARNING', 'Settlement saved, but thermal printer is unavailable', 'تم حفظ التسوية، ولكن تعذر الاتصال بالطابعة الحرارية', 'Settlement', 'Settlement print warning notice', 'ACTIVE'),
    ('TRN-482', 'NAV.PRINT_FORMAT_MASTER', 'Print Format Master', 'نماذج وتنسيقات الطباعة', 'Navigation', 'Print format navigation item', 'ACTIVE'),
    ('TRN-483', 'NAV.USER_RIGHTS', 'User Rights & Permissions', 'صلاحيات وأذونات المستخدمين', 'Navigation', 'User rights navigation item', 'ACTIVE'),
    ('TRN-484', 'FORMAT.TITLE', 'Print Format Master', 'إدارة نماذج وتنسيقات الطباعة', 'PrintFormat', 'Print format page title', 'ACTIVE'),
    ('TRN-485', 'FORMAT.SUBTITLE', 'Configure thermal slip layouts, bilingual templates, field visibility, headers and footers without code changes.', 'إدارة وتخصيص نماذج الإيصالات الحرارية ثنائية اللغة والحقول المرئية ورأس وتذييل الصفحة بدون تعديل الكود.', 'PrintFormat', 'Print format page subtitle', 'ACTIVE'),
    ('TRN-486', 'FORMAT.ADD_TITLE', 'Add Print Format', 'إضافة نموذج طباعة جديد', 'PrintFormat', 'Add format title', 'ACTIVE'),
    ('TRN-487', 'FORMAT.EDIT_TITLE', 'Edit Print Format', 'تعديل نموذج الطباعة', 'PrintFormat', 'Edit format title', 'ACTIVE'),
    ('TRN-488', 'FORMAT.NAME', 'Format Name', 'اسم النموذج', 'PrintFormat', 'Format name label', 'ACTIVE'),
    ('TRN-489', 'FORMAT.LANGUAGE', 'Language & Direction', 'اللغة والاتجاه', 'PrintFormat', 'Language label', 'ACTIVE'),
    ('TRN-490', 'FORMAT.HEADER_TITLE', 'Header Title', 'عنوان رأس الإيصال', 'PrintFormat', 'Header title field', 'ACTIVE'),
    ('TRN-491', 'FORMAT.HEADER_SUBTITLE', 'Header Subtitle', 'العنوان الفرعي', 'PrintFormat', 'Header subtitle field', 'ACTIVE'),
    ('TRN-492', 'FORMAT.SHOW_LOGO', 'Show Logo Header', 'إظهار شعار الشركة', 'PrintFormat', 'Show logo toggle', 'ACTIVE'),
    ('TRN-493', 'FORMAT.SHOW_COMPANY', 'Show Company Name', 'إظهار اسم الشركة', 'PrintFormat', 'Show company toggle', 'ACTIVE'),
    ('TRN-494', 'FORMAT.SHOW_BRANCH', 'Show Branch & Location', 'إظهار الفرع والموقع', 'PrintFormat', 'Show branch toggle', 'ACTIVE'),
    ('TRN-495', 'FORMAT.SHOW_CUSTOMER', 'Show Customer Details', 'إظهار بيانات العميل', 'PrintFormat', 'Show customer toggle', 'ACTIVE'),
    ('TRN-496', 'FORMAT.SHOW_CAR', 'Show Vehicle Details', 'إظهار بيانات السيارة', 'PrintFormat', 'Show car toggle', 'ACTIVE'),
    ('TRN-497', 'FORMAT.SHOW_PRICING', 'Show Pricing Breakdown', 'إظهار تفاصيل المبالغ', 'PrintFormat', 'Show pricing toggle', 'ACTIVE'),
    ('TRN-498', 'FORMAT.SHOW_PAYMENT', 'Show Payment Method', 'إظهار طريقة الدفع', 'PrintFormat', 'Show payment toggle', 'ACTIVE'),
    ('TRN-499', 'FORMAT.SHOW_CASHIER', 'Show Cashier Name', 'إظهار اسم الكاشير', 'PrintFormat', 'Show cashier toggle', 'ACTIVE'),
    ('TRN-500', 'FORMAT.SHOW_BARCODE', 'Show Barcode', 'إظهار الباركود', 'PrintFormat', 'Show barcode toggle', 'ACTIVE'),
    ('TRN-501', 'FORMAT.FOOTER_NOTES', 'Footer Notes', 'ملاحظات تذييل الإيصال', 'PrintFormat', 'Footer notes field', 'ACTIVE'),
    ('TRN-502', 'FORMAT.TERMS', 'Terms & Conditions', 'الشروط والأحكام', 'PrintFormat', 'Terms field', 'ACTIVE'),
    ('TRN-503', 'FORMAT.SET_DEFAULT', 'Set as Default', 'تعيين كافتراضي', 'PrintFormat', 'Set default button', 'ACTIVE'),
    ('TRN-504', 'FORMAT.IS_DEFAULT', 'Default Format', 'النموذج الافتراضي', 'PrintFormat', 'Default badge', 'ACTIVE'),
    ('TRN-505', 'FORMAT.PREVIEW', 'Live Slip Preview', 'معاينة الإيصال المباشرة', 'PrintFormat', 'Live preview title', 'ACTIVE'),
    ('TRN-519', 'FORMAT.FONT_SIZE', 'Font Size', 'حجم الخط', 'PrintFormat', 'Font size dropdown label', 'ACTIVE'),
    ('TRN-520', 'FORMAT.FONT_SIZE_LARGE', 'Large (Recommended)', 'كبير (موصى به)', 'PrintFormat', 'Large font size option', 'ACTIVE'),
    ('TRN-521', 'FORMAT.FONT_SIZE_XLARGE', 'Extra Large', 'كبير جداً', 'PrintFormat', 'Extra large font size option', 'ACTIVE'),
    ('TRN-522', 'FORMAT.FONT_SIZE_MEDIUM', 'Medium / Standard', 'متوسط / قياسي', 'PrintFormat', 'Medium font size option', 'ACTIVE'),
    ('TRN-523', 'FORMAT.FONT_SIZE_SMALL', 'Small / Compact', 'صغير / مضغوط', 'PrintFormat', 'Small font size option', 'ACTIVE'),
    ('TRN-540', 'FORMAT.FONT_FAMILY', 'Font Family', 'نوع الخط', 'PrintFormat', 'Font family dropdown label', 'ACTIVE'),
    ('TRN-541', 'FORMAT.FONT_STYLE', 'Font Style & Weight', 'نمط وسمك الخط', 'PrintFormat', 'Font style dropdown label', 'ACTIVE'),
    ('TRN-542', 'FORMAT.FONT_MONOSPACE', 'Monospace / Courier (Standard)', 'أحادي المسافة / كوريير (قياسي)', 'PrintFormat', 'Monospace option', 'ACTIVE'),
    ('TRN-543', 'FORMAT.FONT_SANS', 'Sans-Serif / Clean (Modern)', 'سان سيريف / عصري', 'PrintFormat', 'Sans serif option', 'ACTIVE'),
    ('TRN-544', 'FORMAT.FONT_CONSOLAS', 'Consolas / High Density', 'كونسولاس / عالي الكثافة', 'PrintFormat', 'Consolas option', 'ACTIVE'),
    ('TRN-545', 'FORMAT.FONT_ROBOTO', 'Roboto / Clean Crisp', 'روبوتو / عالي الوضوح', 'PrintFormat', 'Roboto option', 'ACTIVE'),
    ('TRN-546', 'FORMAT.STYLE_BOLD', 'Bold (High Contrast - Recommended)', 'عريض (عالي التباين - موصى به)', 'PrintFormat', 'Bold style option', 'ACTIVE'),
    ('TRN-547', 'FORMAT.STYLE_BLACK', 'Black / Extra Bold (Max Ink)', 'داكن جداً / حبر عالي', 'PrintFormat', 'Black style option', 'ACTIVE'),
    ('TRN-548', 'FORMAT.STYLE_NORMAL', 'Regular / Normal', 'عادي / قياسي', 'PrintFormat', 'Regular style option', 'ACTIVE'),
    ('TRN-601', 'RIGHTS.TITLE', 'User Rights & Role Permissions', 'إدارة صلاحيات وأذونات الأدوار', 'Rights', 'Rights page title', 'ACTIVE'),
    ('TRN-602', 'RIGHTS.SUBTITLE', 'Configure role-based security access matrix across modules, actions, print and export functions.', 'إدارة مصفوفة الأمان وصلاحيات الوصول للأدوار عبر الشاشات والعمليات والطباعة والتصدير.', 'Rights', 'Rights page subtitle', 'ACTIVE'),
    ('TRN-603', 'RIGHTS.SELECT_ROLE', 'Select Role', 'اختر الدور الوظيفي', 'Rights', 'Role selector label', 'ACTIVE'),
    ('TRN-604', 'RIGHTS.MODULE', 'Module / Screen', 'الوحدة / الشاشة', 'Rights', 'Module column header', 'ACTIVE'),
    ('TRN-605', 'RIGHTS.VIEW', 'View', 'عرض', 'Rights', 'Can view action header', 'ACTIVE'),
    ('TRN-606', 'RIGHTS.ADD', 'Add', 'إضافة', 'Rights', 'Can add action header', 'ACTIVE'),
    ('TRN-607', 'RIGHTS.EDIT', 'Edit', 'تعديل', 'Rights', 'Can edit action header', 'ACTIVE'),
    ('TRN-608', 'RIGHTS.DELETE', 'Delete', 'حذف', 'Rights', 'Can delete action header', 'ACTIVE'),
    ('TRN-609', 'RIGHTS.PRINT', 'Print', 'طباعة', 'Rights', 'Can print action header', 'ACTIVE'),
    ('TRN-610', 'RIGHTS.EXPORT', 'Export', 'تصدير', 'Rights', 'Can export action header', 'ACTIVE'),
    ('TRN-611', 'RIGHTS.CANCEL', 'Cancel Bill', 'إلغاء الفواتير', 'Rights', 'Can cancel action header', 'ACTIVE'),
    ('TRN-612', 'RIGHTS.EXECUTE', 'Execute/Close', 'تنفيذ الإغلاق', 'Rights', 'Can execute action header', 'ACTIVE'),
    ('TRN-613', 'MESSAGE.ACCESS_DENIED', 'Access Denied: You do not have permission to perform this action.', 'تم رفض الوصول: ليس لديك الصلاحية اللازمة لتنفيذ هذه العملية.', 'Common', 'Access denied message', 'ACTIVE'),
    ('TRN-614', 'SETTLEMENT.TITLE', 'SETTLEMENT RECEIPT', 'إيصال تسوية نهائية وتصفية حساب', 'Settlement', 'Settlement receipt title banner', 'ACTIVE'),
    ('TRN-615', 'BILLS.DUPLICATE_TITLE', 'DUPLICATE BILL', 'فاتورة مكررة', 'Bills', 'Duplicate bill title banner', 'ACTIVE'),
    ('TRN-616', 'BILLS.CANCEL_TITLE', 'CANCELLED BILL (VOID)', 'فاتورة ملغاة', 'Bills', 'Cancelled bill title banner', 'ACTIVE'),
    ('TRN-617', 'POS.OFFICIAL_RECEIPT', 'OFFICIAL RECEIPT', 'إيصال تأجير رسمي', 'POS', 'Official receipt title banner', 'ACTIVE'),
    ('TRN-618', 'INVOICE.NUMBER', 'Invoice No:', 'رقم الفاتورة:', 'Receipt', 'Invoice number label', 'ACTIVE'),
    ('TRN-619', 'COMMON.DATE', 'Date & Time:', 'التاريخ والوقت:', 'Common', 'Date and time label', 'ACTIVE'),
    ('TRN-620', 'COMMON.CUSTOMER', 'Customer:', 'العميل:', 'Common', 'Customer label', 'ACTIVE'),
    ('TRN-621', 'COMMON.MOBILE', 'Mobile:', 'الهاتف:', 'Common', 'Mobile label', 'ACTIVE'),
    ('TRN-622', 'CAR.VEHICLE', 'Vehicle:', 'السيارة:', 'Fleet', 'Vehicle label', 'ACTIVE'),
    ('TRN-623', 'POS.DURATION', 'Duration:', 'المدة:', 'POS', 'Duration label', 'ACTIVE'),
    ('TRN-624', 'POS.DEPOSIT_AMOUNT', 'Deposit Paid:', 'المبلغ المدفوع مقدماً:', 'POS', 'Deposit paid label', 'ACTIVE'),
    ('TRN-625', 'POS.EXTRA_CHARGE', 'Extra Duration Fee:', 'رسوم الوقت الإضافي:', 'POS', 'Extra charge label', 'ACTIVE'),
    ('TRN-626', 'POS.FINAL_TOTAL', 'TOTAL CHARGE:', 'إجمالي المبلغ المستحق:', 'POS', 'Final total label', 'ACTIVE'),
    ('TRN-627', 'POS.CHANGE_TO_RETURN', 'CHANGE RETURNED:', 'المتبقي المرجع للعميل:', 'POS', 'Change returned label', 'ACTIVE'),
    ('TRN-628', 'POS.KNET_CARD', 'KNET / CARD', 'كي نت / بطاقة', 'POS', 'Card payment label', 'ACTIVE'),
    ('TRN-629', 'COMMON.CASHIER', 'Cashier:', 'الكاشير:', 'Common', 'Cashier label', 'ACTIVE'),
    ('TRN-630', 'PRINTER.LANGUAGE', 'Language:', 'اللغة:', 'Printer', 'Language label', 'ACTIVE'),
    ('TRN-631', 'BILLS.CANCEL_REASON', 'Cancellation Details:', 'تفاصيل الإلغاء:', 'Bills', 'Cancel details label', 'ACTIVE'),
    ('TRN-632', 'BILLS.REASON', 'Reason:', 'السبب:', 'Bills', 'Reason label', 'ACTIVE'),
    ('TRN-633', 'BILLS.REMARKS', 'Remarks:', 'ملاحظات:', 'Bills', 'Remarks label', 'ACTIVE'),
    ('TRN-634', 'BILLS.CANCELLED_BY', 'Cancelled By:', 'أُلغيت بواسطة:', 'Bills', 'Cancelled by label', 'ACTIVE')
ON CONFLICT (translation_key) DO UPDATE
SET english_text = EXCLUDED.english_text,
    arabic_text = EXCLUDED.arabic_text,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Printer Settings & Master Seed (Comprehensive Network Hardware Profiles)
INSERT INTO printer_settings (id, printer_name, interface_type, ip_address, port, branch_id, branch_name, location_id, location_name, terminal, printer_type, print_type, paper_width, encoding, auto_cut, cash_drawer, is_active) VALUES
    ('PRN-101', 'Counter 1 Thermal Printer', 'LAN', '192.168.1.200', 9100, 'BRN-101', 'Kiddie Kruzzer', 'LOC-101', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-1', 'ESC/POS', 'ALL', '80mm', 'CP864', true, true, true),
    ('PRN-102', 'Counter 2 Thermal Printer', 'LAN', '192.168.1.201', 9100, 'BRN-101', 'Kiddie Kruzzer', 'LOC-101', 'Avenues Mall -Phase -4- Gate 25', 'POS-Terminal-2', 'ESC/POS', 'ALL', '80mm', 'CP864', true, false, true),
    ('PRN-104', 'Virtual POS Simulator Printer', 'VIRTUAL', '127.0.0.1', 9100, 'BRN-101', 'Kiddie Kruzzer', 'LOC-101', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ESC/POS', 'ALL', '80mm', 'CP864', true, false, true)
ON CONFLICT (id) DO UPDATE
SET printer_name = EXCLUDED.printer_name,
    interface_type = EXCLUDED.interface_type,
    ip_address = EXCLUDED.ip_address,
    port = EXCLUDED.port,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    location_id = EXCLUDED.location_id,
    location_name = EXCLUDED.location_name,
    terminal = EXCLUDED.terminal,
    printer_type = EXCLUDED.printer_type,
    print_type = EXCLUDED.print_type,
    paper_width = EXCLUDED.paper_width,
    encoding = EXCLUDED.encoding,
    auto_cut = EXCLUDED.auto_cut,
    cash_drawer = EXCLUDED.cash_drawer,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Print Format Master Seed (Bilingual, Arabic & English Layouts)
INSERT INTO print_formats (id, format_name, branch_name, location_name, terminal, printer_id, print_type, language, paper_width, font_size, font_family, font_style, header_title, header_subtitle, show_logo, show_company_header, show_branch_info, show_customer_info, show_car_details, show_pricing_breakdown, show_payment_method, show_cashier, show_barcode, footer_notes, terms_conditions, is_default, is_active) VALUES
    ('FMT-SETTLE-BOTH', 'Standard Settlement Format (Bilingual)', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ALL', 'SETTLEMENT', 'BOTH', '80mm', 'LARGE', 'MONOSPACE', 'BOLD', 'KIDDIE KRUZZER', 'Car Rental Tax Invoice / فاتورة ضريبية', true, true, true, true, true, true, true, true, true, 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر', 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق', true, true),
    ('FMT-SETTLE-AR', 'Arabic Only Settlement Format', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ALL', 'SETTLEMENT', 'AR', '80mm', 'LARGE', 'MONOSPACE', 'BOLD', 'كيدي كروزر لتأجير سيارات الأطفال', 'إيصال تسوية نهائية وتصفية حساب', true, true, true, true, true, true, true, true, true, 'شكراً لاختياركم كيدي كروزر!', 'المبلغ غير مسترد بعد مرور 5 دقائق من استلام المركبة', false, true),
    ('FMT-SETTLE-EN', 'English Only Settlement Format', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ALL', 'SETTLEMENT', 'EN', '80mm', 'LARGE', 'MONOSPACE', 'BOLD', 'KIDDIE KRUZZER', 'Rental Settlement Tax Receipt', true, true, true, true, true, true, true, true, true, 'Thank you for choosing Kiddie Kruzzer!', 'Non-refundable after 5 minutes of vehicle departure', false, true),
    ('FMT-RECEIPT-BOTH', 'Standard Start Rental Slip (Bilingual)', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ALL', 'RECEIPT', 'BOTH', '80mm', 'LARGE', 'MONOSPACE', 'BOLD', 'KIDDIE KRUZZER', 'Rental Start Slip / إيصال بدء التأجير', true, true, true, true, true, true, true, true, true, 'Enjoy your ride safely! / استمتع بالقيادة الآمنة', 'Please return vehicle on time to avoid overtime fees', true, true),
    ('FMT-DUPLICATE-BOTH', 'Duplicate Bill Format (Bilingual)', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ALL', 'DUPLICATE', 'BOTH', '80mm', 'LARGE', 'MONOSPACE', 'BOLD', 'KIDDIE KRUZZER', 'DUPLICATE TAX INVOICE / فاتورة مكررة', true, true, true, true, true, true, true, true, true, 'Reprinted for records / نسخة معاد طباعتها', 'Valid duplicate copy for transaction verification', true, true),
    ('FMT-CANCEL-BOTH', 'Cancelled Bill Slip (Bilingual)', 'Kiddie Kruzzer', 'Avenues Mall -Phase -4- Gate 25', 'ALL', 'ALL', 'CANCELLED', 'BOTH', '80mm', 'LARGE', 'MONOSPACE', 'BOLD', 'KIDDIE KRUZZER', 'VOID / CANCELLED BILL / فاتورة ملغاة', true, true, true, true, true, true, true, true, false, 'Transaction Voided / تم إلغاء المعاملة واسترداد المبلغ', 'Audited cancellation record', true, true)
ON CONFLICT (id) DO UPDATE
SET format_name = EXCLUDED.format_name,
    language = EXCLUDED.language,
    paper_width = EXCLUDED.paper_width,
    font_size = EXCLUDED.font_size,
    font_family = EXCLUDED.font_family,
    font_style = EXCLUDED.font_style,
    header_title = EXCLUDED.header_title,
    header_subtitle = EXCLUDED.header_subtitle,
    show_logo = EXCLUDED.show_logo,
    show_company_header = EXCLUDED.show_company_header,
    show_branch_info = EXCLUDED.show_branch_info,
    show_customer_info = EXCLUDED.show_customer_info,
    show_car_details = EXCLUDED.show_car_details,
    show_pricing_breakdown = EXCLUDED.show_pricing_breakdown,
    show_payment_method = EXCLUDED.show_payment_method,
    show_cashier = EXCLUDED.show_cashier,
    show_barcode = EXCLUDED.show_barcode,
    footer_notes = EXCLUDED.footer_notes,
    terms_conditions = EXCLUDED.terms_conditions,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Role Permissions Seed (Enterprise RBAC Matrix)
-- 1. ADMIN: Full access to everything
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute) VALUES
    ('ADMIN', 'POS', true, true, true, true, true, true, true, true),
    ('ADMIN', 'BILLS_DUPLICATE', true, true, true, true, true, true, true, true),
    ('ADMIN', 'BILLS_CANCEL', true, true, true, true, true, true, true, true),
    ('ADMIN', 'SHIFT_CLOSE', true, true, true, true, true, true, true, true),
    ('ADMIN', 'DAY_CLOSE', true, true, true, true, true, true, true, true),
    ('ADMIN', 'COMPANY', true, true, true, true, true, true, true, true),
    ('ADMIN', 'BRANCH', true, true, true, true, true, true, true, true),
    ('ADMIN', 'LOCATION', true, true, true, true, true, true, true, true),
    ('ADMIN', 'USER', true, true, true, true, true, true, true, true),
    ('ADMIN', 'USER_RIGHTS', true, true, true, true, true, true, true, true),
    ('ADMIN', 'CAR_MODEL', true, true, true, true, true, true, true, true),
    ('ADMIN', 'CAR', true, true, true, true, true, true, true, true),
    ('ADMIN', 'RATE', true, true, true, true, true, true, true, true),
    ('ADMIN', 'GRACE_PERIOD', true, true, true, true, true, true, true, true),
    ('ADMIN', 'TRANSLATIONS', true, true, true, true, true, true, true, true),
    ('ADMIN', 'PRINTER_MASTER', true, true, true, true, true, true, true, true),
    ('ADMIN', 'PRINT_FORMAT_MASTER', true, true, true, true, true, true, true, true),
    ('ADMIN', 'MASTER_EXPORT', true, true, true, true, true, true, true, true),
    ('ADMIN', 'PERIODIC_REPORT', true, true, true, true, true, true, true, true),
    ('ADMIN', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, true, true, true, true, true, true, false),
    ('ADMIN', 'REPORTS', true, true, true, true, true, true, true, true)
ON CONFLICT (role, module) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_print = EXCLUDED.can_print,
    can_export = EXCLUDED.can_export,
    can_cancel = EXCLUDED.can_cancel,
    can_execute = EXCLUDED.can_execute,
    updated_at = CURRENT_TIMESTAMP;

-- 2. MANAGER: Operational management, can cancel bills, close shifts/days, view/edit masters, no hard deletes
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute) VALUES
    ('MANAGER', 'POS', true, true, true, false, true, true, true, true),
    ('MANAGER', 'BILLS_DUPLICATE', true, false, false, false, true, true, false, false),
    ('MANAGER', 'BILLS_CANCEL', true, false, false, false, true, true, true, false),
    ('MANAGER', 'SHIFT_CLOSE', true, true, true, false, true, true, false, true),
    ('MANAGER', 'DAY_CLOSE', true, true, true, false, true, true, false, true),
    ('MANAGER', 'COMPANY', true, false, true, false, true, true, false, false),
    ('MANAGER', 'BRANCH', true, false, true, false, true, true, false, false),
    ('MANAGER', 'LOCATION', true, false, true, false, true, true, false, false),
    ('MANAGER', 'USER', true, false, false, false, true, true, false, false),
    ('MANAGER', 'USER_RIGHTS', true, false, false, false, true, false, false, false),
    ('MANAGER', 'CAR_MODEL', true, true, true, false, true, true, false, false),
    ('MANAGER', 'CAR', true, true, true, false, true, true, false, false),
    ('MANAGER', 'RATE', true, true, true, false, true, true, false, false),
    ('MANAGER', 'GRACE_PERIOD', true, false, true, false, true, true, false, false),
    ('MANAGER', 'TRANSLATIONS', true, false, false, false, true, true, false, false),
    ('MANAGER', 'PRINTER_MASTER', true, true, true, false, true, true, false, false),
    ('MANAGER', 'PRINT_FORMAT_MASTER', true, true, true, false, true, true, false, false),
    ('MANAGER', 'MASTER_EXPORT', true, false, false, false, true, true, false, false),
    ('MANAGER', 'PERIODIC_REPORT', true, false, false, false, true, true, false, true),
    ('MANAGER', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, false, false, false, true, true, false, false),
    ('MANAGER', 'REPORTS', true, false, false, false, true, true, false, false)
ON CONFLICT (role, module) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_print = EXCLUDED.can_print,
    can_export = EXCLUDED.can_export,
    can_cancel = EXCLUDED.can_cancel,
    can_execute = EXCLUDED.can_execute,
    updated_at = CURRENT_TIMESTAMP;

-- 3. STAFF / CASHIER: POS Front counter cashier operations only
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute) VALUES
    ('STAFF', 'POS', true, true, true, false, true, false, false, true),
    ('STAFF', 'BILLS_DUPLICATE', true, false, false, false, true, false, false, false),
    ('STAFF', 'BILLS_CANCEL', true, false, false, false, false, false, false, false),
    ('STAFF', 'SHIFT_CLOSE', true, true, false, false, true, false, false, true),
    ('STAFF', 'DAY_CLOSE', true, false, false, false, true, false, false, false),
    ('STAFF', 'COMPANY', false, false, false, false, false, false, false, false),
    ('STAFF', 'BRANCH', false, false, false, false, false, false, false, false),
    ('STAFF', 'LOCATION', false, false, false, false, false, false, false, false),
    ('STAFF', 'USER', false, false, false, false, false, false, false, false),
    ('STAFF', 'USER_RIGHTS', false, false, false, false, false, false, false, false),
    ('STAFF', 'CAR_MODEL', true, false, false, false, false, false, false, false),
    ('STAFF', 'CAR', true, false, false, false, false, false, false, false),
    ('STAFF', 'RATE', true, false, false, false, false, false, false, false),
    ('STAFF', 'GRACE_PERIOD', false, false, false, false, false, false, false, false),
    ('STAFF', 'TRANSLATIONS', false, false, false, false, false, false, false, false),
    ('STAFF', 'PRINTER_MASTER', false, false, false, false, false, false, false, false),
    ('STAFF', 'PRINT_FORMAT_MASTER', false, false, false, false, false, false, false, false),
    ('STAFF', 'MASTER_EXPORT', false, false, false, false, false, false, false, false),
    ('STAFF', 'PERIODIC_REPORT', false, false, false, false, true, false, false, false),
    ('STAFF', 'SHIFT_CLOSING_SUPERVISOR_AUTH', true, false, false, false, true, false, false, true),
    ('STAFF', 'REPORTS', false, false, false, false, false, false, false, false)
ON CONFLICT (role, module) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_print = EXCLUDED.can_print,
    can_export = EXCLUDED.can_export,
    can_cancel = EXCLUDED.can_cancel,
    can_execute = EXCLUDED.can_execute,
    updated_at = CURRENT_TIMESTAMP;

