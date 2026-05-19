ALTER TABLE public.pdf_branding
  ADD COLUMN IF NOT EXISTS enabled_tarot boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_kabbalah boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_numerology boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_astrology boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_kabbalah_numerology boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_energy_calendar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_weekly boolean NOT NULL DEFAULT true;