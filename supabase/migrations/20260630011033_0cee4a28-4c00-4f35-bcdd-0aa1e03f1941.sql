
-- Allow guest orders (user created after payment)
ALTER TABLE public.product_orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.product_orders ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.product_orders ADD COLUMN IF NOT EXISTS guest_email text;

-- CRM leads table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  phone text,
  source text,
  landing_slug text,
  landing_id uuid,
  customer_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  notes text,
  last_contact_at timestamptz,
  followup_count integer NOT NULL DEFAULT 0,
  converted_order_id uuid,
  converted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_leads_email_idx ON public.crm_leads (lower(email));
CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON public.crm_leads (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all leads"
  ON public.crm_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
