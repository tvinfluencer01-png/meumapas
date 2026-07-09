
-- Internal service tables: enable RLS and deny all access to anon/authenticated.
-- service_role bypasses RLS and continues to have full access via server functions.

ALTER TABLE public.affiliate_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliate_cache FROM anon, authenticated;
GRANT ALL ON public.affiliate_cache TO service_role;
DROP POLICY IF EXISTS "Deny all client access" ON public.affiliate_cache;
CREATE POLICY "Deny all client access" ON public.affiliate_cache FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.affiliate_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliate_rate_limits FROM anon, authenticated;
GRANT ALL ON public.affiliate_rate_limits TO service_role;
DROP POLICY IF EXISTS "Deny all client access" ON public.affiliate_rate_limits;
CREATE POLICY "Deny all client access" ON public.affiliate_rate_limits FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.affiliate_verification_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliate_verification_codes FROM anon, authenticated;
GRANT ALL ON public.affiliate_verification_codes TO service_role;
DROP POLICY IF EXISTS "Deny all client access" ON public.affiliate_verification_codes;
CREATE POLICY "Deny all client access" ON public.affiliate_verification_codes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
