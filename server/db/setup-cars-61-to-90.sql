-- ============================================================================
-- FLEET UPDATE SCRIPT: Remove existing cars & insert Double (61..65) and Single (66..90)
-- Does NOT modify any charges/rates or application logic
-- ============================================================================

BEGIN;

-- 1. Remove all existing cars from the fleet
DELETE FROM cars;

-- 2. Insert Double Seater (61 to 65) and Single Seater (66 to 90)
INSERT INTO cars (id, car_no, model_id, model, status, battery_level) VALUES
  -- Double Seater: 61 to 65
  ('CAR-061', '61', 'MOD-102', 'Double Seater', 'Available', 100),
  ('CAR-062', '62', 'MOD-102', 'Double Seater', 'Available', 100),
  ('CAR-063', '63', 'MOD-102', 'Double Seater', 'Available', 100),
  ('CAR-064', '64', 'MOD-102', 'Double Seater', 'Available', 100),
  ('CAR-065', '65', 'MOD-102', 'Double Seater', 'Available', 100),

  -- Single Seater: 66 to 90
  ('CAR-066', '66', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-067', '67', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-068', '68', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-069', '69', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-070', '70', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-071', '71', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-072', '72', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-073', '73', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-074', '74', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-075', '75', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-076', '76', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-077', '77', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-078', '78', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-079', '79', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-080', '80', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-081', '81', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-082', '82', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-083', '83', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-084', '84', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-085', '85', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-086', '86', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-087', '87', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-088', '88', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-089', '89', 'MOD-101', 'Single Seater', 'Available', 100),
  ('CAR-090', '90', 'MOD-101', 'Single Seater', 'Available', 100);

COMMIT;

