CREATE OR REPLACE FUNCTION public.admin_run_cron_job_now(p_jobid bigint)
 RETURNS TABLE(status text, return_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
DECLARE
    v_job_run_id bigint;
BEGIN
    -- Triggers the job manually
    v_job_run_id := cron.schedule_run(p_jobid);
    
    -- Wait a bit for execution to finish (it's usually fast for HTTP hooks)
    -- In a real production environment with long tasks, we might need a different polling strategy
    -- but for simple hooks this works well for immediate feedback.
    PERFORM pg_sleep(1.5);

    RETURN QUERY
    SELECT r.status::text, r.return_message::text
    FROM cron.job_run_details r
    WHERE r.runid = v_job_run_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_run_cron_job_now(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_run_cron_job_now(bigint) TO service_role;