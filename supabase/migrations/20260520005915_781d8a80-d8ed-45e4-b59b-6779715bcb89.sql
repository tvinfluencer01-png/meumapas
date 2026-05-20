
-- 1) Validation trigger: ensure client_profile_id belongs to same user
CREATE OR REPLACE FUNCTION public.validate_report_client_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'reports.user_id cannot be null';
  END IF;

  IF NEW.client_profile_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.client_profiles
      WHERE id = NEW.client_profile_id
        AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'client_profile_id % does not belong to user %', NEW.client_profile_id, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_client_ownership ON public.reports;
CREATE TRIGGER trg_validate_report_client_ownership
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_report_client_ownership();

-- 2) Reinforce RLS policies on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select_own ON public.reports;
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
DROP POLICY IF EXISTS reports_delete_own ON public.reports;
DROP POLICY IF EXISTS reports_update_own ON public.reports;

CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      client_profile_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.client_profiles cp
        WHERE cp.id = reports.client_profile_id
          AND cp.user_id = auth.uid()
      )
    )
  );

CREATE POLICY reports_delete_own ON public.reports
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3) Storage policies for "reports" bucket: folder-scoped per user
DROP POLICY IF EXISTS reports_storage_select_own ON storage.objects;
DROP POLICY IF EXISTS reports_storage_insert_own ON storage.objects;
DROP POLICY IF EXISTS reports_storage_update_own ON storage.objects;
DROP POLICY IF EXISTS reports_storage_delete_own ON storage.objects;

CREATE POLICY reports_storage_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY reports_storage_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY reports_storage_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY reports_storage_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
