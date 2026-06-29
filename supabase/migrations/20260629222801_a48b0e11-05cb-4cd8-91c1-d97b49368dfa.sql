
GRANT SELECT ON public.evolution_settings TO authenticated;
GRANT SELECT ON public.mercado_pago_settings TO authenticated;
GRANT SELECT ON public.smtp_settings TO authenticated;
GRANT SELECT ON public.twilio_settings TO authenticated;

DROP POLICY IF EXISTS "Admins can read evolution_settings" ON public.evolution_settings;
CREATE POLICY "Admins can read evolution_settings" ON public.evolution_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read mercado_pago_settings" ON public.mercado_pago_settings;
CREATE POLICY "Admins can read mercado_pago_settings" ON public.mercado_pago_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read smtp_settings" ON public.smtp_settings;
CREATE POLICY "Admins can read smtp_settings" ON public.smtp_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read twilio_settings" ON public.twilio_settings;
CREATE POLICY "Admins can read twilio_settings" ON public.twilio_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
