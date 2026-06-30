
-- ============================================================
-- AFFILIATE CENTER — FASE 1: Base estrutural
-- Módulo totalmente isolado; prefixo "affiliate_" em tudo
-- ============================================================

-- Enums
CREATE TYPE public.affiliate_role AS ENUM ('affiliate_admin', 'affiliate');
CREATE TYPE public.affiliate_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.affiliate_commission_status AS ENUM ('pending', 'approved', 'paid', 'canceled');
CREATE TYPE public.affiliate_withdraw_status AS ENUM ('requested', 'processing', 'paid', 'rejected');
CREATE TYPE public.affiliate_conversion_type AS ENUM ('signup', 'lead', 'checkout', 'order');
CREATE TYPE public.affiliate_order_status AS ENUM ('pending', 'paid', 'refunded', 'canceled');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.affiliate_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================
-- RBAC
-- ============================================================
CREATE TABLE public.affiliate_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.affiliate_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.affiliate_user_roles TO authenticated;
GRANT ALL ON public.affiliate_user_roles TO service_role;
ALTER TABLE public.affiliate_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_affiliate_role(_user_id UUID, _role public.affiliate_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliate_user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR (
    _role = 'affiliate_admin' AND public.has_role(_user_id, 'admin')
  );
$$;

CREATE POLICY "self_read_aff_roles" ON public.affiliate_user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "admin_manage_aff_roles" ON public.affiliate_user_roles
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_profiles
-- ============================================================
CREATE TABLE public.affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  status public.affiliate_status NOT NULL DEFAULT 'pending',
  affiliate_code TEXT NOT NULL UNIQUE,
  api_key_hash TEXT,
  token_hash TEXT,
  default_commission_rate NUMERIC(5,2),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_profiles TO authenticated;
GRANT ALL ON public.affiliate_profiles TO service_role;
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_prof_upd BEFORE UPDATE ON public.affiliate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

CREATE POLICY "self_read_aff_profile" ON public.affiliate_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "self_insert_aff_profile" ON public.affiliate_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "self_update_aff_profile" ON public.affiliate_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "admin_delete_aff_profile" ON public.affiliate_profiles
  FOR DELETE TO authenticated USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- Helper: profile of caller
CREATE OR REPLACE FUNCTION public.current_affiliate_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.affiliate_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- affiliate_links
-- ============================================================
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT,
  destination_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT SELECT ON public.affiliate_links TO anon;
GRANT ALL ON public.affiliate_links TO service_role;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_link_upd BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

CREATE POLICY "owner_read_links" ON public.affiliate_links
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "public_read_active_links" ON public.affiliate_links
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "owner_write_links" ON public.affiliate_links
  FOR ALL TO authenticated
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_clicks (rastreamento - permite anon insert)
-- ============================================================
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device TEXT,
  os TEXT,
  browser TEXT,
  referrer TEXT,
  landing_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  session_token TEXT,
  landed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aff_clicks_aff ON public.affiliate_clicks(affiliate_id, landed_at DESC);
CREATE INDEX idx_aff_clicks_session ON public.affiliate_clicks(session_token);
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "anon_insert_clicks" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- affiliate_sessions
-- ============================================================
CREATE TABLE public.affiliate_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  first_click_id UUID REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  fingerprint TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.affiliate_sessions TO authenticated;
GRANT INSERT, UPDATE ON public.affiliate_sessions TO anon, authenticated;
GRANT ALL ON public.affiliate_sessions TO service_role;
ALTER TABLE public.affiliate_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_sessions" ON public.affiliate_sessions
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "anon_upsert_sessions" ON public.affiliate_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_sessions" ON public.affiliate_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- affiliate_conversions
-- ============================================================
CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.affiliate_sessions(id) ON DELETE SET NULL,
  type public.affiliate_conversion_type NOT NULL,
  value_cents INTEGER NOT NULL DEFAULT 0,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aff_conv_aff ON public.affiliate_conversions(affiliate_id, occurred_at DESC);
GRANT SELECT ON public.affiliate_conversions TO authenticated;
GRANT INSERT ON public.affiliate_conversions TO anon, authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_conv" ON public.affiliate_conversions
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "anon_insert_conv" ON public.affiliate_conversions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- affiliate_orders
-- ============================================================
CREATE TABLE public.affiliate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.affiliate_sessions(id) ON DELETE SET NULL,
  order_ref TEXT NOT NULL,
  customer_ref TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status public.affiliate_order_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, order_ref)
);
GRANT SELECT ON public.affiliate_orders TO authenticated;
GRANT INSERT, UPDATE ON public.affiliate_orders TO authenticated;
GRANT ALL ON public.affiliate_orders TO service_role;
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_orders_upd BEFORE UPDATE ON public.affiliate_orders
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE POLICY "owner_read_orders" ON public.affiliate_orders
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "admin_write_orders" ON public.affiliate_orders
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_commissions
-- ============================================================
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.affiliate_orders(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  rate NUMERIC(5,2),
  status public.affiliate_commission_status NOT NULL DEFAULT 'pending',
  available_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_comm_upd BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE POLICY "owner_read_comm" ON public.affiliate_commissions
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "admin_write_comm" ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_bank_accounts & pix_keys
-- ============================================================
CREATE TABLE public.affiliate_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  holder_doc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_bank_accounts TO authenticated;
GRANT ALL ON public.affiliate_bank_accounts TO service_role;
ALTER TABLE public.affiliate_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_bank_upd BEFORE UPDATE ON public.affiliate_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE POLICY "owner_bank" ON public.affiliate_bank_accounts
  FOR ALL TO authenticated
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));

