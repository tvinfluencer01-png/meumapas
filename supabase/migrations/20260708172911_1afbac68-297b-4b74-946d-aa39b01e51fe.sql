ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS alert_email TEXT,
  ADD COLUMN IF NOT EXISTS alert_whatsapp TEXT;