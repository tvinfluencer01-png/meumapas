
-- Extend affiliate_settings with antifraud + payout policy
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS hold_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS commission_model text NOT NULL DEFAULT 'first_purchase',
  ADD COLUMN IF NOT EXISTS antifraud_same_cpf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS antifraud_same_ip boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS antifraud_same_card boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS antifraud_block_vpn boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS antifraud_block_self boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_notify_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_notify_push boolean NOT NULL DEFAULT true;

ALTER TABLE public.affiliate_profiles
  ADD COLUMN IF NOT EXISTS signup_ip text,
  ADD COLUMN IF NOT EXISTS last_login_ip text;

-- Products
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  price_cents integer NOT NULL DEFAULT 0,
  commission_rate numeric(5,2),
  commission_fixed_cents integer,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_products TO authenticated;
GRANT ALL ON public.affiliate_products TO service_role;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_aff_products" ON public.affiliate_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_aff_products" ON public.affiliate_products FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_products_upd BEFORE UPDATE ON public.affiliate_products FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Coupons
CREATE TABLE IF NOT EXISTS public.affiliate_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  discount_percent numeric(5,2),
  discount_cents integer,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_coupons TO authenticated;
GRANT ALL ON public.affiliate_coupons TO service_role;
ALTER TABLE public.affiliate_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_aff_coupons" ON public.affiliate_coupons FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "admin_write_aff_coupons" ON public.affiliate_coupons FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_coupons_upd BEFORE UPDATE ON public.affiliate_coupons FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Campaigns
CREATE TABLE IF NOT EXISTS public.affiliate_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  goal_cents integer,
  bonus_cents integer,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_campaigns TO authenticated;
GRANT ALL ON public.affiliate_campaigns TO service_role;
ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_aff_campaigns" ON public.affiliate_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_aff_campaigns" ON public.affiliate_campaigns FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_campaigns_upd BEFORE UPDATE ON public.affiliate_campaigns FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Commission rules
CREATE TABLE IF NOT EXISTS public.affiliate_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global','product','category','affiliate')),
  scope_ref text,
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('percent','fixed')),
  value numeric(12,2) NOT NULL,
  model text NOT NULL CHECK (model IN ('first_purchase','recurring','lifetime')) DEFAULT 'first_purchase',
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_commission_rules TO authenticated;
GRANT ALL ON public.affiliate_commission_rules TO service_role;
ALTER TABLE public.affiliate_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_aff_rules" ON public.affiliate_commission_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_aff_rules" ON public.affiliate_commission_rules FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_rules_upd BEFORE UPDATE ON public.affiliate_commission_rules FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Fraud flags
CREATE TABLE IF NOT EXISTS public.affiliate_fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.affiliate_orders(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.affiliate_commissions(id) ON DELETE SET NULL,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','blocked','ignored')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_fraud_flags TO authenticated;
GRANT ALL ON public.affiliate_fraud_flags TO service_role;
ALTER TABLE public.affiliate_fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_fraud" ON public.affiliate_fraud_flags FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "admin_write_fraud" ON public.affiliate_fraud_flags FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_fraud_upd BEFORE UPDATE ON public.affiliate_fraud_flags FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Webhook events
CREATE TABLE IF NOT EXISTS public.affiliate_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  external_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','failed','ignored')),
  error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_webhook_events TO authenticated;
GRANT ALL ON public.affiliate_webhook_events TO service_role;
ALTER TABLE public.affiliate_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_wh" ON public.affiliate_webhook_events FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE INDEX IF NOT EXISTS idx_aff_wh_provider ON public.affiliate_webhook_events(provider, created_at DESC);
CREATE TRIGGER trg_aff_wh_upd BEFORE UPDATE ON public.affiliate_webhook_events FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Processing queue
CREATE TABLE IF NOT EXISTS public.affiliate_processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_processing_queue TO authenticated;
GRANT ALL ON public.affiliate_processing_queue TO service_role;
ALTER TABLE public.affiliate_processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_queue" ON public.affiliate_processing_queue FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE INDEX IF NOT EXISTS idx_aff_queue_status ON public.affiliate_processing_queue(status, run_at);
CREATE TRIGGER trg_aff_queue_upd BEFORE UPDATE ON public.affiliate_processing_queue FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Helpful indexes for dashboard/analytics
CREATE INDEX IF NOT EXISTS idx_aff_clicks_time ON public.affiliate_clicks(landed_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_country ON public.affiliate_clicks(country);
CREATE INDEX IF NOT EXISTS idx_aff_orders_time ON public.affiliate_orders(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_commissions_status ON public.affiliate_commissions(status, created_at DESC);
