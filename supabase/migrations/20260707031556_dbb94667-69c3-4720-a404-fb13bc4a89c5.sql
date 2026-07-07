ALTER TABLE public.horoscope_free_leads REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.horoscope_free_leads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;