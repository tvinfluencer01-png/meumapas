ALTER TABLE public.system_settings ADD COLUMN whatsapp_number TEXT;
GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT, UPDATE ON public.system_settings TO authenticated;
-- Ensure we have the global record
INSERT INTO public.system_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;