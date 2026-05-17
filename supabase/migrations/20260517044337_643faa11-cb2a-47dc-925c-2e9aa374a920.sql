
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Birth data
create table public.birth_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  birth_time time,
  time_unknown boolean not null default false,
  city text not null,
  country text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.birth_data enable row level security;
create policy "birth_select_own" on public.birth_data for select using (auth.uid() = user_id);
create policy "birth_insert_own" on public.birth_data for insert with check (auth.uid() = user_id);
create policy "birth_update_own" on public.birth_data for update using (auth.uid() = user_id);
create policy "birth_delete_own" on public.birth_data for delete using (auth.uid() = user_id);
create index birth_data_user_idx on public.birth_data(user_id);

-- Astro charts cache
create table public.astro_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_data_id uuid references public.birth_data(id) on delete cascade,
  engine text not null default 'swiss_ephemeris',
  planets jsonb not null default '[]'::jsonb,
  houses jsonb not null default '[]'::jsonb,
  aspects jsonb not null default '[]'::jsonb,
  ascendant numeric,
  midheaven numeric,
  summary text,
  created_at timestamptz not null default now()
);
alter table public.astro_charts enable row level security;
create policy "charts_select_own" on public.astro_charts for select using (auth.uid() = user_id);
create policy "charts_insert_own" on public.astro_charts for insert with check (auth.uid() = user_id);
create policy "charts_delete_own" on public.astro_charts for delete using (auth.uid() = user_id);
create index astro_charts_user_idx on public.astro_charts(user_id);

-- Numerology reports
create table public.numerology_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  life_path int,
  destiny int,
  soul_urge int,
  personality int,
  birthday int,
  expression int,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.numerology_reports enable row level security;
create policy "num_select_own" on public.numerology_reports for select using (auth.uid() = user_id);
create policy "num_insert_own" on public.numerology_reports for insert with check (auth.uid() = user_id);
create policy "num_delete_own" on public.numerology_reports for delete using (auth.uid() = user_id);

-- AI conversations
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  context jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_conversations enable row level security;
create policy "conv_select_own" on public.ai_conversations for select using (auth.uid() = user_id);
create policy "conv_insert_own" on public.ai_conversations for insert with check (auth.uid() = user_id);
create policy "conv_update_own" on public.ai_conversations for update using (auth.uid() = user_id);
create policy "conv_delete_own" on public.ai_conversations for delete using (auth.uid() = user_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.ai_messages enable row level security;
create policy "msg_select_own" on public.ai_messages for select using (auth.uid() = user_id);
create policy "msg_insert_own" on public.ai_messages for insert with check (auth.uid() = user_id);
create index ai_messages_conv_idx on public.ai_messages(conversation_id);

-- User settings (per-user API keys + preferences)
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  astrology_api_user_id text,
  astrology_api_key text,
  preferred_engine text not null default 'swiss_ephemeris',
  ai_provider text not null default 'lovable',
  custom_ai_key text,
  custom_ai_model text,
  language text not null default 'pt-BR',
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings for update using (auth.uid() = user_id);
create trigger settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- App logs
create table public.app_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.app_logs enable row level security;
create policy "logs_select_own" on public.app_logs for select using (auth.uid() = user_id);
create policy "logs_insert_own" on public.app_logs for insert with check (auth.uid() = user_id or user_id is null);
