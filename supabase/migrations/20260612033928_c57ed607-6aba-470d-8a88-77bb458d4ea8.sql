-- Novos pacotes para a Landing Page
INSERT INTO public.landing_packages 
  (slug, name, price_cents, price_label, sub_label, anchor, features, included_addons, cta_label, featured, enabled, sort_order)
VALUES 
  (
    'estelar', 
    'Pacote Estelar', 
    9500, 
    NULL, 
    '/ mês', 
    'Ideal para iniciantes', 
    '["Horóscopo Diário", "Mapa Astral Básico", "10 Créditos inclusos"]'::jsonb, 
    '[]'::jsonb, 
    'Começar Jornada', 
    false, 
    true, 
    5
  ),
  (
    'galactico', 
    'Pacote Galáctico', 
    19000, 
    NULL, 
    '/ mês', 
    'Mais Popular', 
    '["Horóscopo Diário", "Mapa Astral Completo", "Relatórios Ilimitados", "50 Créditos inclusos"]'::jsonb, 
    '[]'::jsonb, 
    'Ascender Agora', 
    true, 
    true, 
    15
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  anchor = EXCLUDED.anchor,
  features = EXCLUDED.features,
  featured = EXCLUDED.featured,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_packages TO authenticated;
GRANT ALL ON public.landing_packages TO service_role;
