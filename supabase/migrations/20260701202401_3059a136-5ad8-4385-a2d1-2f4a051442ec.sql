
-- Remove public SELECT from short_links; redirect uses service role
DROP POLICY IF EXISTS "Public can resolve short links" ON public.short_links;

-- Add admin-scoped storage policies for product-landings bucket
CREATE POLICY "Admins can read product-landings"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-landings' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload product-landings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-landings' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product-landings"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-landings' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'product-landings' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product-landings"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-landings' AND public.has_role(auth.uid(), 'admin'::app_role));
