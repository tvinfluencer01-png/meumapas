
-- ============================================================
-- product_landings — landings de produtos avulsos
-- ============================================================
CREATE TABLE public.product_landings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  hero_image_url TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  report_type TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '["full_name","email","birth_date"]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_text TEXT NOT NULL DEFAULT 'Quero meu relatório',
  delivery_email_subject TEXT,
  delivery_email_template TEXT,
  delivery_whatsapp_template TEXT,
  seo_title TEXT,
  seo_description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_landings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_landings TO authenticated;
GRANT ALL ON public.product_landings TO service_role;

ALTER TABLE public.product_landings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active landings"
  ON public.product_landings FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all landings"
  ON public.product_landings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert landings"
  ON public.product_landings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update landings"
  ON public.product_landings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landings"
  ON public.product_landings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_landings_set_updated_at
  BEFORE UPDATE ON public.product_landings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- product_orders — pedidos avulsos
-- ============================================================
CREATE TABLE public.product_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landing_id UUID NOT NULL REFERENCES public.product_landings(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','paid','processing','delivered','failed','refunded')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  mp_preference_id TEXT,
  mp_payment_id TEXT UNIQUE,
  customer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  pdf_url TEXT,
  access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  delivered_at TIMESTAMPTZ,
  viewed_by_admin BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_orders_user_id_idx ON public.product_orders(user_id);
CREATE INDEX product_orders_status_idx ON public.product_orders(status);
CREATE INDEX product_orders_viewed_idx ON public.product_orders(viewed_by_admin) WHERE viewed_by_admin = false;
CREATE INDEX product_orders_access_token_idx ON public.product_orders(access_token);

GRANT SELECT, INSERT, UPDATE ON public.product_orders TO authenticated;
GRANT ALL ON public.product_orders TO service_role;

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.product_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own orders"
  ON public.product_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON public.product_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_orders_set_updated_at
  BEFORE UPDATE ON public.product_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Helper: contagem de pedidos não vistos
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_unviewed_orders()
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.product_orders
  WHERE viewed_by_admin = false
    AND status IN ('paid','processing','delivered','failed');
$$;

GRANT EXECUTE ON FUNCTION public.count_unviewed_orders() TO authenticated;
