
-- Pixels (server-side event forwarding)
CREATE TABLE public.affiliate_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'meta' | 'ga4' | 'tiktok'
  label TEXT,
  pixel_id TEXT NOT NULL,
  access_token TEXT,
  api_secret TEXT,
  measurement_id TEXT,
  event_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_pixels TO authenticated;
GRANT ALL ON public.affiliate_pixels TO service_role;
ALTER TABLE public.affiliate_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_pixels_admin" ON public.affiliate_pixels FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cookie Consent Manager
CREATE TABLE public.affiliate_cookie_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  user_agent TEXT,
  policy_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_cookie_consents_session_idx ON public.affiliate_cookie_consents(session_id);
GRANT SELECT, INSERT ON public.affiliate_cookie_consents TO anon, authenticated;
GRANT ALL ON public.affiliate_cookie_consents TO service_role;
ALTER TABLE public.affiliate_cookie_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cookie_consent_insert" ON public.affiliate_cookie_consents FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cookie_consent_admin_read" ON public.affiliate_cookie_consents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Fraud AI scores
CREATE TABLE public.affiliate_fraud_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  click_id UUID,
  affiliate_id UUID,
  score NUMERIC(5,2) NOT NULL DEFAULT 0, -- 0-100
  risk_level TEXT NOT NULL DEFAULT 'low', -- low/medium/high/critical
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_reasoning TEXT,
  action_taken TEXT, -- allow/review/block
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_fraud_scores_aff_idx ON public.affiliate_fraud_scores(affiliate_id);
CREATE INDEX affiliate_fraud_scores_risk_idx ON public.affiliate_fraud_scores(risk_level);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_fraud_scores TO authenticated;
GRANT ALL ON public.affiliate_fraud_scores TO service_role;
ALTER TABLE public.affiliate_fraud_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_admin_all" ON public.affiliate_fraud_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fraud_affiliate_read_own" ON public.affiliate_fraud_scores FOR SELECT
  USING (affiliate_id = public.current_affiliate_id());

-- ROI snapshots
CREATE TABLE public.affiliate_roi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  affiliate_id UUID,
  product_id UUID,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  commission_cents BIGINT NOT NULL DEFAULT 0,
  ad_spend_cents BIGINT NOT NULL DEFAULT 0,
  roas NUMERIC(10,4) NOT NULL DEFAULT 0,
  epc_cents INTEGER NOT NULL DEFAULT 0,
  cvr NUMERIC(6,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_roi_snapshots_period_idx ON public.affiliate_roi_snapshots(period_start, period_end);
CREATE INDEX affiliate_roi_snapshots_aff_idx ON public.affiliate_roi_snapshots(affiliate_id);
GRANT SELECT, INSERT ON public.affiliate_roi_snapshots TO authenticated;
GRANT ALL ON public.affiliate_roi_snapshots TO service_role;
ALTER TABLE public.affiliate_roi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roi_admin_all" ON public.affiliate_roi_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roi_affiliate_read_own" ON public.affiliate_roi_snapshots FOR SELECT
  USING (affiliate_id = public.current_affiliate_id());
