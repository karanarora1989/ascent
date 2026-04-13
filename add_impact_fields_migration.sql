-- Migration: Add detailed impact prediction fields to work_items table
-- Run this in your Supabase SQL Editor

-- Add new columns for detailed impact metrics
ALTER TABLE public.work_items
ADD COLUMN IF NOT EXISTS predicted_disbursements_cr DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS predicted_margin_pct DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS predicted_provisions_cr DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS predicted_compliance_count INTEGER,
ADD COLUMN IF NOT EXISTS predicted_compliance_pct DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN public.work_items.predicted_disbursements_cr IS 'Predicted disbursements in crores from TrueProblem analysis';
COMMENT ON COLUMN public.work_items.predicted_margin_pct IS 'Predicted margin percentage from TrueProblem analysis';
COMMENT ON COLUMN public.work_items.predicted_provisions_cr IS 'Predicted provisions in crores from TrueProblem analysis';
COMMENT ON COLUMN public.work_items.predicted_compliance_count IS 'Number of compliance items from TrueProblem analysis';
COMMENT ON COLUMN public.work_items.predicted_compliance_pct IS 'Compliance percentage from TrueProblem analysis';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_items'
  AND column_name IN (
    'predicted_disbursements_cr',
    'predicted_margin_pct',
    'predicted_provisions_cr',
    'predicted_compliance_count',
    'predicted_compliance_pct'
  )
ORDER BY column_name;
