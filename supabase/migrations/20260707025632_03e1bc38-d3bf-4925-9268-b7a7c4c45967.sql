ALTER TABLE public.horoscope_landing_settings
ADD COLUMN IF NOT EXISTS expiry_reminder_template text
NOT NULL DEFAULT '⚠️ Olá {{name}}, seu cadastro no horóscopo grátis expira em ~{{minutes_left}} min. Envie *{{keyword}}-{{code}}* agora para garantir seus {{trial_days}} dias grátis. ✨';