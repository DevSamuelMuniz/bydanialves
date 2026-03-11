
-- Allow authenticated clients to view profiles of professionals (admin users)
-- so that the booking flow can display professional names and avatars
CREATE POLICY "Authenticated can view professional profiles for booking"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.user_id
        AND ur.role = 'admin'::app_role
        AND ur.admin_level IN ('professional', 'attendant')
    )
  );
