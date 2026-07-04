ALTER TABLE public.affiliate_conversions REPLICA IDENTITY FULL;
ALTER TABLE public.affiliate_commissions REPLICA IDENTITY FULL;
ALTER TABLE public.affiliate_orders REPLICA IDENTITY FULL;
ALTER TABLE public.affiliate_clicks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_conversions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_clicks;