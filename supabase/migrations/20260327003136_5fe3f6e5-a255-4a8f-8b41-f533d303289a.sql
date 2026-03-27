
-- Re-create profiles and user_roles for all existing auth users
-- This handles users that existed before the TRUNCATE
INSERT INTO public.profiles (user_id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client'
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
