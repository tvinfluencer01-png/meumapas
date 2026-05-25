
CREATE TABLE IF NOT EXISTS public.evolution_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  base_url text,
  global_api_key text,
  instance_name text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evolution_settings_singleton CHECK (id = true)
);

INSERT INTO public.evolution_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.evolution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evo_select_admin" ON public.evolution_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "evo_insert_admin" ON public.evolution_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "evo_update_admin" ON public.evolution_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER evolution_settings_set_updated_at
  BEFORE UPDATE ON public.evolution_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
