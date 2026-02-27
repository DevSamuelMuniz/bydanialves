import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Filter } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function ClientHistory() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("*, services(name, price)")
      .eq("client_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }

    const { data } = await query;
    setAppointments(data || []);
    setLoading(false);
  }, [user, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <div className="w-full space-y-6">
      <h1 className="font-serif text-2xl">Histórico</h1>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {appointments.map((appt) => {
            const imgUrl = (appt as any).services?.image_url ||
              `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=60&auto=format&fit=crop`;
            return (
              <div key={appt.id} className="relative overflow-hidden rounded-xl border border-gold/10 h-36">
                {/* Background image */}
                <img
                  src={imgUrl}
                  alt={(appt as any).services?.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-end p-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-semibold text-white text-base leading-tight mb-1">
                        {(appt as any).services?.name}
                      </p>
                      <p className="text-xs text-white/70 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(appt.appointment_date).toLocaleDateString("pt-BR")} às {appt.appointment_time?.slice(0, 5)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={statusColors[appt.status]}>
                        {statusLabels[appt.status]}
                      </Badge>
                      <p className="font-serif text-base text-white">
                        R$ {Number((appt as any).services?.price).toFixed(2)}
                      </p>
                    </div>
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
