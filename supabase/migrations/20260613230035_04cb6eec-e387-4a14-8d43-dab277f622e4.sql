-- Allow public (anon) to read active credit packages for landing page
GRANT SELECT ON public.credit_packages TO anon;

CREATE POLICY "cp_select_public_active" ON public.credit_packages
  FOR SELECT TO anon
  USING (active = true);