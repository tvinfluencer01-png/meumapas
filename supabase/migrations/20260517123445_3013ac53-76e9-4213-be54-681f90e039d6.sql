
create table public.notification_preferences (
  user_id uuid primary key,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  phone_e164 text,
  trigger_masters boolean not null default true,
  trigger_peak boolean not null default true,
  trigger_moon boolean not null default true,
  trigger_favorites boolean not null default true,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "np_select_own" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "np_insert_own" on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "np_update_own" on public.notification_preferences for update using (auth.uid() = user_id);
create policy "np_delete_own" on public.notification_preferences for delete using (auth.uid() = user_id);

create trigger np_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  channel text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date, channel, reason)
);

alter table public.notification_log enable row level security;
create policy "nl_select_own" on public.notification_log for select using (auth.uid() = user_id);
