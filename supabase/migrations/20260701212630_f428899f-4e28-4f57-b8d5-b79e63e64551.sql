-- ============================================================
-- FASE 4A: Fundação - Event Queue, Tracking, Attribution, Rate Limit
-- ============================================================

-- 1. EVENT QUEUE (processamento assíncrono)
CREATE TABLE public.affiliate_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','dead_letter')),
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  correlation_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aeq_status_sched ON public.affiliate_event_queue(status, scheduled_for) WHERE status IN ('pending','processing');
CREATE INDEX idx_aeq_type ON public.affiliate_event_queue(event_type);
CREATE INDEX idx_aeq_correlation ON public.affiliate_event_queue(correlation_id) WHERE correlation_id IS NOT NULL;

GRANT ALL ON public.affiliate_event_queue TO service_role;
GRANT SELECT ON public.affiliate_event_queue TO authenticated;
ALTER TABLE public.affiliate_event_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate admin read event queue" ON public.affiliate_event_queue
  FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin') OR public.has_role(auth.uid(), 'admin'));

-- 2. TRACKING SESSIONS (universal analytics-like)
CREATE TABLE public.affiliate_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,
  visitor_id TEXT NOT NULL,
  affiliate_id UUID REFERENCES public.affiliate_profiles(id) ON DELETE SET NULL,
  affiliate_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  -- origem
  referrer TEXT,
  landing_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  -- click ids
  fbclid TEXT,
  gclid TEXT,
  ttclid TEXT,
  msclkid TEXT,
  li_fat_id TEXT,
  epik TEXT,
  -- device
  ip TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  language TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  screen_resolution TEXT,
  -- métricas
  page_views INTEGER NOT NULL DEFAULT 0,
  time_on_site_seconds INTEGER NOT NULL DEFAULT 0,
  max_scroll_pct INTEGER NOT NULL DEFAULT 0,
  converted BOOLEAN NOT NULL DEFAULT false,
  conversion_order_id UUID REFERENCES public.affiliate_orders(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ats_visitor ON public.affiliate_tracking_sessions(visitor_id);
CREATE INDEX idx_ats_affiliate ON public.affiliate_tracking_sessions(affiliate_id) WHERE affiliate_id IS NOT NULL;
CREATE INDEX idx_ats_last_seen ON public.affiliate_tracking_sessions(last_seen_at DESC);
CREATE INDEX idx_ats_utm_campaign ON public.affiliate_tracking_sessions(utm_campaign) WHERE utm_campaign IS NOT NULL;

GRANT ALL ON public.affiliate_tracking_sessions TO service_role;
GRANT SELECT ON public.affiliate_tracking_sessions TO authenticated;
ALTER TABLE public.affiliate_tracking_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read tracking sessions" ON public.affiliate_tracking_sessions
  FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "affiliate read own tracking sessions" ON public.affiliate_tracking_sessions
  FOR SELECT TO authenticated
  USING (affiliate_id = public.current_affiliate_id());

-- 3. TRACKING EVENTS (page_view, scroll, checkout, purchase, abandon, custom)
CREATE TABLE public.affiliate_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.affiliate_tracking_sessions(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_category TEXT,
  page_url TEXT,
  page_title TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  value_cents INTEGER,
  currency TEXT DEFAULT 'BRL',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ate_session ON public.affiliate_tracking_events(session_id);
CREATE INDEX idx_ate_name ON public.affiliate_tracking_events(event_name);
CREATE INDEX idx_ate_occurred ON public.affiliate_tracking_events(occurred_at DESC);

GRANT ALL ON public.affiliate_tracking_events TO service_role;
GRANT SELECT ON public.affiliate_tracking_events TO authenticated;
ALTER TABLE public.affiliate_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read tracking events" ON public.affiliate_tracking_events
  FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin') OR public.has_role(auth.uid(), 'admin'));

-- 4. ATRIBUIÇÃO / TOUCHPOINTS (para modelos linear, primeiro clique, último clique, híbrido)
CREATE TABLE public.affiliate_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  affiliate_id UUID REFERENCES public.affiliate_profiles(id) ON DELETE SET NULL,
  affiliate_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.affiliate_tracking_sessions(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  touch_type TEXT NOT NULL DEFAULT 'click',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_atp_visitor ON public.affiliate_touchpoints(visitor_id, occurred_at DESC);
CREATE INDEX idx_atp_affiliate ON public.affiliate_touchpoints(affiliate_id);

GRANT ALL ON public.affiliate_touchpoints TO service_role;
GRANT SELECT ON public.affiliate_touchpoints TO authenticated;
ALTER TABLE public.affiliate_touchpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read touchpoints" ON public.affiliate_touchpoints
  FOR SELECT TO authenticated
  USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin') OR public.has_role(auth.uid(), 'admin'));

-- 5. CONFIGURAÇÃO DE COOKIE / ATRIBUIÇÃO (estende affiliate_settings)
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS cookie_lifetime_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cookie_lifetime_lifetime BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attribution_model TEXT NOT NULL DEFAULT 'last_click'
    CHECK (attribution_model IN ('first_click','last_click','linear','custom','hybrid')),
  ADD COLUMN IF NOT EXISTS attribution_custom_weights JSONB DEFAULT '{}'::jsonb;

-- 6. RATE LIMIT (proteção anti-abuse em endpoints públicos)
CREATE TABLE public.affiliate_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, window_start)
);
CREATE INDEX idx_arl_window ON public.affiliate_rate_limits(window_start);

GRANT ALL ON public.affiliate_rate_limits TO service_role;
ALTER TABLE public.affiliate_rate_limits ENABLE ROW LEVEL SECURITY;
-- sem policy pública; apenas service_role escreve/lê

-- Função utilitária de rate limit (idempotente)
CREATE OR REPLACE FUNCTION public.affiliate_check_rate_limit(
  _bucket TEXT,
  _limit INTEGER,
  _window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', now());
  v_count INTEGER;
BEGIN
  DELETE FROM public.affiliate_rate_limits
   WHERE window_start < now() - (_window_seconds || ' seconds')::interval;

  INSERT INTO public.affiliate_rate_limits (bucket_key, window_start, request_count)
  VALUES (_bucket, v_window, 1)
  ON CONFLICT (bucket_key, window_start) DO UPDATE
    SET request_count = public.affiliate_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.affiliate_check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 7. CACHE distribuído (chave/valor com TTL)
CREATE TABLE public.affiliate_cache (
  cache_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ac_expires ON public.affiliate_cache(expires_at);

GRANT ALL ON public.affiliate_cache TO service_role;
ALTER TABLE public.affiliate_cache ENABLE ROW LEVEL SECURITY;

-- 8. TRIGGERS updated_at
CREATE TRIGGER trg_aeq_updated BEFORE UPDATE ON public.affiliate_event_queue
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE TRIGGER trg_ats_updated BEFORE UPDATE ON public.affiliate_tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();