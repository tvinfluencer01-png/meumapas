
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "roles_select_admin_or_self" on public.user_roles
for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "roles_insert_admin" on public.user_roles
for insert with check (public.has_role(auth.uid(), 'admin'));

create policy "roles_delete_admin" on public.user_roles
for delete using (public.has_role(auth.uid(), 'admin'));

-- Twilio settings (single row)
create table public.twilio_settings (
  id boolean primary key default true,
  account_sid text,
  auth_token text,
  whatsapp_from text,
  messaging_service_sid text,
  sms_from text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint single_row check (id = true)
);

alter table public.twilio_settings enable row level security;

create policy "twilio_select_admin" on public.twilio_settings
for select using (public.has_role(auth.uid(), 'admin'));

create policy "twilio_insert_admin" on public.twilio_settings
for insert with check (public.has_role(auth.uid(), 'admin'));

create policy "twilio_update_admin" on public.twilio_settings
for update using (public.has_role(auth.uid(), 'admin'));

create trigger twilio_set_updated_at before update on public.twilio_settings
for each row execute function public.set_updated_at();

insert into public.twilio_settings (id) values (true) on conflict do nothing;
