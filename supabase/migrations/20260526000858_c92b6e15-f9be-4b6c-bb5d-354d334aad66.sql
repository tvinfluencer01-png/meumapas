ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_kind_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_kind_check
  CHECK (kind = ANY (ARRAY['personality','love','career','spiritual','finance','family','health','friendships','business']));