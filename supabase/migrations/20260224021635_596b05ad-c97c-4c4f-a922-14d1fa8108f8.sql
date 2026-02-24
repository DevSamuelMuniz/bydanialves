
-- Allow clients to update their own subscriptions (e.g. cancel)
CREATE POLICY "Clients can update own subscriptions"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);
