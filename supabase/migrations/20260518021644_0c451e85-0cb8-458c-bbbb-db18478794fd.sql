
-- 1) Atomic credit consumption (security definer, bypasses RLS)
create or replace function public.consume_credits(
  _user_id uuid,
  _amount integer,
  _kind text,
  _reference text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _current integer;
begin
  if _amount is null or _amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  -- Ensure row exists
  insert into public.user_credits (user_id, balance)
  values (_user_id, 0)
  on conflict (user_id) do nothing;

  -- Lock the row
  select balance into _current
  from public.user_credits
  where user_id = _user_id
  for update;

  if _current is null or _current < _amount then
    return false;
  end if;

  update public.user_credits
  set balance = balance - _amount, updated_at = now()
  where user_id = _user_id;

  insert into public.credit_transactions (user_id, amount, kind, reference)
  values (_user_id, -_amount, _kind, _reference);

  return true;
end;
$$;

-- 2) Adjust credits (admin add/remove or grants). Positive = add, Negative = remove.
create or replace function public.adjust_credits(
  _user_id uuid,
  _amount integer,
  _kind text,
  _reference text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _new_balance integer;
begin
  if _amount = 0 then
    raise exception 'amount cannot be zero';
  end if;

  insert into public.user_credits (user_id, balance)
  values (_user_id, 0)
  on conflict (user_id) do nothing;

  update public.user_credits
  set balance = greatest(0, balance + _amount), updated_at = now()
  where user_id = _user_id
  returning balance into _new_balance;

  insert into public.credit_transactions (user_id, amount, kind, reference)
  values (_user_id, _amount, _kind, _reference);

  return _new_balance;
end;
$$;

-- 3) Add a unique constraint on user_id for user_credits to enable upsert
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_credits_user_id_key'
  ) then
    alter table public.user_credits add constraint user_credits_user_id_key unique (user_id);
  end if;
end $$;

-- 4) Welcome credits trigger for new profiles (5 free credits)
create or replace function public.grant_welcome_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 5)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, amount, kind, reference)
  values (new.id, 5, 'welcome_bonus', 'Boas-vindas Cosmic AI');

  return new;
end;
$$;

drop trigger if exists on_profile_grant_welcome_credits on public.profiles;
create trigger on_profile_grant_welcome_credits
after insert on public.profiles
for each row
execute function public.grant_welcome_credits();

-- 5) Backfill: ensure all existing profiles have a user_credits row
insert into public.user_credits (user_id, balance)
select id, 0 from public.profiles
on conflict (user_id) do nothing;
