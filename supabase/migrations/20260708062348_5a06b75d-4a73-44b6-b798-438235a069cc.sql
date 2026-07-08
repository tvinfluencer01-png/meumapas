ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS ai_provider_order text[] NOT NULL DEFAULT ARRAY['openai','lovable','anthropic','google']::text[];

UPDATE public.user_settings
SET ai_provider_order = ARRAY[COALESCE(ai_provider,'openai')] || ARRAY(
  SELECT p FROM unnest(ARRAY['openai','lovable','anthropic','google']) AS p
  WHERE p <> COALESCE(ai_provider,'openai')
)
WHERE ai_provider_order IS NULL OR array_length(ai_provider_order,1) IS NULL;