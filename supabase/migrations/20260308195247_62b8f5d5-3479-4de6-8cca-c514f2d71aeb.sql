CREATE TABLE public.queue_tv_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  label text NOT NULL DEFAULT 'Link público',
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.queue_tv_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage queue tv tokens"
ON public.queue_tv_tokens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));