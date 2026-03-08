
-- =============================================
-- 1. Tabela de notificações
-- =============================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 2. Tabela de avaliações
-- =============================================
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can create own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view own reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. RLS: clientes podem cancelar próprios agendamentos
-- =============================================
CREATE POLICY "Clients can cancel own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- =============================================
-- 4. Trigger: criar notificação ao mudar status
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_client_on_appointment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service_name TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

    IF NEW.status = 'confirmed' THEN
      v_title := '✅ Agendamento confirmado!';
      v_body  := 'Seu agendamento de ' || COALESCE(v_service_name, 'serviço') || ' foi confirmado. Te esperamos!';
    ELSIF NEW.status = 'completed' THEN
      v_title := '🎉 Atendimento concluído!';
      v_body  := 'Seu atendimento de ' || COALESCE(v_service_name, 'serviço') || ' foi concluído. Deixe sua avaliação!';
    ELSIF NEW.status = 'cancelled' THEN
      v_title := '❌ Agendamento cancelado';
      v_body  := 'Seu agendamento de ' || COALESCE(v_service_name, 'serviço') || ' foi cancelado.';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, title, body)
    VALUES (NEW.client_id, v_title, v_body);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_appointment_status
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_appointment_status();

-- =============================================
-- 5. Realtime para notificações
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
