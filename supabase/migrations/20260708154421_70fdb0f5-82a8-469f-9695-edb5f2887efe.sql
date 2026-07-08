
-- 1) Leaderboard: restrict SELECT to affiliates or admins
DROP POLICY IF EXISTS "Leaderboard authenticated read" ON public.affiliate_leaderboard_snapshots;
CREATE POLICY "Leaderboard affiliate read"
  ON public.affiliate_leaderboard_snapshots
  FOR SELECT
  TO authenticated
  USING (
    public.current_affiliate_id() IS NOT NULL
    OR public.has_affiliate_role(auth.uid(), 'affiliate_admin')
  );

-- 2) Attach guard trigger on affiliate_profiles to block privilege escalation
DROP TRIGGER IF EXISTS trg_affiliate_profiles_guard ON public.affiliate_profiles;
CREATE TRIGGER trg_affiliate_profiles_guard
  BEFORE INSERT OR UPDATE ON public.affiliate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.affiliate_profiles_guard_privileged_fields();

-- 3) Cookie consent: replace permissive INSERT check with owner-scoped check
DROP POLICY IF EXISTS cookie_consent_insert ON public.affiliate_cookie_consents;
CREATE POLICY cookie_consent_insert
  ON public.affiliate_cookie_consents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );
