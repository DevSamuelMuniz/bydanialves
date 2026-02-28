-- Trigger: quando appointment vira 'completed', cria registro financeiro de receita automaticamente
CREATE OR REPLACE FUNCTION public.create_financial_record_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service_name text;
  v_service_price numeric;
BEGIN
  -- Só dispara quando status muda para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Busca nome e preço do serviço
    SELECT name, price INTO v_service_name, v_service_price
    FROM public.services
    WHERE id = NEW.service_id;

    -- Evita duplicata: só insere se ainda não existe registro para este appointment
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
        'Principal',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Cria o trigger na tabela appointments
DROP TRIGGER IF EXISTS trg_financial_on_completion ON public.appointments;
CREATE TRIGGER trg_financial_on_completion
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_financial_record_on_completion();
