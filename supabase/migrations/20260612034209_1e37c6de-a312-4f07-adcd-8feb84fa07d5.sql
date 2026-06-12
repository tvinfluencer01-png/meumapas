ALTER TABLE public.landing_packages ADD COLUMN IF NOT EXISTS credits_per_month INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.landing_packages.credits_per_month IS 'Quantidade de créditos concedidos automaticamente ao usuário todo mês na renovação ou ativação deste plano.';

-- Atualizando pacotes existentes com valores base (exemplo)
UPDATE public.landing_packages SET credits_per_month = 10 WHERE slug = 'estelar';
UPDATE public.landing_packages SET credits_per_month = 50 WHERE slug = 'galactico';
UPDATE public.landing_packages SET credits_per_month = 100 WHERE slug = 'cosmico';
