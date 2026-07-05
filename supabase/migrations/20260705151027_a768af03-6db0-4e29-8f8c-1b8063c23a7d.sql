ALTER TABLE public.horoscope_subscriptions
  ADD COLUMN IF NOT EXISTS send_local_minute smallint NOT NULL DEFAULT 0;