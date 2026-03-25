
CREATE TABLE public.professional_day_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  blocked_date DATE NOT NULL,
  blocked_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (professional_id, blocked_date)
);

ALTER TABLE public.professional_day_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage day blocks"
  ON public.professional_day_blocks
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view day blocks"
  ON public.professional_day_blocks
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
