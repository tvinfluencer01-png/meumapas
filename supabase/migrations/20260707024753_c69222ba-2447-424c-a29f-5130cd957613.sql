
ALTER TABLE public.horoscope_landing_settings
  ADD COLUMN IF NOT EXISTS retry_after_minutes integer NOT NULL DEFAULT 10 CHECK (retry_after_minutes BETWEEN 1 AND 1440),
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 2 CHECK (max_retries BETWEEN 0 AND 10);

ALTER TABLE public.horoscope_free_leads
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz;
