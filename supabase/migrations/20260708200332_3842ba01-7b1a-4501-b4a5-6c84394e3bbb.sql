
ALTER TABLE public.addon_settings
  ADD COLUMN IF NOT EXISTS require_user_key boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.addon_settings.require_user_key IS
  'When true, users subscribed to this add-on must configure their own AI API key (BYOK). When false, the system-wide keys are used.';
