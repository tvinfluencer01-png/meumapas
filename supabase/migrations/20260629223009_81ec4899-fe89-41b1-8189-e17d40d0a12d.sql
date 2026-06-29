
-- Deduplica mantendo o mais recente
DELETE FROM public.pending_plan_selections a
 USING public.pending_plan_selections b
 WHERE lower(a.email) = lower(b.email)
   AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS pending_plan_selections_email_uniq
  ON public.pending_plan_selections (lower(email));

CREATE OR REPLACE FUNCTION public.pending_plan_selections_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  DELETE FROM public.pending_plan_selections
   WHERE created_at < now() - interval '24 hours';

  SELECT count(*) INTO recent_count
    FROM public.pending_plan_selections
   WHERE created_at > now() - interval '10 minutes';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded for pending plan selections';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pps_rate_limit_trigger ON public.pending_plan_selections;
CREATE TRIGGER pps_rate_limit_trigger
  BEFORE INSERT ON public.pending_plan_selections
  FOR EACH ROW EXECUTE FUNCTION public.pending_plan_selections_rate_limit();
