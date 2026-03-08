import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABELS: Record<string, { title: string; body: (service: string) => string; icon: string }> = {
  confirmed: {
    title: "✅ Agendamento confirmado!",
    body: (service) => `Seu agendamento de ${service} foi confirmado. Te esperamos!`,
    icon: "/favicon.ico",
  },
  cancelled: {
    title: "❌ Agendamento cancelado",
    body: (service) => `Seu agendamento de ${service} foi cancelado.`,
    icon: "/favicon.ico",
  },
  completed: {
    title: "🎉 Atendimento concluído!",
    body: (service) => `Seu atendimento de ${service} foi concluído. Obrigada pela visita!`,
    icon: "/favicon.ico",
  },
};

function showBrowserNotification(title: string, body: string, icon: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, { body, icon });
  } catch {
    // Some browsers block notifications in iframes; fail silently
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const permissionRequested = useRef(false);

  // Request permission once the user is authenticated
  useEffect(() => {
    if (!user || permissionRequested.current) return;
    if (!("Notification" in window)) return;

    permissionRequested.current = true;

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // Subscribe to realtime appointment changes for this client
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`push-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `client_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRow = payload.new as { status: string; service_id: string };
          const oldRow = payload.old as { status: string };

          // Only fire when status actually changed
          if (newRow.status === oldRow.status) return;

          const config = STATUS_LABELS[newRow.status];
          if (!config) return;

          // Fetch service name for a meaningful notification body
          let serviceName = "serviço";
          try {
            const { data } = await supabase
              .from("services")
              .select("name")
              .eq("id", newRow.service_id)
              .single();
            if (data?.name) serviceName = data.name;
          } catch {
            // fallback to generic name
          }

          showBrowserNotification(config.title, config.body(serviceName), config.icon);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
