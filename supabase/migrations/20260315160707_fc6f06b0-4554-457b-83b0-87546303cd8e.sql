
-- Create bonification_rules table
CREATE TABLE public.bonification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  percentage numeric NOT NULL DEFAULT 10,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create bonification_payments table
CREATE TABLE public.bonification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.bonification_rules(id) ON DELETE SET NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL,
  reference_period text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonification_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for bonification_rules (admin only)
CREATE POLICY "Admins can manage bonification rules"
  ON public.bonification_rules
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for bonification_payments (admin only)
CREATE POLICY "Admins can manage bonification payments"
  ON public.bonification_payments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to auto-update updated_at on bonification_rules
CREATE TRIGGER update_bonification_rules_updated_at
  BEFORE UPDATE ON public.bonification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
