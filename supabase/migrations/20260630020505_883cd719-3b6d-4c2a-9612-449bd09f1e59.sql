
CREATE TABLE public.crm_lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_by_email text,
  source text NOT NULL DEFAULT 'system',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.crm_lead_status_history TO authenticated;
GRANT ALL ON public.crm_lead_status_history TO service_role;

ALTER TABLE public.crm_lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read lead status history"
  ON public.crm_lead_status_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert lead status history"
  ON public.crm_lead_status_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX crm_lead_status_history_lead_idx
  ON public.crm_lead_status_history(lead_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_crm_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_source text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    BEGIN
      v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_uid := NULL;
    END;

    BEGIN
      v_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
    EXCEPTION WHEN OTHERS THEN
      v_email := NULL;
    END;

    BEGIN
      v_source := current_setting('app.lead_status_source', true);
    EXCEPTION WHEN OTHERS THEN
      v_source := NULL;
    END;

    INSERT INTO public.crm_lead_status_history
      (lead_id, from_status, to_status, changed_by, changed_by_email, source, note)
    VALUES
      (NEW.id, OLD.status, NEW.status, v_uid, v_email,
       COALESCE(NULLIF(v_source, ''), 'system'),
       NEW.notes);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_leads_log_status ON public.crm_leads;
CREATE TRIGGER trg_crm_leads_log_status
  AFTER UPDATE OF status ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_lead_status_change();
