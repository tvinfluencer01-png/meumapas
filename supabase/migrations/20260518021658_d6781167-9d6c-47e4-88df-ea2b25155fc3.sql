
revoke execute on function public.consume_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.adjust_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.grant_welcome_credits() from public, anon, authenticated;
