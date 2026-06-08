CREATE POLICY "charts_update_own" ON public.astro_charts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "num_update_own" ON public.numerology_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.admin_cron_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_cron_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_cron_status() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cron_status() TO service_role;