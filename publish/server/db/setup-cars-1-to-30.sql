-- ============================================================================
-- Script to Remove Existing Cars and Insert New Cars Only:
--   Double Seater : Car No 1 to 5   (5 Cars)
--   Single Seater : Car No 6 to 30  (25 Cars)
--   Does NOT change any logic, rates, or charges.
-- ============================================================================

BEGIN;

-- 1. Remove all existing cars from the cars table
DELETE FROM cars;

-- 2. Insert Double Seater Cars (1 to 5) and Single Seater Cars (6 to 30)
INSERT INTO cars (id, car_no, model_id, model, status, battery_level) VALUES
    -- Double Seater (1 to 5)
    ('CAR-001', '1',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-002', '2',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-003', '3',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-004', '4',  'MOD-102', 'Double Seater', 'Available', 100),
    ('CAR-005', '5',  'MOD-102', 'Double Seater', 'Available', 100),

    -- Single Seater (6 to 30)
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
    ('CAR-030', '30', 'MOD-101', 'Single Seater', 'Available', 100);

COMMIT;
