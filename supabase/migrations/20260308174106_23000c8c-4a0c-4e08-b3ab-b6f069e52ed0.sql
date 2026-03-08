-- Enable FULL replica identity on appointments so Supabase Realtime
-- sends the complete OLD row (including status) on UPDATE events.
-- Without this, payload.old is empty and push-notification comparison fails.
ALTER TABLE public.appointments REPLICA IDENTITY FULL;