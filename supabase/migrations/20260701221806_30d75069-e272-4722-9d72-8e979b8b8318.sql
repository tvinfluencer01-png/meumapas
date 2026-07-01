-- =========================================
-- FASE 4B — Monetização (schema)
-- =========================================

-- ------- 1) Checkout Providers -------
CREATE TABLE IF NOT EXISTS public.affiliate_checkout_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('mercadopago','paypal')),
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  sandbox boolean NOT NULL DEFAULT true,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  fee_percent numeric(6,3) NOT NULL DEFAULT 0,
  fee_fixed_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  webhook_secret text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_checkout_providers TO authenticated;
GRANT ALL ON public.affiliate_checkout_providers TO service_role;
ALTER TABLE public.affiliate_checkout_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_ckp_admin" ON public.affiliate_checkout_providers
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_ckp_updated BEFORE UPDATE ON public.affiliate_checkout_providers
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- ------- 2) Checkout Sessions -------
CREATE TABLE IF NOT EXISTS public.affiliate_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_ref text,
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.affiliate_campaigns(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES public.affiliate_coupons(id) ON DELETE SET NULL,
  customer_email text,
  customer_name text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','canceled','refunded','failed')),
  checkout_url text,
  session_token text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_cks_affiliate ON public.affiliate_checkout_sessions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_cks_provider_ref ON public.affiliate_checkout_sessions(provider, provider_ref);
CREATE INDEX IF NOT EXISTS idx_aff_cks_status ON public.affiliate_checkout_sessions(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_checkout_sessions TO authenticated;
GRANT ALL ON public.affiliate_checkout_sessions TO service_role;
ALTER TABLE public.affiliate_checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_cks_admin_all" ON public.affiliate_checkout_sessions
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "aff_cks_owner_read" ON public.affiliate_checkout_sessions
  FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id());
CREATE TRIGGER trg_aff_cks_updated BEFORE UPDATE ON public.affiliate_checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- ------- 3) Commission Tiers (escalonada por volume) -------
CREATE TABLE IF NOT EXISTS public.affiliate_commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.affiliate_commission_rules(id) ON DELETE CASCADE,
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  min_volume_cents bigint NOT NULL DEFAULT 0,
  max_volume_cents bigint,
  min_count integer,
  max_count integer,
  rate_percent numeric(6,3),
  amount_cents integer,
  period text NOT NULL DEFAULT 'month' CHECK (period IN ('month','quarter','year','lifetime')),
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_ctiers_rule ON public.affiliate_commission_tiers(rule_id);
CREATE INDEX IF NOT EXISTS idx_aff_ctiers_aff ON public.affiliate_commission_tiers(affiliate_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commission_tiers TO authenticated;
GRANT ALL ON public.affiliate_commission_tiers TO service_role;
ALTER TABLE public.affiliate_commission_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_ctiers_admin" ON public.affiliate_commission_tiers
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "aff_ctiers_owner_read" ON public.affiliate_commission_tiers
  FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id());
CREATE TRIGGER trg_aff_ctiers_updated BEFORE UPDATE ON public.affiliate_commission_tiers
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- ------- 4) Commission Overrides (vitalícia/primeira/recorrente) -------
CREATE TABLE IF NOT EXISTS public.affiliate_commission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('affiliate','product','affiliate_product','global')),
  affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('first_purchase','recurring','lifetime','one_time','tiered')),
  rate_percent numeric(6,3),
  amount_cents integer,
  recurrence_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_over_aff ON public.affiliate_commission_overrides(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_over_prod ON public.affiliate_commission_overrides(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commission_overrides TO authenticated;
GRANT ALL ON public.affiliate_commission_overrides TO service_role;
ALTER TABLE public.affiliate_commission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_over_admin" ON public.affiliate_commission_overrides
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_over_updated BEFORE UPDATE ON public.affiliate_commission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- ------- 5) Payout Batches -------
CREATE TABLE IF NOT EXISTS public.affiliate_payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL UNIQUE,
  method text NOT NULL CHECK (method IN ('pix','ted','manual')),
  total_cents bigint NOT NULL DEFAULT 0,
  fee_cents bigint NOT NULL DEFAULT 0,
  items_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','completed','failed','canceled')),
  scheduled_for timestamptz,
  processed_at timestamptz,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_payout_batches TO authenticated;
GRANT ALL ON public.affiliate_payout_batches TO service_role;
ALTER TABLE public.affiliate_payout_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_batches_admin" ON public.affiliate_payout_batches
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_aff_batches_updated BEFORE UPDATE ON public.affiliate_payout_batches
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- ------- 6) Payout Batch Items -------
CREATE TABLE IF NOT EXISTS public.affiliate_payout_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.affiliate_payout_batches(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE RESTRICT,
  withdraw_id uuid REFERENCES public.affiliate_withdraws(id) ON DELETE SET NULL,
  amount_cents bigint NOT NULL,
  fee_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled')),
  receipt_url text,
  external_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_batch_items_batch ON public.affiliate_payout_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_aff_batch_items_aff ON public.affiliate_payout_batch_items(affiliate_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_payout_batch_items TO authenticated;
GRANT ALL ON public.affiliate_payout_batch_items TO service_role;
ALTER TABLE public.affiliate_payout_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_batch_items_admin" ON public.affiliate_payout_batch_items
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "aff_batch_items_owner_read" ON public.affiliate_payout_batch_items
  FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id());
CREATE TRIGGER trg_aff_batch_items_updated BEFORE UPDATE ON public.affiliate_payout_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- ------- 7) Ledger (livro-razão) -------
CREATE TABLE IF NOT EXISTS public.affiliate_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('commission','withdraw','adjustment','fee','refund','bonus','chargeback')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount_cents bigint NOT NULL,
  balance_after_cents bigint NOT NULL,
  reference_type text,
  reference_id uuid,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_ledger_aff ON public.affiliate_ledger(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_ledger_ref ON public.affiliate_ledger(reference_type, reference_id);
GRANT SELECT, INSERT ON public.affiliate_ledger TO authenticated;
GRANT ALL ON public.affiliate_ledger TO service_role;
ALTER TABLE public.affiliate_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_ledger_admin_all" ON public.affiliate_ledger
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE POLICY "aff_ledger_owner_read" ON public.affiliate_ledger
  FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id());

-- ------- 8) Extensões a tabelas existentes -------
ALTER TABLE public.affiliate_commission_rules
  ADD COLUMN IF NOT EXISTS tier_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier_metric text CHECK (tier_metric IN ('volume','count','revenue')) DEFAULT 'volume',
  ADD COLUMN IF NOT EXISTS tier_period text CHECK (tier_period IN ('month','quarter','year','lifetime')) DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS recurrence_limit integer,
  ADD COLUMN IF NOT EXISTS lifetime boolean NOT NULL DEFAULT false;

ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS pix_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ted_fee_cents integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS payout_batch_min_cents integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS payout_batch_day integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reconciliation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS paypal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mercadopago_enabled boolean NOT NULL DEFAULT true;
