CREATE TABLE public.crm_followup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('sent','failed','attempt')),
  subject text,
  body text,
  recipient_email text NOT NULL,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_followup_history_lead_idx ON public.crm_followup_history(lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.crm_followup_history TO authenticated;
GRANT ALL ON public.crm_followup_history TO service_role;

ALTER TABLE public.crm_followup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read followup history"
ON public.crm_followup_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert followup history"
ON public.crm_followup_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));