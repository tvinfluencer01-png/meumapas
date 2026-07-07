ALTER TABLE public.horoscope_free_leads
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_confirmation_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_error text;

CREATE INDEX IF NOT EXISTS idx_horoscope_free_leads_confirmation_pending
  ON public.horoscope_free_leads (status, confirmation_sent_at, created_at DESC);