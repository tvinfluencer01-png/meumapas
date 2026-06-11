
CREATE TABLE public.landing_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  price_label TEXT,
  sub_label TEXT NOT NULL DEFAULT '/ mês',
  anchor TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  included_addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_label TEXT NOT NULL DEFAULT 'Ascender',
  featured BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_packages TO anon, authenticated;
GRANT ALL ON public.landing_packages TO service_role;

ALTER TABLE public.landing_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled landing packages"
  ON public.landing_packages FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can view all landing packages"
  ON public.landing_packages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert landing packages"
  ON public.landing_packages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update landing packages"
  ON public.landing_packages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landing packages"
  ON public.landing_packages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER landing_packages_set_updated_at
  BEFORE UPDATE ON public.landing_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.landing_packages (slug, name, price_cents, price_label, sub_label, anchor, features, included_addons, cta_label, featured, enabled, sort_order) VALUES
('iniciante', 'Iniciante', 0, 'Grátis', 'para sempre', NULL,
 '["Mapa astral básico","Numerologia pitagórica","Trânsitos do dia","5 créditos de boas-vindas"]'::jsonb,
 '[]'::jsonb, 'Começar agora', false, true, 10),
('mistico', 'Místico', 4990, NULL, '/ mês', 'Mais escolhido',
 '["Relatórios ilimitados","Oráculo IA Premium","Tarot ilimitado","Numerologia Cabalística","Exportação PDF"]'::jsonb,
 '["sub_unlimited_reports","sub_oracle_premium","sub_tarot_unlimited"]'::jsonb, 'Ascender', true, true, 20),
('profissional', 'Profissional', 9990, NULL, '/ mês', 'Para profissionais',
 '["Clientes ilimitados (CRM)","Mapa e numerologia por cliente","Relatórios temáticos ilimitados","PDF com sua marca","Mapa Empresarial incluso"]'::jsonb,
 '["sub_astrologer_numerologist","sub_branding_pdf","sub_business_map"]'::jsonb, 'Tornar-se Profissional', false, true, 30);
