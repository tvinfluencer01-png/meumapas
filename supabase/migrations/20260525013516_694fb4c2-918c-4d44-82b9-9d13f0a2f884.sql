
-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Horoscope subscription per user (preferences)
CREATE TABLE IF NOT EXISTS public.horoscope_subscriptions (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  channel_email boolean NOT NULL DEFAULT true,
  channel_whatsapp boolean NOT NULL DEFAULT true,
  phone_e164 text,
  email text,
  sun_sign text,
  send_hour_utc smallint NOT NULL DEFAULT 10, -- 07:00 BRT = 10:00 UTC
  last_sent_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.horoscope_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hs_select_own" ON public.horoscope_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hs_insert_own" ON public.horoscope_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hs_update_own" ON public.horoscope_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "hs_delete_own" ON public.horoscope_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER hs_set_updated_at
BEFORE UPDATE ON public.horoscope_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Horoscope delivery log
CREATE TABLE IF NOT EXISTS public.horoscope_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  channel text NOT NULL,  -- 'email' | 'whatsapp'
  status text NOT NULL,   -- 'sent' | 'error' | 'skipped'
  detail text,
  sign text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS horoscope_log_user_date_idx
  ON public.horoscope_log (user_id, date);

ALTER TABLE public.horoscope_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hl_select_own" ON public.horoscope_log
  FOR SELECT USING (auth.uid() = user_id);

-- 4) Add the business report cost (idempotent)
INSERT INTO public.credit_costs (action, amount, label, description)
VALUES (
  'report_business',
  8,
  'Relatório PDF — Mapa Empresarial',
  'Análise profunda da empresa: arquétipo, sócios, dinâmicas e previsões anuais.'
)
ON CONFLICT (action) DO NOTHING;

-- 5) Schedule daily horoscope cron at 10:00 UTC (07:00 BRT)
DO $$
DECLARE
  jid integer;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'send-daily-horoscope';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'send-daily-horoscope',
  '0 10 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--7dbfe514-82ed-4eda-9cfd-9582a0768939.lovable.app/api/public/hooks/daily-horoscope',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ramZ5a2JzYWFzcHZ1Y3hiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQyMzgsImV4cCI6MjA5NDczMDIzOH0.Mz0zs8Sx3G_zk2_M_hPxMacaILwJB31Gc25QQ8psARA'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
