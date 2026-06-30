CREATE TABLE public.crm_followup_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_template text NOT NULL,
  body_template text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.crm_followup_template_versions TO authenticated;
GRANT ALL ON public.crm_followup_template_versions TO service_role;
ALTER TABLE public.crm_followup_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view versions" ON public.crm_followup_template_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert versions" ON public.crm_followup_template_versions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete versions" ON public.crm_followup_template_versions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX crm_followup_template_versions_created_at_idx
  ON public.crm_followup_template_versions (created_at DESC);