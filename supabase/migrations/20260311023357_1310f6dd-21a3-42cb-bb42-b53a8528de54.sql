
-- Add professional_id column to appointments
ALTER TABLE public.appointments
ADD COLUMN professional_id uuid NULL;

-- Index for efficient lookups by professional
CREATE INDEX idx_appointments_professional_id ON public.appointments(professional_id);
