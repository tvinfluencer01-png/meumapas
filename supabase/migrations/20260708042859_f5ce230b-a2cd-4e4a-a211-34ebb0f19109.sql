
CREATE TABLE public.mp_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL,
  url text NOT NULL,
  headers jsonb,
  request_payload jsonb,
  payment_id text,
  event_type text,
  mp_status text,
  order_id text,
  metadata_kind text,
  result jsonb,
  response_status int,
  response_body jsonb,
  error_message text,
  duration_ms int
);

CREATE INDEX mp_webhook_logs_received_at_idx ON public.mp_webhook_logs (received_at DESC);
CREATE INDEX mp_webhook_logs_payment_id_idx ON public.mp_webhook_logs (payment_id);

GRANT SELECT ON public.mp_webhook_logs TO authenticated;
GRANT ALL ON public.mp_webhook_logs TO service_role;

ALTER TABLE public.mp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view MP webhook logs"
  ON public.mp_webhook_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
