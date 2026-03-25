-- Add unique constraint on bonification_rules(reference_period) for upsert to work
ALTER TABLE public.bonification_rules ADD CONSTRAINT bonification_rules_reference_period_key UNIQUE (reference_period);

-- Add unique constraint on professional_hours(professional_id, reference_period) for upsert to work
ALTER TABLE public.professional_hours ADD CONSTRAINT professional_hours_prof_period_key UNIQUE (professional_id, reference_period);