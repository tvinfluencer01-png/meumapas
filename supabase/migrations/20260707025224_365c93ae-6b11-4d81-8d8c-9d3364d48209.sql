
ALTER TABLE public.horoscope_landing_settings
  ADD COLUMN IF NOT EXISTS expiry_reminder_minutes_before integer NOT NULL DEFAULT 60
    CHECK (expiry_reminder_minutes_before BETWEEN 1 AND 1440);

ALTER TABLE public.horoscope_free_leads
  ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamptz;
