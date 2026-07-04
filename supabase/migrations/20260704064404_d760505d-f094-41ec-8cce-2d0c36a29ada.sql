
CREATE TABLE public.report_illustrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme TEXT NOT NULL,
  report_kind TEXT,
  title TEXT,
  prompt TEXT NOT NULL,
  image_data TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'image/png',
  usage_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_illustrations_theme_active ON public.report_illustrations(theme, active);
CREATE INDEX idx_report_illustrations_kind_active ON public.report_illustrations(report_kind, active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_illustrations TO authenticated;
GRANT ALL ON public.report_illustrations TO service_role;

ALTER TABLE public.report_illustrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active illustrations"
  ON public.report_illustrations FOR SELECT
  TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert illustrations"
  ON public.report_illustrations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update illustrations"
  ON public.report_illustrations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete illustrations"
  ON public.report_illustrations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_report_illustrations_updated_at
  BEFORE UPDATE ON public.report_illustrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
