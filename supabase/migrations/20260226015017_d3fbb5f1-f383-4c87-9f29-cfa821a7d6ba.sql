
-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON public.activity_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own logs
CREATE POLICY "Users can insert own logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert logs (for server-side/trigger use)
CREATE POLICY "Admins can insert logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger function: log appointment changes
CREATE OR REPLACE FUNCTION public.log_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action, entity, entity_id, details)
    VALUES (
      NEW.client_id,
      'appointment_created',
      'appointments',
      NEW.id,
      jsonb_build_object(
        'service_id', NEW.service_id,
        'appointment_date', NEW.appointment_date,
        'appointment_time', NEW.appointment_time,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.activity_logs (user_id, action, entity, entity_id, details)
      VALUES (
        NEW.client_id,
        'appointment_status_changed',
        'appointments',
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'appointment_date', NEW.appointment_date,
          'appointment_time', NEW.appointment_time
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on appointments
CREATE TRIGGER trg_log_appointment
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_appointment_change();

-- Trigger function: log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.blocked IS DISTINCT FROM NEW.blocked THEN
      INSERT INTO public.activity_logs (user_id, action, entity, entity_id, details)
      VALUES (
        NEW.user_id,
        CASE WHEN NEW.blocked THEN 'profile_blocked' ELSE 'profile_unblocked' END,
        'profiles',
        NEW.id,
        jsonb_build_object('blocked', NEW.blocked)
      );
    END IF;
    IF OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.phone IS DISTINCT FROM NEW.phone THEN
      INSERT INTO public.activity_logs (user_id, action, entity, entity_id, details)
      VALUES (
        NEW.user_id,
        'profile_updated',
        'profiles',
        NEW.id,
        jsonb_build_object(
          'full_name', NEW.full_name,
          'phone', NEW.phone
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on profiles
CREATE TRIGGER trg_log_profile
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_change();

-- Trigger function: log subscription changes
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, action, entity, entity_id, details)
    VALUES (
      NEW.client_id,
      'subscription_created',
      'subscriptions',
      NEW.id,
      jsonb_build_object('plan_id', NEW.plan_id, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.activity_logs (user_id, action, entity, entity_id, details)
      VALUES (
        NEW.client_id,
        'subscription_status_changed',
        'subscriptions',
        NEW.id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'plan_id', NEW.plan_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on subscriptions
CREATE TRIGGER trg_log_subscription
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();
