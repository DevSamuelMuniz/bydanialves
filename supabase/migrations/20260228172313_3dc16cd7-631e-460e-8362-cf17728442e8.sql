
-- Create branches table
CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active branches
CREATE POLICY "Anyone authenticated can view active branches"
  ON public.branches FOR SELECT
  TO authenticated
  USING (active = true);

-- Only admins can manage branches
CREATE POLICY "Admins can manage branches"
  ON public.branches FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add branch_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add branch_id to appointments
ALTER TABLE public.appointments
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Insert a default branch so the system works right away
INSERT INTO public.branches (name, address) VALUES ('Filial Principal', 'Endereço a configurar');
