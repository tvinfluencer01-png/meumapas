
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  target_url text NOT NULL,
  order_id uuid REFERENCES public.product_orders(id) ON DELETE CASCADE,
  clicks integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.short_links TO anon;
GRANT SELECT ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can resolve short links"
  ON public.short_links FOR SELECT
  USING (true);

CREATE POLICY "Admins manage short links"
  ON public.short_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_short_links_slug ON public.short_links(slug);
CREATE INDEX idx_short_links_order ON public.short_links(order_id);

CREATE TRIGGER trg_short_links_updated_at
  BEFORE UPDATE ON public.short_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
