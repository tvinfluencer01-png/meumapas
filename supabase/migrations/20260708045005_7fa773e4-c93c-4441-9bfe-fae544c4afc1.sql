DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname AS n
      FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
     WHERE ns.nspname='public' AND c.relkind='r' AND c.relname LIKE 'affiliate_%'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.n);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.n);
  END LOOP;
END $$;

-- Tabelas com policies públicas (leitura anônima legítima usada pelo SDK/tracking)
GRANT SELECT ON public.affiliate_profiles TO anon;
GRANT SELECT ON public.affiliate_links TO anon;
GRANT SELECT ON public.affiliate_settings TO anon;
GRANT SELECT ON public.affiliate_materials TO anon;
GRANT SELECT ON public.affiliate_pixels TO anon;
GRANT SELECT ON public.affiliate_checkout_providers TO anon;
GRANT SELECT ON public.affiliate_products TO anon;
GRANT SELECT ON public.affiliate_coupons TO anon;
GRANT SELECT ON public.affiliate_campaigns TO anon;
GRANT INSERT ON public.affiliate_clicks TO anon;
GRANT INSERT ON public.affiliate_tracking_events TO anon;
GRANT INSERT, SELECT ON public.affiliate_tracking_sessions TO anon;
GRANT INSERT ON public.affiliate_touchpoints TO anon;
GRANT INSERT ON public.affiliate_cookie_consents TO anon;
GRANT INSERT ON public.affiliate_conversions TO anon;
GRANT INSERT ON public.affiliate_event_queue TO anon;
GRANT INSERT ON public.affiliate_webhook_events TO anon;
GRANT INSERT ON public.affiliate_sessions TO anon;