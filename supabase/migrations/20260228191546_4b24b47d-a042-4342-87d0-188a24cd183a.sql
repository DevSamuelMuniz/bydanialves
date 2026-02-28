INSERT INTO storage.buckets (id, name, public)
VALUES ('branch-images', 'branch-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view branch images"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-images');

CREATE POLICY "Admins can upload branch images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branch-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can update branch images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete branch images"
ON storage.objects FOR DELETE
USING (bucket_id = 'branch-images' AND auth.role() = 'authenticated');