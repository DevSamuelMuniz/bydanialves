
-- Allow authenticated users to see user_roles of admin users (to discover professionals for booking)
CREATE POLICY "Authenticated can view admin roles for booking"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (role = 'admin'::app_role);

-- Allow clients to see ALL professional_schedules (including inactive ones)
-- so booking logic can correctly filter availability per day
DROP POLICY IF EXISTS "Authenticated can view active schedules" ON public.professional_schedules;

CREATE POLICY "Authenticated can view all schedules"
  ON public.professional_schedules
  FOR SELECT
  TO authenticated
  USING (true);
