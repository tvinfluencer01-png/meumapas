CREATE TABLE public.calendar_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.calendar_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fav_select_own" ON public.calendar_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON public.calendar_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_update_own" ON public.calendar_favorites
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fav_delete_own" ON public.calendar_favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_calendar_favorites_user_date ON public.calendar_favorites(user_id, date);