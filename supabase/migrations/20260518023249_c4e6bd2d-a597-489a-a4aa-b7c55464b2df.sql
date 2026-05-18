-- Add balance tracking + action column to credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS balance_before integer,
  ADD COLUMN IF NOT EXISTS balance_after integer,
  ADD COLUMN IF NOT EXISTS action text;

CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created
  ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_action
  ON public.credit_transactions (action);
CREATE INDEX IF NOT EXISTS idx_credit_tx_kind
  ON public.credit_transactions (kind);

-- Update consume_credits to record balance_before/after and action
CREATE OR REPLACE FUNCTION public.consume_credits(_user_id uuid, _amount integer, _kind text, _reference text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _before integer;
  _after integer;
begin
  if _amount is null or _amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into public.user_credits (user_id, balance)
  values (_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into _before
  from public.user_credits
  where user_id = _user_id
  for update;

  if _before is null or _before < _amount then
    return false;
  end if;

  _after := _before - _amount;

  update public.user_credits
  set balance = _after, updated_at = now()
  where user_id = _user_id;

  insert into public.credit_transactions
    (user_id, amount, kind, reference, balance_before, balance_after, action)
  values
    (_user_id, -_amount, _kind, _reference, _before, _after, _kind);

  return true;
end;
$function$;

-- Update adjust_credits to record balance_before/after and action
CREATE OR REPLACE FUNCTION public.adjust_credits(_user_id uuid, _amount integer, _kind text, _reference text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _before integer;
  _after integer;
begin
  if _amount = 0 then
    raise exception 'amount cannot be zero';
  end if;

  insert into public.user_credits (user_id, balance)
  values (_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into _before
  from public.user_credits
  where user_id = _user_id
  for update;

  _after := greatest(0, _before + _amount);

  update public.user_credits
  set balance = _after, updated_at = now()
  where user_id = _user_id;

  insert into public.credit_transactions
    (user_id, amount, kind, reference, balance_before, balance_after, action)
  values
    (_user_id, _amount, _kind, _reference, _before, _after, _kind);

  return _after;
end;
$function$;

-- Update grant_welcome_credits to also populate new columns
CREATE OR REPLACE FUNCTION public.grant_welcome_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 5)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions
    (user_id, amount, kind, reference, balance_before, balance_after, action)
  values
    (new.id, 5, 'welcome_bonus', 'Boas-vindas Cosmic AI', 0, 5, 'welcome_bonus');

  return new;
end;
$function$;
