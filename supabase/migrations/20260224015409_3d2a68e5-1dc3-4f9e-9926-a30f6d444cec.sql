
-- Add FK from appointments.client_id to profiles.user_id for PostgREST joins
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_client_profile_fkey
FOREIGN KEY (client_id) REFERENCES public.profiles(user_id);

-- Add FK from subscriptions.client_id to profiles.user_id for PostgREST joins  
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_client_profile_fkey
FOREIGN KEY (client_id) REFERENCES public.profiles(user_id);
