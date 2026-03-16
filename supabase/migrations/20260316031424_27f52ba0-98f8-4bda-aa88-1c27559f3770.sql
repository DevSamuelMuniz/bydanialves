
-- Table to track hours worked per professional per period
CREATE TABLE IF NOT EXISTS public.professional_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL,
  reference_period text NOT NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  rule_id uuid REFERENCES public.bonification_rules(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(professional_id, reference_period)
);

ALTER TABLE public.professional_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage professional hours"
  ON public.professional_hours FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_professional_hours_updated_at
  BEFORE UPDATE ON public.professional_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add global rule fields to bonification_rules
ALTER TABLE public.bonification_rules 
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_period text,
  ADD COLUMN IF NOT EXISTS total_sales numeric DEFAULT 0;
