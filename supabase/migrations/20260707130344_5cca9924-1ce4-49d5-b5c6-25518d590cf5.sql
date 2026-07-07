
UPDATE public.horoscope_free_leads
SET
  trial_starts_on = (activated_at AT TIME ZONE 'America/Sao_Paulo')::date,
  trial_ends_on = ((activated_at AT TIME ZONE 'America/Sao_Paulo')::date + (COALESCE(trial_days, 7) - 1))
WHERE status = 'active'
  AND activated_at IS NOT NULL
  AND trial_starts_on > (activated_at AT TIME ZONE 'America/Sao_Paulo')::date;
