
CREATE TABLE public.work_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view work calendar"
  ON public.work_calendar
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage work calendar"
  ON public.work_calendar
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_work_calendar_updated_at
  BEFORE UPDATE ON public.work_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
