-- Fix trigger to look up the actual branch name from the appointment's branch_id
CREATE OR REPLACE FUNCTION public.create_financial_record_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_name text;
  v_service_price numeric;
  v_branch_name text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT name, price INTO v_service_name, v_service_price
    FROM public.services
    WHERE id = NEW.service_id;

    IF NEW.branch_id IS NOT NULL THEN
      SELECT name INTO v_branch_name
      FROM public.branches
      WHERE id = NEW.branch_id;
    END IF;

    IF v_branch_name IS NULL THEN
      v_branch_name := 'Principal';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.financial_records
      WHERE appointment_id = NEW.id
    ) THEN
      INSERT INTO public.financial_records (
        type,
        amount,
        description,
        category,
        payment_method,
        branch,
        appointment_id
      ) VALUES (
        'income',
        COALESCE(v_service_price, 0),
        'Atendimento: ' || COALESCE(v_service_name, 'Serviço'),
        'services',
        'other',
        v_branch_name,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;