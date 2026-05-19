-- Tabela de perfis de clientes (CRM leve do astrólogo/numerólogo)
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME WITHOUT TIME ZONE,
  time_unknown BOOLEAN NOT NULL DEFAULT false,
  city TEXT NOT NULL,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT,
  -- CRM leve
  email TEXT,
  phone TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_profiles_user_id ON public.client_profiles(user_id);
CREATE INDEX idx_client_profiles_user_name ON public.client_profiles(user_id, full_name);

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_select_own" ON public.client_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cp_insert_own" ON public.client_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cp_update_own" ON public.client_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cp_delete_own" ON public.client_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Coluna para guardar o cliente ativo (NULL = perfil próprio do usuário em birth_data)
ALTER TABLE public.profiles
ADD COLUMN active_client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- Helper: usuário tem add-on ativo (assinatura active e não expirada)?
CREATE OR REPLACE FUNCTION public.has_active_addon(_user_id UUID, _addon_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND addon_id = _addon_id
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- Vincular gerações ao cliente quando aplicável (opcional, NULL = perfil próprio)
ALTER TABLE public.astro_charts ADD COLUMN client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.numerology_reports ADD COLUMN client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tarot_readings ADD COLUMN client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.kabbalah_meditations ADD COLUMN client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_astro_charts_client ON public.astro_charts(client_profile_id);
CREATE INDEX idx_numerology_reports_client ON public.numerology_reports(client_profile_id);
CREATE INDEX idx_reports_client ON public.reports(client_profile_id);