CREATE TABLE public.affiliate_pix_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  key_type TEXT NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_pix_keys TO authenticated;
GRANT ALL ON public.affiliate_pix_keys TO service_role;
ALTER TABLE public.affiliate_pix_keys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_pix_upd BEFORE UPDATE ON public.affiliate_pix_keys
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE POLICY "owner_pix" ON public.affiliate_pix_keys
  FOR ALL TO authenticated
  USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_withdraws
-- ============================================================
CREATE TABLE public.affiliate_withdraws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.affiliate_bank_accounts(id) ON DELETE SET NULL,
  pix_key_id UUID REFERENCES public.affiliate_pix_keys(id) ON DELETE SET NULL,
  status public.affiliate_withdraw_status NOT NULL DEFAULT 'requested',
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_withdraws TO authenticated;
GRANT ALL ON public.affiliate_withdraws TO service_role;
ALTER TABLE public.affiliate_withdraws ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_wd_upd BEFORE UPDATE ON public.affiliate_withdraws
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE POLICY "owner_read_wd" ON public.affiliate_withdraws
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "owner_request_wd" ON public.affiliate_withdraws
  FOR INSERT TO authenticated WITH CHECK (affiliate_id = public.current_affiliate_id());
CREATE POLICY "admin_update_wd" ON public.affiliate_withdraws
  FOR UPDATE TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_notifications
-- ============================================================
CREATE TABLE public.affiliate_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  to_admin BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.affiliate_notifications TO authenticated;
GRANT ALL ON public.affiliate_notifications TO service_role;
ALTER TABLE public.affiliate_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_aff_notif" ON public.affiliate_notifications
  FOR SELECT TO authenticated USING (
    (to_admin AND public.has_affiliate_role(auth.uid(),'affiliate_admin'))
    OR (NOT to_admin AND affiliate_id = public.current_affiliate_id())
  );
CREATE POLICY "mark_read_aff_notif" ON public.affiliate_notifications
  FOR UPDATE TO authenticated USING (
    (to_admin AND public.has_affiliate_role(auth.uid(),'affiliate_admin'))
    OR (NOT to_admin AND affiliate_id = public.current_affiliate_id())
  ) WITH CHECK (true);

-- ============================================================
-- affiliate_messages
-- ============================================================
CREATE TABLE public.affiliate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  from_admin BOOLEAN NOT NULL DEFAULT false,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_messages TO authenticated;
GRANT ALL ON public.affiliate_messages TO service_role;
ALTER TABLE public.affiliate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thread_aff_msg" ON public.affiliate_messages
  FOR SELECT TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "send_aff_msg" ON public.affiliate_messages
  FOR INSERT TO authenticated WITH CHECK (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));
CREATE POLICY "update_aff_msg" ON public.affiliate_messages
  FOR UPDATE TO authenticated USING (affiliate_id = public.current_affiliate_id() OR public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_audit_logs
-- ============================================================
CREATE TABLE public.affiliate_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aff_audit_entity ON public.affiliate_audit_logs(entity, entity_id);
GRANT SELECT ON public.affiliate_audit_logs TO authenticated;
GRANT ALL ON public.affiliate_audit_logs TO service_role;
ALTER TABLE public.affiliate_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_audit" ON public.affiliate_audit_logs
  FOR SELECT TO authenticated USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

-- ============================================================
-- affiliate_settings (singleton row id='global')
-- ============================================================
CREATE TABLE public.affiliate_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  cookie_window_days INTEGER NOT NULL DEFAULT 30,
  min_withdraw_cents INTEGER NOT NULL DEFAULT 5000,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_settings TO authenticated;
GRANT ALL ON public.affiliate_settings TO service_role;
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_aff_set_upd BEFORE UPDATE ON public.affiliate_settings
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();
CREATE POLICY "read_aff_settings" ON public.affiliate_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_aff_settings" ON public.affiliate_settings
  FOR ALL TO authenticated
  USING (public.has_affiliate_role(auth.uid(),'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(),'affiliate_admin'));

INSERT INTO public.affiliate_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;
