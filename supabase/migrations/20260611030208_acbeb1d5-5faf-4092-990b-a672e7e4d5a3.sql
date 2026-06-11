CREATE OR REPLACE FUNCTION public.get_public_enums()
RETURNS TABLE (type_name text, enum_label text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.typname::text as type_name,
        e.enumlabel::text as enum_label
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_enums() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_enums() TO authenticated;