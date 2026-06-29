
ALTER TABLE public.horoscope_subscriptions
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS send_local_hour smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS send_weekday smallint;

ALTER TABLE public.horoscope_subscriptions
  DROP CONSTRAINT IF EXISTS horoscope_subscriptions_frequency_check;
ALTER TABLE public.horoscope_subscriptions
  ADD CONSTRAINT horoscope_subscriptions_frequency_check
  CHECK (frequency IN ('daily','weekly','alternate'));
