
-- Configurações da landing (linha única)
CREATE TABLE public.horoscope_landing_settings (
  id BOOLEAN NOT NULL DEFAULT true PRIMARY KEY CHECK (id = true),
  enabled BOOLEAN NOT NULL DEFAULT true,
  trial_days INTEGER NOT NULL DEFAULT 7,
  whatsapp_number_e164 TEXT NOT NULL DEFAULT '',
  activation_keyword TEXT NOT NULL DEFAULT 'ATIVAR',
  hero_title TEXT NOT NULL DEFAULT 'Receba seu Horóscopo Diário no WhatsApp — 7 dias grátis',
  hero_subtitle TEXT NOT NULL DEFAULT 'Toda manhã, uma leitura astrológica personalizada do seu signo direto no seu celular. Sem cartão, sem compromisso.',
  consent_text TEXT NOT NULL DEFAULT 'Concordo em receber mensagens diárias do meu horóscopo por WhatsApp e e-mail. Posso cancelar a qualquer momento respondendo SAIR. Li e aceito a Política de Privacidade.',
  confirmation_reply TEXT NOT NULL DEFAULT '✨ Cadastro confirmado! A partir de amanhã, você receberá seu horóscopo diário aqui por 7 dias grátis. Para cancelar a qualquer momento, responda SAIR.',
  success_message TEXT NOT NULL DEFAULT 'Falta só um passo: envie a mensagem no WhatsApp para confirmar seu cadastro. Assim que recebermos, você começa a receber o horóscopo amanhã de manhã.',
  cta_button_label TEXT NOT NULL DEFAULT 'Concluir cadastro no WhatsApp',
  trial_end_message TEXT NOT NULL DEFAULT '🌟 Seus 7 dias grátis terminaram. Gostou? Continue recebendo seu horóscopo diário assinando o Código Cósmico.',
  trial_end_link TEXT NOT NULL DEFAULT 'https://meumapas.lovable.app/addons',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.horoscope_landing_settings TO authenticated;
GRANT ALL ON public.horoscope_landing_settings TO service_role;

ALTER TABLE public.horoscope_landing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage horoscope landing settings"
  ON public.horoscope_landing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER horoscope_landing_settings_set_updated_at
  BEFORE UPDATE ON public.horoscope_landing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.horoscope_landing_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

-- Tabela de leads da landing "Horóscopo Diário Grátis"
CREATE TABLE public.horoscope_free_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  birth_date DATE,
  sun_sign TEXT,
  consent_marketing BOOLEAN NOT NULL DEFAULT false,
  consent_text TEXT,
  consent_ip TEXT,
  consent_user_agent TEXT,
  consent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  activation_code TEXT NOT NULL,
  activated_at TIMESTAMPTZ,
  trial_starts_on DATE,
  trial_ends_on DATE,
  trial_days INTEGER NOT NULL DEFAULT 7,
  last_sent_on DATE,
  source TEXT,
  utm JSONB,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX horoscope_free_leads_activation_code_idx ON public.horoscope_free_leads (activation_code);
CREATE INDEX horoscope_free_leads_phone_idx ON public.horoscope_free_leads (phone_e164);
CREATE INDEX horoscope_free_leads_email_idx ON public.horoscope_free_leads (lower(email));
CREATE INDEX horoscope_free_leads_status_idx ON public.horoscope_free_leads (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.horoscope_free_leads TO authenticated;
GRANT ALL ON public.horoscope_free_leads TO service_role;

ALTER TABLE public.horoscope_free_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view free horoscope leads"
  ON public.horoscope_free_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update free horoscope leads"
  ON public.horoscope_free_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete free horoscope leads"
  ON public.horoscope_free_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER horoscope_free_leads_set_updated_at
  BEFORE UPDATE ON public.horoscope_free_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
