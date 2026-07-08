CREATE TABLE IF NOT EXISTS public.db_sync_state (
  table_name TEXT NOT NULL PRIMARY KEY,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_max_updated_at TIMESTAMPTZ,
  last_strategy TEXT,
  rows_synced INTEGER DEFAULT 0,
  last_error TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.db_sync_state TO authenticated;
GRANT ALL ON public.db_sync_state TO service_role;
ALTER TABLE public.db_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sync state" ON public.db_sync_state FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));