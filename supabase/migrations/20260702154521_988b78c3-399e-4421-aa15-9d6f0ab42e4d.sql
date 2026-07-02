DROP POLICY IF EXISTS "anon_update_sessions" ON public.affiliate_sessions;
REVOKE UPDATE ON public.affiliate_sessions FROM anon, authenticated;