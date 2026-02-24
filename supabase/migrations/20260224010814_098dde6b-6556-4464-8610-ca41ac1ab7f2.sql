
-- Add blocked field to profiles
ALTER TABLE public.profiles ADD COLUMN blocked boolean NOT NULL DEFAULT false;

-- Allow admins to update any profile (for blocking)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
