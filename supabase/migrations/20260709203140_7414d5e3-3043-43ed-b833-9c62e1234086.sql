ALTER TABLE public.horoscope_free_leads
  ADD COLUMN IF NOT EXISTS crm_lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_to_crm_at timestamp with time zone;