
CREATE OR REPLACE FUNCTION public.cancel_appointments_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.blocked = true AND (OLD.blocked = false OR OLD.blocked IS NULL) THEN
    UPDATE public.appointments
    SET status = 'cancelled', updated_at = now()
    WHERE client_id = NEW.user_id
      AND status IN ('pending', 'confirmed');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cancel_appointments_on_block
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cancel_appointments_on_block();
