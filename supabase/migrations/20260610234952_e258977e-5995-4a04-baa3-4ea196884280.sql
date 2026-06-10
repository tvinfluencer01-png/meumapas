CREATE OR REPLACE FUNCTION public.admin_update_cron_job(
  p_jobid bigint,
  p_schedule text DEFAULT NULL,
  p_command text DEFAULT NULL,
  p_active boolean DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
BEGIN
  PERFORM cron.alter_job(
    job_id := p_jobid,
    schedule := p_schedule,
    command := p_command,
    active := p_active
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_cron_job(bigint, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_cron_job(bigint, text, text, boolean) TO service_role;