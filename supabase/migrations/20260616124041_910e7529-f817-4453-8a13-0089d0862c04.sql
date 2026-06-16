
-- Restrict app_logs INSERT to authenticated users writing their own row
DROP POLICY IF EXISTS logs_insert_own ON public.app_logs;
CREATE POLICY logs_insert_own ON public.app_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Set fixed search_path on remaining functions
ALTER FUNCTION public.get_table_structure(text) SET search_path = public;
ALTER FUNCTION public.update_system_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.get_public_tables() SET search_path = public;
ALTER FUNCTION public.get_public_enums() SET search_path = public;
