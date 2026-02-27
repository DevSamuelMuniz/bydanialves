
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Service role can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-images');

CREATE POLICY "Service role can update service images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-images');
