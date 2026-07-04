
-- Restrict affiliate_campaigns SELECT to affiliates & admins
DROP POLICY IF EXISTS read_aff_campaigns ON public.affiliate_campaigns;
CREATE POLICY read_aff_campaigns ON public.affiliate_campaigns
  FOR SELECT TO authenticated
  USING (public.current_affiliate_id() IS NOT NULL OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'::affiliate_role));

-- Restrict affiliate_commission_rules SELECT to affiliates & admins
DROP POLICY IF EXISTS read_aff_rules ON public.affiliate_commission_rules;
CREATE POLICY read_aff_rules ON public.affiliate_commission_rules
  FOR SELECT TO authenticated
  USING (public.current_affiliate_id() IS NOT NULL OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'::affiliate_role));

-- Restrict affiliate_settings SELECT to affiliates & admins
DROP POLICY IF EXISTS read_aff_settings ON public.affiliate_settings;
CREATE POLICY read_aff_settings ON public.affiliate_settings
  FOR SELECT TO authenticated
  USING (public.current_affiliate_id() IS NOT NULL OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'::affiliate_role));

-- Restrict leaderboard snapshots to authenticated users only (no anonymous)
DROP POLICY IF EXISTS "Leaderboard is public" ON public.affiliate_leaderboard_snapshots;
CREATE POLICY "Leaderboard authenticated read" ON public.affiliate_leaderboard_snapshots
  FOR SELECT TO authenticated
  USING (true);
