
ALTER TABLE public.affiliate_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.affiliate_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.affiliate_verification_codes TO service_role;

ALTER TABLE public.affiliate_verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service_role writes/reads; no user-facing policies needed.
CREATE INDEX IF NOT EXISTS idx_aff_verif_affiliate
  ON public.affiliate_verification_codes(affiliate_id, consumed_at);
