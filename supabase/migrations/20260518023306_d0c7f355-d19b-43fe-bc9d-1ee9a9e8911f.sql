REVOKE ALL ON FUNCTION public.consume_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_credits(uuid, integer, text, text) TO service_role;