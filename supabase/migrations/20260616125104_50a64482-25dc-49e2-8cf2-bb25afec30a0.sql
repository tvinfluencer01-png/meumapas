
CREATE TABLE public.user_section_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_section_guides TO authenticated;
GRANT ALL ON public.user_section_guides TO service_role;

ALTER TABLE public.user_section_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "section_guides_select_own"
  ON public.user_section_guides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "section_guides_insert_own"
  ON public.user_section_guides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "section_guides_update_own"
  ON public.user_section_guides FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "section_guides_delete_own"
  ON public.user_section_guides FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_user_section_guides_updated_at
  BEFORE UPDATE ON public.user_section_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_user_section_guides_user ON public.user_section_guides(user_id);
