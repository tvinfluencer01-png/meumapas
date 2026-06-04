
CREATE TABLE public.addon_settings (
  addon_id text PRIMARY KEY,
  name text,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_cents integer,
  prompt text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_settings TO authenticated;
GRANT ALL ON public.addon_settings TO service_role;

ALTER TABLE public.addon_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addon_settings_select_authenticated"
  ON public.addon_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "addon_settings_insert_admin"
  ON public.addon_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "addon_settings_update_admin"
  ON public.addon_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "addon_settings_delete_admin"
  ON public.addon_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER addon_settings_set_updated_at
  BEFORE UPDATE ON public.addon_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
