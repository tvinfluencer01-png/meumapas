-- FASE 4D: Gamificação avançada, ranking em tempo real, níveis/badges dinâmicos

-- 1. Níveis (tiers dinâmicos)
CREATE TABLE public.affiliate_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  min_points integer NOT NULL DEFAULT 0,
  min_revenue_cents bigint NOT NULL DEFAULT 0,
  min_conversions integer NOT NULL DEFAULT 0,
  commission_bonus_bps integer NOT NULL DEFAULT 0,
  color text DEFAULT '#D4AF37',
  icon text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_levels TO authenticated, anon;
GRANT ALL ON public.affiliate_levels TO service_role;
ALTER TABLE public.affiliate_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Levels are viewable by all" ON public.affiliate_levels FOR SELECT USING (true);
CREATE POLICY "Admins manage levels" ON public.affiliate_levels FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_levels_updated BEFORE UPDATE ON public.affiliate_levels
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- 2. Badges (conquistas)
CREATE TABLE public.affiliate_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#D4AF37',
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  points_reward integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_badges TO authenticated, anon;
GRANT ALL ON public.affiliate_badges TO service_role;
ALTER TABLE public.affiliate_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are viewable by all" ON public.affiliate_badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON public.affiliate_badges FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_badges_updated BEFORE UPDATE ON public.affiliate_badges
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- 3. Badges conquistados por afiliado
CREATE TABLE public.affiliate_badge_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.affiliate_badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  context jsonb DEFAULT '{}'::jsonb,
  UNIQUE (affiliate_id, badge_id)
);
CREATE INDEX idx_affiliate_badge_awards_affiliate ON public.affiliate_badge_awards(affiliate_id);
GRANT SELECT ON public.affiliate_badge_awards TO authenticated;
GRANT ALL ON public.affiliate_badge_awards TO service_role;
ALTER TABLE public.affiliate_badge_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates see own badges" ON public.affiliate_badge_awards FOR SELECT
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "Admins manage badge awards" ON public.affiliate_badge_awards FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));

-- 4. Pontos / XP por afiliado
CREATE TABLE public.affiliate_points (
  affiliate_id uuid PRIMARY KEY REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  level_id uuid REFERENCES public.affiliate_levels(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_points TO authenticated;
GRANT ALL ON public.affiliate_points TO service_role;
ALTER TABLE public.affiliate_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates see own points" ON public.affiliate_points FOR SELECT
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "Admins manage points" ON public.affiliate_points FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));

-- 5. Histórico de pontos (auditoria + timeline)
CREATE TABLE public.affiliate_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_points_ledger_affiliate ON public.affiliate_points_ledger(affiliate_id, created_at DESC);
GRANT SELECT ON public.affiliate_points_ledger TO authenticated;
GRANT ALL ON public.affiliate_points_ledger TO service_role;
ALTER TABLE public.affiliate_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates see own point history" ON public.affiliate_points_ledger FOR SELECT
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "Admins manage point history" ON public.affiliate_points_ledger FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));

-- 6. Missões / desafios (semanal, mensal, campanha)
CREATE TABLE public.affiliate_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  mission_type text NOT NULL DEFAULT 'weekly',
  goal_metric text NOT NULL,
  goal_value numeric NOT NULL,
  points_reward integer NOT NULL DEFAULT 0,
  bonus_cents integer NOT NULL DEFAULT 0,
  badge_id uuid REFERENCES public.affiliate_badges(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_missions TO authenticated;
GRANT ALL ON public.affiliate_missions TO service_role;
ALTER TABLE public.affiliate_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Missions viewable by affiliates" ON public.affiliate_missions FOR SELECT USING (true);
CREATE POLICY "Admins manage missions" ON public.affiliate_missions FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_missions_updated BEFORE UPDATE ON public.affiliate_missions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- 7. Progresso das missões
CREATE TABLE public.affiliate_mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.affiliate_missions(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  current_value numeric NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, affiliate_id)
);
CREATE INDEX idx_mission_progress_affiliate ON public.affiliate_mission_progress(affiliate_id);
GRANT SELECT ON public.affiliate_mission_progress TO authenticated;
GRANT ALL ON public.affiliate_mission_progress TO service_role;
ALTER TABLE public.affiliate_mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates see own mission progress" ON public.affiliate_mission_progress FOR SELECT
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "Admins manage mission progress" ON public.affiliate_mission_progress FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_mission_progress_updated BEFORE UPDATE ON public.affiliate_mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- 8. Snapshots do ranking (leaderboard em tempo real)
CREATE TABLE public.affiliate_leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metric text NOT NULL DEFAULT 'revenue',
  rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, period_start, metric)
);
CREATE INDEX idx_leaderboard_period ON public.affiliate_leaderboard_snapshots(period, period_start DESC);
GRANT SELECT ON public.affiliate_leaderboard_snapshots TO authenticated, anon;
GRANT ALL ON public.affiliate_leaderboard_snapshots TO service_role;
ALTER TABLE public.affiliate_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboard is public" ON public.affiliate_leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Admins manage leaderboard" ON public.affiliate_leaderboard_snapshots FOR ALL
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));

-- Seeds default levels
INSERT INTO public.affiliate_levels (slug, name, description, min_points, min_revenue_cents, min_conversions, commission_bonus_bps, color, icon, sort_order)
VALUES
  ('bronze', 'Bronze', 'Ponto de partida da jornada', 0, 0, 0, 0, '#CD7F32', 'medal', 1),
  ('prata', 'Prata', 'Consistência inicial', 500, 100000, 5, 100, '#C0C0C0', 'award', 2),
  ('ouro', 'Ouro', 'Afiliado consolidado', 2000, 500000, 25, 250, '#D4AF37', 'trophy', 3),
  ('platina', 'Platina', 'Alta performance', 5000, 1500000, 75, 400, '#E5E4E2', 'star', 4),
  ('diamante', 'Diamante', 'Elite mundial', 12000, 5000000, 200, 600, '#B9F2FF', 'gem', 5);

INSERT INTO public.affiliate_badges (slug, name, description, icon, color, rarity, points_reward, criteria) VALUES
  ('first_sale', 'Primeira Venda', 'Realizou a primeira venda', 'sparkles', '#D4AF37', 'common', 50, '{"metric":"conversions","gte":1}'),
  ('ten_sales', '10 Vendas', 'Alcançou 10 vendas', 'trending-up', '#D4AF37', 'uncommon', 150, '{"metric":"conversions","gte":10}'),
  ('hundred_sales', '100 Vendas', 'Alcançou 100 vendas', 'crown', '#B9F2FF', 'rare', 800, '{"metric":"conversions","gte":100}'),
  ('revenue_1k', 'R$ 1.000 em receita', 'Gerou R$ 1.000+ em receita', 'coins', '#D4AF37', 'uncommon', 200, '{"metric":"revenue_cents","gte":100000}'),
  ('revenue_10k', 'R$ 10.000 em receita', 'Gerou R$ 10.000+ em receita', 'gem', '#B9F2FF', 'epic', 1000, '{"metric":"revenue_cents","gte":1000000}');
