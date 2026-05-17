CREATE TABLE IF NOT EXISTS public.mercado_pago_settings (
  id boolean NOT NULL PRIMARY KEY DEFAULT true,
  public_key text,
  access_token text,
  webhook_secret text,
  environment text NOT NULL DEFAULT 'sandbox',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT single_row_mp CHECK (id = true)
);

INSERT INTO public.mercado_pago_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.mercado_pago_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_select_admin" ON public.mercado_pago_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mp_insert_admin" ON public.mercado_pago_settings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mp_update_admin" ON public.mercado_pago_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mp_set_updated_at
  BEFORE UPDATE ON public.mercado_pago_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();