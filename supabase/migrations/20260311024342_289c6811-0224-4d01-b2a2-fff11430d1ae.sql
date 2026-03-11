
-- Tabela de escalas de trabalho dos profissionais
CREATE TABLE public.professional_schedules (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid    NOT NULL,
  branch_id       uuid    NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  day_of_week     integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      time    NOT NULL DEFAULT '08:00',
  end_time        time    NOT NULL DEFAULT '17:00',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prof_schedules_professional ON public.professional_schedules(professional_id);
CREATE INDEX idx_prof_schedules_branch       ON public.professional_schedules(branch_id);
CREATE INDEX idx_prof_schedules_day          ON public.professional_schedules(professional_id, day_of_week);

CREATE TRIGGER update_professional_schedules_updated_at
  BEFORE UPDATE ON public.professional_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active schedules"
  ON public.professional_schedules FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage professional schedules"
  ON public.professional_schedules FOR ALL
  TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
