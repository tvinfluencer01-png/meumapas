ALTER TABLE public.product_landings
  ADD COLUMN IF NOT EXISTS hero_image_width integer,
  ADD COLUMN IF NOT EXISTS hero_image_height integer;