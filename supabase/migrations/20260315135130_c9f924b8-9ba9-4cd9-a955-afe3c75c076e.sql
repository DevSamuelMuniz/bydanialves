
-- Tabela para vincular profissionais a planos
CREATE TABLE public.plan_professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (plan_id, professional_id)
);

ALTER TABLE public.plan_professionals ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar
CREATE POLICY "Admins can manage plan_professionals"
  ON public.plan_professionals
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Leitura pública (para exibição no agendamento)
CREATE POLICY "Anyone can read plan_professionals"
  ON public.plan_professionals
  FOR SELECT
  USING (true);
