-- Tighten pending_plan_selections policies
DROP POLICY IF EXISTS "Anyone can delete pending plan selections" ON public.pending_plan_selections;
DROP POLICY IF EXISTS "Anyone can select pending plan selections by email" ON public.pending_plan_selections;
DROP POLICY IF EXISTS "Anyone can insert pending plan selections" ON public.pending_plan_selections;

-- Anonymous users (pre-signup) may insert their own pending selection
CREATE POLICY "pps_insert_anon" ON public.pending_plan_selections
  FOR INSERT TO anon
  WITH CHECK (email IS NOT NULL AND char_length(email) <= 320);

CREATE POLICY "pps_insert_auth" ON public.pending_plan_selections
  FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Only the authenticated owner (matching email) can read or delete
CREATE POLICY "pps_select_owner" ON public.pending_plan_selections
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "pps_delete_owner" ON public.pending_plan_selections
  FOR DELETE TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Revoke broad anon privileges; keep only INSERT for the pre-signup flow
REVOKE SELECT, UPDATE, DELETE ON public.pending_plan_selections FROM anon;
GRANT INSERT ON public.pending_plan_selections TO anon;
GRANT SELECT, INSERT, DELETE ON public.pending_plan_selections TO authenticated;
GRANT ALL ON public.pending_plan_selections TO service_role;