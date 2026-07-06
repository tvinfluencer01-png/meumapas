
-- 1) Tighten mark_read_aff_notif WITH CHECK
DROP POLICY IF EXISTS mark_read_aff_notif ON public.affiliate_notifications;
CREATE POLICY mark_read_aff_notif ON public.affiliate_notifications
  FOR UPDATE TO authenticated
  USING (
    (to_admin AND has_affiliate_role(auth.uid(), 'affiliate_admin'::affiliate_role))
    OR ((NOT to_admin) AND (affiliate_id = current_affiliate_id()))
  )
  WITH CHECK (
    (to_admin AND has_affiliate_role(auth.uid(), 'affiliate_admin'::affiliate_role))
    OR ((NOT to_admin) AND (affiliate_id = current_affiliate_id()))
  );

-- 2) Tighten anon_upsert_sessions: require the referenced affiliate exists
DROP POLICY IF EXISTS anon_upsert_sessions ON public.affiliate_sessions;
CREATE POLICY anon_upsert_sessions ON public.affiliate_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    affiliate_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.affiliate_profiles ap WHERE ap.id = affiliate_id)
    AND session_token IS NOT NULL
    AND char_length(session_token) BETWEEN 16 AND 128
  );

-- 3) Tighten pps_insert_anon: enforce email format + reasonable plan_slug + rate limit
DROP POLICY IF EXISTS pps_insert_anon ON public.pending_plan_selections;
CREATE POLICY pps_insert_anon ON public.pending_plan_selections
  FOR INSERT TO anon
  WITH CHECK (
    email IS NOT NULL
    AND char_length(email) <= 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND plan_slug IS NOT NULL
    AND char_length(plan_slug) BETWEEN 1 AND 64
    AND public.affiliate_check_rate_limit('pps:' || lower(email), 5, 3600)
  );
