
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Receipts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));
