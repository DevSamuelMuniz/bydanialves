import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CalendarDays, Scissors, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ClientPendingAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*, services(name, price, duration_minutes), branches(name)")
      .eq("client_id", user.id)
      .in("status", ["pending", "confirmed"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, [user]);

  // Realtime: atualiza quando status mudar
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("pending-appointments-client")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `client_id=eq.${user.id}` },
        () => fetchPending()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const statusConfig = {
    pending: {
      label: "Aguardando confirmação",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400",
      icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
      barClass: "bg-amber-400",
    },
    confirmed: {
      label: "Confirmado! ✓",
      badgeClass: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400",
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      barClass: "bg-green-400",
    },
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Aguardando Confirmação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe em tempo real o status dos seus agendamentos pendentes.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <CheckCircle2 className="h-12 w-12 opacity-20" />
          <p className="font-medium text-base">Nenhum agendamento pendente</p>
          <p className="text-sm">Todos os seus agendamentos já foram processados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => {
            const cfg = statusConfig[a.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const dateStr = new Date(a.appointment_date + "T00:00:00").toLocaleDateString("pt-BR", {
              weekday: "long", day: "2-digit", month: "long",
            });
            return (
              <div
                key={a.id}
                className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-elevated transition-all duration-200"
              >
                <div className={`h-1.5 w-full ${cfg.barClass}`} />
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-2.5">
                    {/* Serviço */}
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-base leading-tight">{a.services?.name || "Serviço"}</span>
                    </div>

                    {/* Data e hora */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="capitalize">{dateStr}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {a.appointment_time?.slice(0, 5)}
                      </span>
                      {a.branches?.name && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {a.branches.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {cfg.icon}
                    <Badge className={`text-xs font-semibold border px-3 py-1 ${cfg.badgeClass}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
