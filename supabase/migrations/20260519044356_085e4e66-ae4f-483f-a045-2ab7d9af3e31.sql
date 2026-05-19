ALTER TABLE public.pdf_branding
  ADD COLUMN IF NOT EXISTS cover_image_path text,
  ADD COLUMN IF NOT EXISTS cover_bg_color text NOT NULL DEFAULT '#03060f',
  ADD COLUMN IF NOT EXISTS cover_accent_color text NOT NULL DEFAULT '#d4af37',
  ADD COLUMN IF NOT EXISTS cover_title_position text NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'serif',
  ADD COLUMN IF NOT EXISTS header_bg_color text NOT NULL DEFAULT '#f5f1e6',
  ADD COLUMN IF NOT EXISTS footer_bg_color text NOT NULL DEFAULT '#f5f1e6',
  ADD COLUMN IF NOT EXISTS header_text_color text NOT NULL DEFAULT '#d4af37';