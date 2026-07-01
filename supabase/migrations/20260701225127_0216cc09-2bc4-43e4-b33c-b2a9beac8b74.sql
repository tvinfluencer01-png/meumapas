
-- Push subscriptions per affiliate
CREATE TABLE public.affiliate_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_push_subscriptions TO authenticated;
GRANT ALL ON public.affiliate_push_subscriptions TO service_role;
ALTER TABLE public.affiliate_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates manage own push subs" ON public.affiliate_push_subscriptions
  FOR ALL USING (affiliate_id = public.current_affiliate_id())
  WITH CHECK (affiliate_id = public.current_affiliate_id());
CREATE POLICY "Admins view all push subs" ON public.affiliate_push_subscriptions
  FOR SELECT USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_push_subs_updated
  BEFORE UPDATE ON public.affiliate_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Notification templates (channel-specific)
CREATE TABLE public.affiliate_notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push','email','inapp','webhook')),
  subject TEXT,
  body TEXT NOT NULL,
  icon_url TEXT,
  action_url TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_notification_templates TO authenticated;
GRANT ALL ON public.affiliate_notification_templates TO service_role;
ALTER TABLE public.affiliate_notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification templates" ON public.affiliate_notification_templates
  FOR ALL USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_notif_tmpl_updated
  BEFORE UPDATE ON public.affiliate_notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Rules: event -> templates
CREATE TABLE public.affiliate_notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.affiliate_notification_templates(id) ON DELETE CASCADE,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  cooldown_seconds INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_notif_rules_event ON public.affiliate_notification_rules(event_key) WHERE enabled;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_notification_rules TO authenticated;
GRANT ALL ON public.affiliate_notification_rules TO service_role;
ALTER TABLE public.affiliate_notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification rules" ON public.affiliate_notification_rules
  FOR ALL USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_notif_rules_updated
  BEFORE UPDATE ON public.affiliate_notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

-- Dispatch history
CREATE TABLE public.affiliate_notification_dispatches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliate_profiles(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  template_id UUID REFERENCES public.affiliate_notification_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX idx_affiliate_notif_disp_affiliate ON public.affiliate_notification_dispatches(affiliate_id, created_at DESC);
CREATE INDEX idx_affiliate_notif_disp_event ON public.affiliate_notification_dispatches(event_key, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_notification_dispatches TO authenticated;
GRANT ALL ON public.affiliate_notification_dispatches TO service_role;
ALTER TABLE public.affiliate_notification_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own dispatches" ON public.affiliate_notification_dispatches
  FOR SELECT USING (affiliate_id = public.current_affiliate_id());
CREATE POLICY "Admins view all dispatches" ON public.affiliate_notification_dispatches
  FOR ALL USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));

-- Outbound webhooks (external partners)
CREATE TABLE public.affiliate_outbound_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_outbound_webhooks TO authenticated;
GRANT ALL ON public.affiliate_outbound_webhooks TO service_role;
ALTER TABLE public.affiliate_outbound_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage outbound webhooks" ON public.affiliate_outbound_webhooks
  FOR ALL USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
CREATE TRIGGER trg_affiliate_outb_wh_updated
  BEFORE UPDATE ON public.affiliate_outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_set_updated_at();

CREATE TABLE public.affiliate_outbound_webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.affiliate_outbound_webhooks(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_outb_wh_deliv_wh ON public.affiliate_outbound_webhook_deliveries(webhook_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_outbound_webhook_deliveries TO authenticated;
GRANT ALL ON public.affiliate_outbound_webhook_deliveries TO service_role;
ALTER TABLE public.affiliate_outbound_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhook deliveries" ON public.affiliate_outbound_webhook_deliveries
  FOR ALL USING (public.has_affiliate_role(auth.uid(), 'affiliate_admin'))
  WITH CHECK (public.has_affiliate_role(auth.uid(), 'affiliate_admin'));
