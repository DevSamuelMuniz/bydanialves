
CREATE OR REPLACE FUNCTION public.get_professionals_for_booking(p_branch_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, bio text, admin_level text, day_of_week integer, start_time text, end_time text, schedule_active boolean, schedule_branch_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pr.user_id,
    pr.full_name,
    pr.avatar_url,
    pr.bio,
    ur.admin_level::text,
    ps.day_of_week,
    ps.start_time::text,
    ps.end_time::text,
    ps.active as schedule_active,
    ps.branch_id as schedule_branch_id
  FROM user_roles ur
  JOIN profiles pr ON pr.user_id = ur.user_id
  LEFT JOIN professional_schedules ps ON ps.professional_id = ur.user_id
    AND (ps.branch_id = p_branch_id OR ps.branch_id IS NULL)
  WHERE ur.role = 'admin'
    AND ur.admin_level = 'professional'
    AND (ur.branch_id = p_branch_id OR ur.branch_id IS NULL)
  ORDER BY pr.full_name, ps.day_of_week;
$function$
