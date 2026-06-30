
CREATE TABLE IF NOT EXISTS public.product_dispatch_settings (
  id text PRIMARY KEY DEFAULT 'global',
  auto_enabled boolean NOT NULL DEFAULT false,
  delay_minutes integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.product_dispatch_settings TO authenticated;
GRANT ALL ON public.product_dispatch_settings TO service_role;

ALTER TABLE public.product_dispatch_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage dispatch settings" ON public.product_dispatch_settings;
CREATE POLICY "admins manage dispatch settings"
  ON public.product_dispatch_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.product_dispatch_settings (id, auto_enabled, delay_minutes)
  VALUES ('global', false, 5)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_attempts integer NOT NULL DEFAULT 0;
