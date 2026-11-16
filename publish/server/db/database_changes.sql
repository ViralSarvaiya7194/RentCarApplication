-- ==============================================================================
-- KIDDIE KRUZZER POS - POSTGRESQL DATABASE MIGRATION & CHANGES SCRIPT
-- Database: rental_car_db (PostgreSQL 14+)
-- Description: Idempotent script applying all schema enhancements, new tables,
--              column alterations, constraints, indexes, and initial seeds.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SHIFTS TABLE (Dynamic Shift Management)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(50) PRIMARY KEY,
    shift_number INTEGER NOT NULL DEFAULT 1,
    business_date VARCHAR(20) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    cashier_name VARCHAR(100) NOT NULL DEFAULT 'Cashier',
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

-- Upgrade column types if upgrading from legacy schema
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

-- ------------------------------------------------------------------------------
-- 2. RENTALS TABLE (Settlement, Deposits, Refunds, Discounts & Shifts)
-- ------------------------------------------------------------------------------
-- Drop foreign key on rentals.shift_id if type needs change
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
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 3) DEFAULT 0.000;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS change_returned NUMERIC(10, 3) DEFAULT 0.000;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS extra_amount NUMERIC(10, 3) DEFAULT 0.000;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 3) DEFAULT 0.000;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 3) DEFAULT 0.000;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS settlement_remarks TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS reprint_count INTEGER DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(100);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_reason_id VARCHAR(50);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cancellation_remarks TEXT;

-- ------------------------------------------------------------------------------
-- 3. DAY_CLOSES TABLE (Daily Close Summaries)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. AUDIT_LOGS TABLE (Universal Transactional & Operational Audit Trail)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. PRINTER_SETTINGS TABLE (Thermal Printers Master Setup)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS printer_settings (
    id VARCHAR(50) PRIMARY KEY,
    printer_name VARCHAR(255) NOT NULL,
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. PRINT_FORMATS TABLE (Customizable Print Header/Footer/Fonts)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. PRINT_AUDIT_LOGS TABLE (Bill Reprint & Void Print Audit Trail)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 8. ROLE_PERMISSIONS TABLE (User Rights & Security Engine)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
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
    UNIQUE(role, module)
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

-- Seed PERIODIC_REPORT Permissions
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
VALUES 
    ('ADMIN', 'PERIODIC_REPORT', true, true, true, true, true, true, true, true),
    ('MANAGER', 'PERIODIC_REPORT', true, false, false, false, true, true, false, true),
    ('STAFF', 'PERIODIC_REPORT', true, false, false, false, true, true, false, true),
    ('CASHIER', 'PERIODIC_REPORT', true, false, false, false, true, true, false, true)
ON CONFLICT (role, module) DO NOTHING;

-- Seed PRINTER_MASTER & PRINT_FORMAT_MASTER Permissions
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
VALUES 
    ('ADMIN', 'PRINTER_MASTER', true, true, true, true, true, true, true, true),
    ('ADMIN', 'PRINT_FORMAT_MASTER', true, true, true, true, true, true, true, true)
ON CONFLICT (role, module) DO NOTHING;

-- Seed REPORTS Permissions
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
VALUES 
    ('ADMIN', 'REPORTS', true, true, true, true, true, true, true, true),
    ('MANAGER', 'REPORTS', true, false, false, false, true, true, false, false),
    ('STAFF', 'REPORTS', false, false, false, false, false, false, false, false),
    ('CASHIER', 'REPORTS', false, false, false, false, false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. REBRANDING & DEFAULT DATA UPDATES
-- ------------------------------------------------------------------------------
UPDATE companies SET name = 'Your Events Management Company' WHERE id = 'CMP-101' OR name LIKE '%KidsDrive%' OR name LIKE '%Kids Drive%' OR name LIKE '%Kiddie Kruzzer Entertainment%';
UPDATE branches SET name = 'Kiddie Kruzzer', company = 'Your Events Management Company' WHERE id = 'BRN-101' OR company LIKE '%KidsDrive%' OR company LIKE '%Kids Drive%' OR company LIKE '%Kiddie Kruzzer Entertainment%';
UPDATE locations SET name = 'Avenues Mall -Phase -4- Gate 25', branch = 'Kiddie Kruzzer' WHERE id = 'LOC-101' OR name LIKE '%Zone A%' OR name LIKE '%Avenues%';
UPDATE print_formats SET header_title = 'Your Events Management Company' WHERE header_title LIKE '%KIDS DRIVE%' OR header_title LIKE '%KidsDrive%' OR header_title LIKE '%KIDDIE KRUZZER%';
UPDATE print_formats SET footer_notes = 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر' WHERE footer_notes LIKE '%KidsDrive%' OR footer_notes LIKE '%Kids Drive%';
UPDATE translations SET english_text = 'Kiddie Kruzzer POS', arabic_text = 'كيدي كروزر لنقاط البيع' WHERE translation_key IN ('AUTH.APP_TITLE', 'COMMON.APP_NAME');
UPDATE translations SET english_text = 'Thank you for choosing Kiddie Kruzzer!', arabic_text = 'شكراً لاختياركم كيدي كروزر!' WHERE translation_key = 'RECEIPT.THANK_YOU';
