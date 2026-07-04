ALTER TABLE public.report_illustrations
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.report_illustrations
  ALTER COLUMN image_data DROP NOT NULL;