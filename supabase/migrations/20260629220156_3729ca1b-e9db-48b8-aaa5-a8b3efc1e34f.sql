
-- Bloqueia leitura via Data API das tabelas com credenciais sensíveis.
-- Toda manutenção continua via server functions (service_role bypassa RLS/GRANTs).

-- evolution_settings
DROP POLICY IF EXISTS evo_select_admin ON public.evolution_settings;
REVOKE SELECT ON public.evolution_settings FROM authenticated, anon;

-- mercado_pago_settings
DROP POLICY IF EXISTS mp_select_admin ON public.mercado_pago_settings;
REVOKE SELECT ON public.mercado_pago_settings FROM authenticated, anon;

-- smtp_settings
DROP POLICY IF EXISTS "Admins can view smtp settings" ON public.smtp_settings;
REVOKE SELECT ON public.smtp_settings FROM authenticated, anon;

-- twilio_settings
DROP POLICY IF EXISTS twilio_select_admin ON public.twilio_settings;
REVOKE SELECT ON public.twilio_settings FROM authenticated, anon;

-- Garante que service_role mantém acesso total (server functions com supabaseAdmin)
GRANT ALL ON public.evolution_settings TO service_role;
GRANT ALL ON public.mercado_pago_settings TO service_role;
GRANT ALL ON public.smtp_settings TO service_role;
GRANT ALL ON public.twilio_settings TO service_role;
