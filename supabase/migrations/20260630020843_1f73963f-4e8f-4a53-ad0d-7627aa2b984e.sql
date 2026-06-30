
CREATE TABLE public.crm_status_automations (
  status text PRIMARY KEY CHECK (status IN ('contacted','negotiating','converted')),
  email_enabled boolean NOT NULL DEFAULT true,
  email_subject text NOT NULL DEFAULT '',
  email_body text NOT NULL DEFAULT '',
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  whatsapp_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_status_automations TO authenticated;
GRANT ALL ON public.crm_status_automations TO service_role;

ALTER TABLE public.crm_status_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage status automations"
  ON public.crm_status_automations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER crm_status_automations_set_updated_at
  BEFORE UPDATE ON public.crm_status_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.crm_status_automations (status, email_subject, email_body, whatsapp_message, whatsapp_enabled) VALUES
('contacted',
 'Recebemos seu interesse, {{nome}} ✨',
 'Olá {{nome}},\n\nEstamos felizes pelo seu interesse no {{produto}}. Em breve nossa equipe entrará em contato para te ajudar a finalizar.\n\nSe tiver qualquer dúvida, é só responder este e-mail.\n\nAbraços,\nEquipe Código Cósmico',
 'Olá {{nome}}! ✨ Recebemos seu interesse no {{produto}}. Em breve te ajudaremos a finalizar. Qualquer dúvida, é só responder.',
 true),
('negotiating',
 'Vamos finalizar seu {{produto}}, {{nome}}?',
 'Olá {{nome}},\n\nEstamos prontos para concluir seu pedido do {{produto}}. Se precisar de uma condição especial ou tiver dúvidas, responda este e-mail que conversamos.\n\nAbraços,\nEquipe Código Cósmico',
 'Oi {{nome}}! 🌙 Estamos prontos para finalizar seu {{produto}}. Conta pra gente se precisa de ajuda para concluir.',
 true),
('converted',
 'Bem-vindo(a), {{nome}}! Seu {{produto}} está liberado 🎉',
 'Olá {{nome}},\n\nObrigado por confiar em nós! Seu acesso ao {{produto}} já foi liberado. Em breve você receberá todos os detalhes.\n\nQualquer dúvida, estamos à disposição.\n\nAbraços,\nEquipe Código Cósmico',
 'Olá {{nome}}! 🎉 Seu {{produto}} foi liberado. Em instantes você recebe todos os detalhes. Aproveite!',
 true);

ALTER TABLE public.crm_followup_history
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','whatsapp')),
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'scheduled' CHECK (trigger_type IN ('scheduled','status_change','manual'));
