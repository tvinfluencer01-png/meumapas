DROP POLICY IF EXISTS anon_insert_clicks ON public.affiliate_clicks;
DROP POLICY IF EXISTS anon_insert_conv ON public.affiliate_conversions;
REVOKE INSERT ON public.affiliate_clicks FROM anon, authenticated;
REVOKE INSERT ON public.affiliate_conversions FROM anon, authenticated;