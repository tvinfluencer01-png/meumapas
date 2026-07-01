
CREATE POLICY "affiliate_bucket_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'affiliate' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_affiliate_role(auth.uid(),'affiliate_admin')
    OR (storage.foldername(name))[1] = 'materials'
  ));
CREATE POLICY "affiliate_bucket_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'affiliate' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_affiliate_role(auth.uid(),'affiliate_admin')
  ));
CREATE POLICY "affiliate_bucket_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'affiliate' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_affiliate_role(auth.uid(),'affiliate_admin')
  ));
CREATE POLICY "affiliate_bucket_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'affiliate' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_affiliate_role(auth.uid(),'affiliate_admin')
  ));
