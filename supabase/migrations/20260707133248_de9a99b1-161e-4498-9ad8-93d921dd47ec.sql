
-- ============= horoscope_plans =============
CREATE TABLE public.horoscope_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('month','quarter','year')),
  interval_months integer NOT NULL CHECK (interval_months > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.horoscope_plans TO anon, authenticated;
GRANT ALL ON public.horoscope_plans TO service_role;
ALTER TABLE public.horoscope_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horoscope_plans_public_active_read"
  ON public.horoscope_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "horoscope_plans_admin_all"
  ON public.horoscope_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER horoscope_plans_set_updated_at
  BEFORE UPDATE ON public.horoscope_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default plans
INSERT INTO public.horoscope_plans
  (slug, name, description, price_cents, billing_cycle, interval_months, features, is_featured, sort_order) VALUES
  ('mensal', 'Mensal', 'Cobrança mensal recorrente.', 1990, 'month', 1,
   '["Horóscopo diário no WhatsApp","Personalizado pelo seu signo","Cancele quando quiser"]'::jsonb,
   false, 1),
  ('trimestral', 'Trimestral', 'Economize com pagamento a cada 3 meses.', 4990, 'quarter', 3,
   '["Tudo do plano mensal","Economize ~15% no total","Cobrança a cada 3 meses"]'::jsonb,
   true, 2);

-- ============= horoscope_paid_subscriptions =============
CREATE TABLE public.horoscope_paid_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.horoscope_plans(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','canceled','expired','failed')),
  mp_preference_id text,
  mp_payment_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  phone_e164 text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX horoscope_paid_subscriptions_user_idx
  ON public.horoscope_paid_subscriptions (user_id, created_at DESC);
CREATE INDEX horoscope_paid_subscriptions_pref_idx
  ON public.horoscope_paid_subscriptions (mp_preference_id);

GRANT SELECT ON public.horoscope_paid_subscriptions TO authenticated;
GRANT ALL ON public.horoscope_paid_subscriptions TO service_role;
ALTER TABLE public.horoscope_paid_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hps_read_own"
  ON public.horoscope_paid_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "hps_admin_all"
  ON public.horoscope_paid_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER horoscope_paid_subscriptions_set_updated_at
  BEFORE UPDATE ON public.horoscope_paid_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
