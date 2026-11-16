-- =============================================================================
-- KIDDIE KRUZZER POS - TRANSACTION DATA TRUNCATE / WIPE SCRIPT
-- =============================================================================
-- This script removes all transaction records (rentals, bills, shifts, day closes, 
-- print audit logs) and resets all cars to 'Available' status.
-- Master data (Companies, Branches, Locations, Users, Car Models, Cars, Rates, 
-- Grace Periods, Translations, Printers, Formats, User Rights) is preserved.
-- =============================================================================

BEGIN;

-- 1. Truncate operational and transaction tables with CASCADE
TRUNCATE TABLE rentals CASCADE;
TRUNCATE TABLE shifts CASCADE;
TRUNCATE TABLE day_closes CASCADE;
TRUNCATE TABLE print_audit_logs CASCADE;

-- 2. Reset car fleet operational status to Available
UPDATE cars SET status = 'Available', updated_at = NOW();

-- 3. Reset auto-increment sequences if applicable
ALTER SEQUENCE IF EXISTS day_closes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS print_audit_logs_id_seq RESTART WITH 1;

COMMIT;

-- =============================================================================
-- Verification check
-- =============================================================================
SELECT 'rentals' AS table_name, COUNT(*) AS row_count FROM rentals
UNION ALL
SELECT 'shifts' AS table_name, COUNT(*) AS row_count FROM shifts
UNION ALL
SELECT 'day_closes' AS table_name, COUNT(*) AS row_count FROM day_closes
UNION ALL
SELECT 'print_audit_logs' AS table_name, COUNT(*) AS row_count FROM print_audit_logs
UNION ALL
SELECT 'available_cars' AS table_name, COUNT(*) AS row_count FROM cars WHERE status = 'Available';
