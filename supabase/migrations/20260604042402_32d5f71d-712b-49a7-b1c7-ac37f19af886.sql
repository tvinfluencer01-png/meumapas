
ALTER TABLE public.horoscope_subscriptions
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS client_profile_id uuid REFERENCES public.client_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.horoscope_subscriptions DROP CONSTRAINT IF EXISTS horoscope_subscriptions_pkey;
ALTER TABLE public.horoscope_subscriptions ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS horoscope_subscriptions_user_ctx_uidx
  ON public.horoscope_subscriptions (
    user_id,
    COALESCE(client_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
