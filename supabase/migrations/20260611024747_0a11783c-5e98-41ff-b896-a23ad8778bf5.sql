CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE (table_name text) AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tables() TO service_role;