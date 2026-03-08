import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Filter, MapPin, Scissors, CalendarDays, BanknoteIcon, StickyNote, Timer } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusBarColors: Record<string, string> = {
  pending: "bg-warning",
  confirmed: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-destructive",
};

const statusBadgeColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
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
      .select("*, services(name, price, description, duration_minutes), branches(name, address)")
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {appointments.map((appt) => {
            const dateFormatted = new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const timeFormatted = appt.appointment_time?.slice(0, 5);
            const price = Number(appt.services?.price ?? 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });
            const duration = appt.services?.duration_minutes;
            const branchName = appt.branches?.name;
            const branchAddress = appt.branches?.address;

            return (
              <div
                key={appt.id}
                className="relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-elegant hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Status top bar */}
                <div className={`h-1 w-full ${statusBarColors[appt.status]}`} />

                {/* Card body */}
                <div className="flex flex-col gap-3 p-4 flex-1">

                  {/* Service name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-semibold text-sm leading-tight line-clamp-2">
                        {appt.services?.name ?? "Serviço"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-xs shrink-0 ${statusBadgeColors[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </Badge>
                  </div>

                  <div className="border-t border-border/40" />

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{dateFormatted}</span>
                  </div>

                  {/* Time + duration */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-foreground">{timeFormatted}</span>
                    </div>
                    {duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        {duration} min
                      </div>
                    )}
                  </div>

                  {/* Branch */}
                  {branchName && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground leading-tight truncate">{branchName}</p>
                        {branchAddress && (
                          <p className="text-xs text-muted-foreground leading-tight line-clamp-1">{branchAddress}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/40 mt-auto" />

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BanknoteIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-serif font-semibold text-foreground text-sm">{price}</span>
                    </div>
                    {appt.notes && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground" title={appt.notes}>
                        <StickyNote className="h-3 w-3" />
                        <span className="truncate max-w-[60px]">Obs.</span>
                      </div>
                    )}
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
