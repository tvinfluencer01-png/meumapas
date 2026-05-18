
-- Table for configurable credit costs per action
CREATE TABLE public.credit_costs (
  action text PRIMARY KEY,
  amount integer NOT NULL CHECK (amount >= 0),
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read costs (UI may want to show pricing)
CREATE POLICY cc_select_authenticated ON public.credit_costs
  FOR SELECT TO authenticated USING (true);

-- Only admins can mutate
CREATE POLICY cc_insert_admin ON public.credit_costs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY cc_update_admin ON public.credit_costs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY cc_delete_admin ON public.credit_costs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults
INSERT INTO public.credit_costs (action, amount, label, description) VALUES
  ('oracle_message', 1, 'Mensagem do Oráculo (IA)', 'Cada pergunta/resposta no chat com a IA'),
  ('report_personality', 5, 'Relatório de Personalidade', 'Geração do PDF de personalidade'),
  ('report_love', 5, 'Relatório de Amor', 'Geração do PDF de amor/relacionamentos'),
  ('report_career', 5, 'Relatório de Carreira', 'Geração do PDF de carreira'),
  ('report_spiritual', 5, 'Relatório Espiritual', 'Geração do PDF espiritual'),
  ('tarot_reading', 2, 'Leitura de Tarot', 'Tiragem de tarot interpretada'),
  ('astro_chart', 3, 'Mapa Astral', 'Geração/cálculo do mapa astral')
ON CONFLICT (action) DO NOTHING;
