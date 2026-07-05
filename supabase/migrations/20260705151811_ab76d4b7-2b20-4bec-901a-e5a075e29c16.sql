ALTER TABLE public.horoscope_subscriptions
  ADD COLUMN IF NOT EXISTS attempt_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;