-- ============================================================================
-- Script to Remove Existing Cars and Insert New Cars Only:
--   Double Seater : Car No 31 to 35  (5 Cars)
--   Single Seater : Car No 36 to 60  (25 Cars)
--   Does NOT change any logic, rates, or charges.
-- ============================================================================

BEGIN;

-- 1. Remove all existing cars from the cars table
DELETE FROM cars;

-- 2. Insert Double Seater Cars (31 to 35) and Single Seater Cars (36 to 60)
INSERT INTO cars (id, car_no, model_id, model, status, battery_level) VALUES
    -- Double Seater (31 to 35)
    ('CAR-031', '31', 'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-032', '32', 'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-033', '33', 'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-034', '34', 'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-035', '35', 'MOD-102', 'Double Seater', 'Available', 100),

    -- Single Seater (36 to 60)
    ('CAR-036', '36', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-037', '37', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-038', '38', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-039', '39', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-040', '40', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-041', '41', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-042', '42', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-043', '43', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-044', '44', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-045', '45', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-046', '46', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-047', '47', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-048', '48', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-049', '49', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-050', '50', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-051', '51', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-052', '52', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-053', '53', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-054', '54', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-055', '55', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-056', '56', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-057', '57', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-058', '58', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-059', '59', 'MOD-101', 'Single Seater', 'Available', 100),
    ('CAR-060', '60', 'MOD-101', 'Single Seater', 'Available', 100);

COMMIT;

