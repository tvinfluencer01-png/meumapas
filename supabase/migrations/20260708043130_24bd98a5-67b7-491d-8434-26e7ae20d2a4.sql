
-- 1. Retention setting
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS mp_webhook_logs_retention_days integer NOT NULL DEFAULT 30
  CHECK (mp_webhook_logs_retention_days BETWEEN 1 AND 365);

-- 2. Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_mp_webhook_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_deleted integer;
BEGIN
  SELECT COALESCE(mp_webhook_logs_retention_days, 30)
    INTO v_days
    FROM public.system_settings
   WHERE id = 'global';

  IF v_days IS NULL THEN v_days := 30; END IF;

  DELETE FROM public.mp_webhook_logs
   WHERE received_at < now() - make_interval(days => v_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_mp_webhook_logs() FROM PUBLIC, anon, authenticated;

-- 3. Schedule daily at 03:15 UTC (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-mp-webhook-logs') THEN
    PERFORM cron.unschedule('cleanup-mp-webhook-logs');
  END IF;
  PERFORM cron.schedule(
    'cleanup-mp-webhook-logs',
    '15 3 * * *',
    $cron$ SELECT public.cleanup_mp_webhook_logs(); $cron$
  );
END $$;
