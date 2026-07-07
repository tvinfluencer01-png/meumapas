ALTER TABLE public.horoscope_landing_settings
  ADD COLUMN IF NOT EXISTS send_local_hour smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS send_local_minute smallint NOT NULL DEFAULT 0;