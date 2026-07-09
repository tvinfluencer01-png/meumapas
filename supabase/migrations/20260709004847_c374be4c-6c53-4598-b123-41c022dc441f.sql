CREATE OR REPLACE FUNCTION public.get_public_policies()
RETURNS TABLE(
  table_name text,
  policy_name text,
  cmd text,
  roles text[],
  permissive text,
  qual text,
  with_check text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tablename::text,
    policyname::text,
    cmd::text,
    roles::text[],
    permissive::text,
    qual::text,
    with_check::text
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

REVOKE ALL ON FUNCTION public.get_public_policies() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_policies() TO service_role;