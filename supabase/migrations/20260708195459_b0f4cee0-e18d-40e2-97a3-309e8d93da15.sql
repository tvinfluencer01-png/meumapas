
UPDATE public.user_settings
SET custom_ai_model = NULL
WHERE custom_ai_model IN ('gpt-5.5','gpt-5','gpt-5-mini','gpt-5-nano');

UPDATE public.user_settings
SET ai_providers_config = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value->>'model' IN ('gpt-5.5','gpt-5','gpt-5-mini','gpt-5-nano')
        THEN value - 'model'
      ELSE value
    END
  )
  FROM jsonb_each(ai_providers_config)
)
WHERE ai_providers_config IS NOT NULL
  AND ai_providers_config::text ~ 'gpt-5';
