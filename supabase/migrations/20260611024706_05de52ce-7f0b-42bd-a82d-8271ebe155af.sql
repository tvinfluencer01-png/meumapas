CREATE OR REPLACE FUNCTION public.get_table_structure(t_name text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    is_primary_key boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.udt_name::text as data_type,
        c.is_nullable::text,
        c.column_default::text,
        EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = t_name 
              AND tc.constraint_type = 'PRIMARY KEY'
              AND kcu.column_name = c.column_name
        ) as is_primary_key
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = t_name
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_table_structure(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_structure(text) TO service_role;