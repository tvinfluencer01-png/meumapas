ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS ai_providers_config jsonb NOT NULL DEFAULT '{}'::jsonb;