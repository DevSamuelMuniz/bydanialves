import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Filter, MapPin, Scissors, CalendarDays, BanknoteIcon, StickyNote } from "lucide-react";

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
      .select("*, services(name, price, description, duration_minutes, image_url), branches(name, address)")
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
            <Skeleton key={i} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {appointments.map((appt) => {
            const imgUrl =
              appt.services?.image_url ||
              `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=60&auto=format&fit=crop`;
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
                className="relative flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden shadow-elegant hover:shadow-elevated transition-all duration-300 group"
              >
                {/* Status top bar */}
                <div className={`h-1.5 w-full ${statusBarColors[appt.status]}`} />

                {/* Service image */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={appt.services?.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Badge over image */}
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <p className="font-serif text-white text-base font-semibold leading-tight drop-shadow">
                      {appt.services?.name ?? "Serviço"}
                    </p>
                    <Badge variant="secondary" className={`text-xs shrink-0 ml-2 ${statusBadgeColors[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </Badge>
                  </div>
                </div>

                {/* Info body */}
                <div className="flex flex-col gap-2.5 p-4 flex-1">
                  {/* Date & time */}
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{dateFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground">{timeFormatted}</span>
                    {duration && (
                      <span className="text-muted-foreground text-xs ml-auto">~{duration} min</span>
                    )}
                  </div>

                  {/* Branch */}
                  {branchName && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-foreground font-medium leading-tight truncate">{branchName}</p>
                        {branchAddress && (
                          <p className="text-muted-foreground text-xs leading-tight line-clamp-2">{branchAddress}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-border/40 my-0.5" />

                  {/* Price & duration */}
                  <div className="flex items-center gap-2 text-sm">
                    <BanknoteIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-serif text-foreground font-semibold">{price}</span>
                  </div>

                  {/* Service description */}
                  {appt.services?.description && (
                    <div className="flex items-start gap-2 text-xs">
                      <Scissors className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed">{appt.services.description}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {appt.notes && (
                    <div className="flex items-start gap-2 text-xs">
                      <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed italic">{appt.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
