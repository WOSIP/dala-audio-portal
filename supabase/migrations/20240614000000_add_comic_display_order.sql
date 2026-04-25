-- Add display_order column to comics table
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Initialize display_order based on created_at for existing records
-- We use a CTE to calculate the row number per album
WITH initial_ordering AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY album_id ORDER BY created_at ASC) as new_order
  FROM public.comics
)
UPDATE public.comics
SET display_order = initial_ordering.new_order
FROM initial_ordering
WHERE public.comics.id = initial_ordering.id;

-- Ensure high-level roles can still manage the table (policies should already cover this but good to be safe)
-- The existing 'High-level roles comic management' policy uses FOR ALL, so it should include the new column.