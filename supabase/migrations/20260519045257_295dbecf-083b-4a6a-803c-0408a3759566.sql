ALTER TABLE public.astro_charts
  ADD COLUMN IF NOT EXISTS forecast jsonb,
  ADD COLUMN IF NOT EXISTS forecast_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS storage_path text;

INSERT INTO public.credit_costs (action, amount, label, description)
VALUES
  ('astro_forecast', 2, 'Previsões do Mapa Astral (IA)', 'Geração de previsões para próximos dias, semana, mês e ano com base no mapa natal.'),
  ('astro_pdf', 3, 'Mapa Astral — PDF completo', 'Exporta o relatório completo do mapa astral em PDF.')
ON CONFLICT (action) DO NOTHING;