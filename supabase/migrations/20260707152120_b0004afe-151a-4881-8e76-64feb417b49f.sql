
ALTER TABLE public.horoscope_paid_subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_horoscope_paid_subs_status_period_end
  ON public.horoscope_paid_subscriptions (status, current_period_end);
