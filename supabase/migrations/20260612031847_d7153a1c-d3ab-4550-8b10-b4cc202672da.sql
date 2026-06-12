CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'custom',
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  reply_to text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.smtp_settings TO authenticated;
GRANT ALL ON public.smtp_settings TO service_role;

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view smtp settings"
  ON public.smtp_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert smtp settings"
  ON public.smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update smtp settings"
  ON public.smtp_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete smtp settings"
  ON public.smtp_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER smtp_settings_updated_at
  BEFORE UPDATE ON public.smtp_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();