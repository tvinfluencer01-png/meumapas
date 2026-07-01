
-- 1) Extend affiliate_profiles
ALTER TABLE public.affiliate_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS notify_toast boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_subscription jsonb;

-- 2) Materials
CREATE TABLE IF NOT EXISTS public.affiliate_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('video','banner','reel','story','carousel','logo','copy','pdf','training')),
  title text NOT NULL,
  description text,
  url text,
  thumb_url text,
  content text,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_materials TO authenticated;
GRANT ALL ON public.affiliate_materials TO service_role;
ALTER TABLE public.affiliate_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_read_active" ON public.affiliate_materials FOR SELECT TO authenticated USING (active = true OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "materials_admin_all" ON public.affiliate_materials FOR ALL TO authenticated USING (public.has_affiliate_role(auth.uid(),'affiliate_admin')) WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE TRIGGER materials_updated BEFORE UPDATE ON public.affiliate_materials FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- 3) Goals
CREATE TABLE IF NOT EXISTS public.affiliate_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_cents integer,
  target_conversions integer,
  period_start date NOT NULL,
  period_end date NOT NULL,
  reward text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_goals TO authenticated;
GRANT ALL ON public.affiliate_goals TO service_role;
ALTER TABLE public.affiliate_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_read" ON public.affiliate_goals FOR SELECT TO authenticated
  USING (affiliate_id IS NULL OR affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "goals_admin_all" ON public.affiliate_goals FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin')) WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE TRIGGER goals_updated BEFORE UPDATE ON public.affiliate_goals FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- 4) Medals
CREATE TABLE IF NOT EXISTS public.affiliate_medals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum','diamond')),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_medals TO authenticated;
GRANT ALL ON public.affiliate_medals TO service_role;
ALTER TABLE public.affiliate_medals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medals_read" ON public.affiliate_medals FOR SELECT TO authenticated USING (active = true OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "medals_admin_all" ON public.affiliate_medals FOR ALL TO authenticated USING (public.has_affiliate_role(auth.uid(),'affiliate_admin')) WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

CREATE TABLE IF NOT EXISTS public.affiliate_medal_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  medal_id uuid NOT NULL REFERENCES public.affiliate_medals(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, medal_id)
);
GRANT SELECT ON public.affiliate_medal_awards TO authenticated;
GRANT ALL ON public.affiliate_medal_awards TO service_role;
ALTER TABLE public.affiliate_medal_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "awards_read" ON public.affiliate_medal_awards FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "awards_admin_all" ON public.affiliate_medal_awards FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin')) WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- 5) Seed default medals
INSERT INTO public.affiliate_medals (code, name, description, icon, tier, criteria) VALUES
  ('first_sale', 'Primeira Venda', 'Sua primeira conversão como afiliado.', '🏅', 'bronze', '{"conversions":1}'),
  ('ten_sales', '10 Vendas', 'Alcançou 10 conversões.', '🥈', 'silver', '{"conversions":10}'),
  ('hundred_sales', '100 Vendas', 'Alcançou 100 conversões.', '🥇', 'gold', '{"conversions":100}'),
  ('r5k_revenue', 'R$ 5.000 em comissões', 'Total acumulado em comissões pagas.', '💎', 'platinum', '{"paid_cents":500000}'),
  ('r20k_revenue', 'R$ 20.000 em comissões', 'Total acumulado em comissões pagas.', '👑', 'diamond', '{"paid_cents":2000000}')
ON CONFLICT (code) DO NOTHING;
