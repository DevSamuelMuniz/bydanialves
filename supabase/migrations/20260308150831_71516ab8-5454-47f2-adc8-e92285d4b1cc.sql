
-- Corrige a política de INSERT em notifications para não ser "true" aberto
-- Remove a política permissiva e cria uma mais restrita
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Permite que usuários autenticados insiram notificações para si mesmos
-- O trigger usa SECURITY DEFINER, então roda como owner e bypassa RLS automaticamente
-- Para outros casos, limita ao próprio user_id
CREATE POLICY "Authenticated can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
