
CREATE TABLE IF NOT EXISTS public.crm_followup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  days_after_lead integer NOT NULL DEFAULT 1,
  days_after_last_email integer NOT NULL DEFAULT 3,
  max_followups integer NOT NULL DEFAULT 4,
  subject_template text NOT NULL DEFAULT 'Ainda pensando no seu {{produto}}?',
  body_template text NOT NULL DEFAULT 'Olá {{nome}},

Notamos que você se interessou pelo {{produto}} mas não concluiu a compra. Estamos à disposição para tirar dúvidas.

Caso queira finalizar, é só responder este e-mail.

Abraços,
Equipe Código Cósmico',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_settings TO authenticated;
GRANT ALL ON public.crm_followup_settings TO service_role;

ALTER TABLE public.crm_followup_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage crm followup settings" ON public.crm_followup_settings;
CREATE POLICY "Admins manage crm followup settings" ON public.crm_followup_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_crm_followup_settings_updated_at ON public.crm_followup_settings;
CREATE TRIGGER trg_crm_followup_settings_updated_at
  BEFORE UPDATE ON public.crm_followup_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS last_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_paused boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS crm_leads_next_followup_idx
  ON public.crm_leads (next_followup_at)
  WHERE status IN ('new','contacted','negotiating') AND followup_paused = false;
