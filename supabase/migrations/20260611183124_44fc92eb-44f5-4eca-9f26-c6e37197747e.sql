CREATE TABLE public.pending_plan_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  plan_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.pending_plan_selections TO anon, authenticated;
GRANT ALL ON public.pending_plan_selections TO service_role;

ALTER TABLE public.pending_plan_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pending plan selections" ON public.pending_plan_selections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select pending plan selections by email" ON public.pending_plan_selections FOR SELECT USING (true);
CREATE POLICY "Anyone can delete pending plan selections" ON public.pending_plan_selections FOR DELETE USING (true);
