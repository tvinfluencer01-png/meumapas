CREATE TABLE IF NOT EXISTS public.pwa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Código Cósmico',
  short_name text NOT NULL DEFAULT 'Cósmico',
  description text NOT NULL DEFAULT 'Mapa Astral, Numerologia e IA Espiritual',
  theme_color text NOT NULL DEFAULT '#1a1430',
  background_color text NOT NULL DEFAULT '#0a0814',
  icon_url text NOT NULL DEFAULT '',
  icon_512_url text NOT NULL DEFAULT '',
  display text NOT NULL DEFAULT 'standalone',
  start_url text NOT NULL DEFAULT '/',
  orientation text NOT NULL DEFAULT 'portrait',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pwa_settings TO anon, authenticated;
GRANT ALL ON public.pwa_settings TO service_role;

ALTER TABLE public.pwa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PWA settings readable by all"
  ON public.pwa_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage PWA settings"
  ON public.pwa_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.pwa_settings (name) SELECT 'Código Cósmico'
WHERE NOT EXISTS (SELECT 1 FROM public.pwa_settings);