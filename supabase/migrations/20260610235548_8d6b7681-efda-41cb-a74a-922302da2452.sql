CREATE OR REPLACE FUNCTION public.admin_run_cron_job_now(p_jobid bigint)
 RETURNS TABLE(status text, return_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron', 'net'
AS $function$
DECLARE
    v_command text;
BEGIN
    SELECT j.command INTO v_command FROM cron.job j WHERE j.jobid = p_jobid;
    
    IF v_command IS NULL THEN
        RETURN QUERY SELECT 'failed'::text, 'Job not found'::text;
        RETURN;
    END IF;

    BEGIN
        EXECUTE v_command;
        RETURN QUERY SELECT 'succeeded'::text, 'Command dispatched successfully. Check job logs for async HTTP results.'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'failed'::text, SQLERRM::text;
    END;
END;
$function$;