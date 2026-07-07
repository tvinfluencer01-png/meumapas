
CREATE TABLE public.pwa_install_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL CHECK (event IN ('shown','accepted','dismissed','installed')),
  path TEXT NOT NULL,
  hint_mode TEXT,
  user_agent TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pwa_install_events_created_at_idx ON public.pwa_install_events (created_at DESC);
CREATE INDEX pwa_install_events_event_path_idx ON public.pwa_install_events (event, path);

GRANT SELECT ON public.pwa_install_events TO authenticated;
GRANT ALL ON public.pwa_install_events TO service_role;

ALTER TABLE public.pwa_install_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read PWA install events"
  ON public.pwa_install_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
