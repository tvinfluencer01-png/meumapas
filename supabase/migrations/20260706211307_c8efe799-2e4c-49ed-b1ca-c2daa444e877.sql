
UPDATE public.affiliate_profiles
SET whatsapp_verified_at = COALESCE(whatsapp_verified_at, created_at, now())
WHERE whatsapp_verified_at IS NULL;
