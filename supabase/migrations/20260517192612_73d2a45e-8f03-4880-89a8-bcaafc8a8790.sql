ALTER TABLE public.pdf_branding
  ADD COLUMN IF NOT EXISTS enabled_personality boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_love boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_career boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled_spiritual boolean NOT NULL DEFAULT true;