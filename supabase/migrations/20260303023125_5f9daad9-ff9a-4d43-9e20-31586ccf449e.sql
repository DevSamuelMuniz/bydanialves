-- Adiciona coluna performed_by para registrar quem executou a ação
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS performed_by uuid;

-- Atualiza trigger de agendamentos para capturar auth.uid()
CREATE OR REPLACE FUNCTION public.log_appointment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, performed_by, action, entity, entity_id, details)
    VALUES (
      NEW.client_id,
      auth.uid(),
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
      INSERT INTO public.activity_logs (user_id, performed_by, action, entity, entity_id, details)
      VALUES (
        NEW.client_id,
        auth.uid(),
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
$function$;

-- Atualiza trigger de perfis
CREATE OR REPLACE FUNCTION public.log_profile_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.blocked IS DISTINCT FROM NEW.blocked THEN
      INSERT INTO public.activity_logs (user_id, performed_by, action, entity, entity_id, details)
      VALUES (
        NEW.user_id,
        auth.uid(),
        CASE WHEN NEW.blocked THEN 'profile_blocked' ELSE 'profile_unblocked' END,
        'profiles',
        NEW.id,
        jsonb_build_object('blocked', NEW.blocked)
      );
    END IF;
    IF OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.phone IS DISTINCT FROM NEW.phone THEN
      INSERT INTO public.activity_logs (user_id, performed_by, action, entity, entity_id, details)
      VALUES (
        NEW.user_id,
        auth.uid(),
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
$function$;

-- Atualiza trigger de assinaturas
CREATE OR REPLACE FUNCTION public.log_subscription_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, performed_by, action, entity, entity_id, details)
    VALUES (
      NEW.client_id,
      auth.uid(),
      'subscription_created',
      'subscriptions',
      NEW.id,
      jsonb_build_object('plan_id', NEW.plan_id, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.activity_logs (user_id, performed_by, action, entity, entity_id, details)
      VALUES (
        NEW.client_id,
        auth.uid(),
        'subscription_status_changed',
        'subscriptions',
        NEW.id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'plan_id', NEW.plan_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;