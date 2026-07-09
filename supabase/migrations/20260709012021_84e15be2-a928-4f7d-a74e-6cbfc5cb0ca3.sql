
CREATE TABLE IF NOT EXISTS public.sync_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  site_url text NOT NULL,
  legacy_domains text[] NOT NULL DEFAULT '{}',
  supabase_url text NOT NULL,
  supabase_project_ref text,
  supabase_publishable_key text,
  service_role_secret_name text NOT NULL DEFAULT 'NEW_SUPABASE_SERVICE_ROLE_KEY',
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_destinations TO authenticated;
GRANT ALL ON public.sync_destinations TO service_role;

ALTER TABLE public.sync_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage sync destinations" ON public.sync_destinations;
CREATE POLICY "Admins manage sync destinations"
  ON public.sync_destinations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS sync_destinations_only_one_default
  ON public.sync_destinations ((true)) WHERE is_default;

DROP TRIGGER IF EXISTS trg_sync_destinations_updated_at ON public.sync_destinations;
CREATE TRIGGER trg_sync_destinations_updated_at
  BEFORE UPDATE ON public.sync_destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
