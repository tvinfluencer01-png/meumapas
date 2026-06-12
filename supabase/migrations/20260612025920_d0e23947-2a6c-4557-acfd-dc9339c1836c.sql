
CREATE TABLE public.marketing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  weight integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_messages TO authenticated;
GRANT ALL ON public.marketing_messages TO service_role;

ALTER TABLE public.marketing_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing messages"
ON public.marketing_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketing_messages_updated_at
BEFORE UPDATE ON public.marketing_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX marketing_messages_services_idx ON public.marketing_messages USING gin (services);
