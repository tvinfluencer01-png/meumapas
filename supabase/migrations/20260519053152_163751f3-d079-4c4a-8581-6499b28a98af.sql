ALTER TABLE public.pdf_branding
  ADD COLUMN IF NOT EXISTS page_bg_color text NOT NULL DEFAULT '#f5f1e6',
  ADD COLUMN IF NOT EXISTS page_bg_image_path text,
  ADD COLUMN IF NOT EXISTS watermark_image_path text,
  ADD COLUMN IF NOT EXISTS watermark_opacity numeric NOT NULL DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS body_text_color text NOT NULL DEFAULT '#262218',
  ADD COLUMN IF NOT EXISTS heading_text_color text NOT NULL DEFAULT '#03060f',
  ADD COLUMN IF NOT EXISTS body_font_size numeric NOT NULL DEFAULT 12.5,
  ADD COLUMN IF NOT EXISTS line_height numeric NOT NULL DEFAULT 1.45,
  ADD COLUMN IF NOT EXISTS frame_style text NOT NULL DEFAULT 'double',
  ADD COLUMN IF NOT EXISTS page_margin integer NOT NULL DEFAULT 56;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pdf_branding_frame_style_check'
  ) THEN
    ALTER TABLE public.pdf_branding
      ADD CONSTRAINT pdf_branding_frame_style_check
      CHECK (frame_style IN ('none','simple','double','ornamental'));
  END IF;
END$$;