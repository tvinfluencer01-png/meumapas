
-- Table
CREATE TABLE public.pdf_branding (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  logo_path TEXT,
  logo_width INTEGER NOT NULL DEFAULT 120,
  logo_height INTEGER NOT NULL DEFAULT 60,
  display_name TEXT,
  footer_enabled BOOLEAN NOT NULL DEFAULT true,
  footer_name TEXT,
  footer_site TEXT,
  footer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_select_own ON public.pdf_branding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY brand_insert_own ON public.pdf_branding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY brand_update_own ON public.pdf_branding FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY brand_delete_own ON public.pdf_branding FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER pdf_branding_updated_at
BEFORE UPDATE ON public.pdf_branding
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-branding', 'pdf-branding', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pdf_branding_select_own"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "pdf_branding_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdf-branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "pdf_branding_update_own"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pdf-branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "pdf_branding_delete_own"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdf-branding' AND auth.uid()::text = (storage.foldername(name))[1]);
