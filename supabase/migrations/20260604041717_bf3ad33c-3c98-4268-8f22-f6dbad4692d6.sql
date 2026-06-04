
CREATE OR REPLACE FUNCTION public.admin_cron_status()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run_started timestamptz,
  last_run_ended timestamptz,
  last_status text,
  last_return_message text,
  last_http_status integer,
  last_http_error text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH last_runs AS (
    SELECT DISTINCT ON (r.jobid)
      r.jobid,
      r.start_time,
      r.end_time,
      r.status,
      r.return_message
    FROM cron.job_run_details r
    ORDER BY r.jobid, r.start_time DESC
  ),
  last_http AS (
    SELECT id, status_code, error_msg, created
    FROM net._http_response
    ORDER BY created DESC
    LIMIT 1
  )
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active,
    lr.start_time,
    lr.end_time,
    lr.status::text,
    lr.return_message::text,
    lh.status_code,
    lh.error_msg::text
  FROM cron.job j
  LEFT JOIN last_runs lr ON lr.jobid = j.jobid
  LEFT JOIN last_http lh ON true
  ORDER BY j.jobid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cron_status() TO authenticated;
