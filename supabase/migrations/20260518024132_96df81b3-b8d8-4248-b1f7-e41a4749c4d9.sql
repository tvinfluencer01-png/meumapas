
create table if not exists public.credit_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  credits integer not null check (credits > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.credit_packages enable row level security;

create policy "cp_select_authenticated"
  on public.credit_packages for select
  to authenticated
  using (true);

create policy "cp_insert_admin"
  on public.credit_packages for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "cp_update_admin"
  on public.credit_packages for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create policy "cp_delete_admin"
  on public.credit_packages for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create trigger trg_credit_packages_updated_at
  before update on public.credit_packages
  for each row execute function public.set_updated_at();

insert into public.credit_packages (name, description, credits, price_cents, currency, sort_order)
values
  ('Starter', '10 créditos para experimentar', 10, 1990, 'BRL', 1),
  ('Plus', '30 créditos + 5 bônus', 35, 4990, 'BRL', 2),
  ('Premium', '100 créditos + 20 bônus', 120, 14990, 'BRL', 3)
on conflict do nothing;
