-- ============================================================================
-- RESET SALES DATE TO TODAY'S DATE
-- Updates CURRENT_SALES_DATE in system_settings to today (YYYY-MM-DD),
-- removes any premature day_closes record for today/future dates so POS is open,
-- and closes any stale OPEN shifts from older dates.
-- ============================================================================

BEGIN;

-- 1. Ensure system_settings table exists
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Reset CURRENT_SALES_DATE to Today's Date (YYYY-MM-DD)
INSERT INTO system_settings (key, value, description, updated_at)
VALUES (
  'CURRENT_SALES_DATE',
  TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
  'Active POS Sales Business Date',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    updated_at = NOW();

-- 3. Remove any day_closes entry for today (or future dates) so today is open for sales
DELETE FROM day_closes
WHERE close_date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

-- 4. Close any leftover OPEN shifts from other dates so today's shift starts cleanly
UPDATE shifts
SET status = 'CLOSED',
    end_time = COALESCE(end_time, NOW()),
    updated_at = NOW()
WHERE status = 'OPEN'
  AND business_date <> TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

COMMIT;

