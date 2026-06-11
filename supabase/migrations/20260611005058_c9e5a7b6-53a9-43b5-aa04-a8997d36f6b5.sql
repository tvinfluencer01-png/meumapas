INSERT INTO public.mercado_pago_settings (id, enabled, environment)
VALUES (true, false, 'sandbox')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.mercado_pago_settings TO authenticated;
GRANT ALL ON public.mercado_pago_settings TO service_role;
