import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, User, Clock, Scissors, DollarSign, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/40" },
  confirmed: { label: "Confirmado", color: "bg-primary/15 text-primary border-primary/40" },
  completed: { label: "Concluído", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/40" },
};

interface ClientAppointmentsFilterProps {
  /** Called when user selects a client in the filter — parent can use to highlight */
  onClientSelect?: (clientId: string | null) => void;
}

export default function ClientAppointmentsFilter({ onClientSelect }: ClientAppointmentsFilterProps) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<{ user_id: string; full_name: string; phone: string | null }[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ user_id: string; full_name: string } | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load clients once
  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      if (!roles?.length) return;
      const ids = roles.map((r) => r.user_id);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", ids)
        .order("full_name");
      setClients(data || []);
    };
    load();
  }, []);

  const filtered = search.trim().length >= 2
    ? clients.filter((c) =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
      )
    : [];

  const fetchClientAppointments = useCallback(async (clientId: string) => {
    setLoadingAppts(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone), branches!appointments_branch_id_fkey(name)")
      .eq("client_id", clientId)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false })
      .limit(200);
    setAppointments(data || []);
    setLoadingAppts(false);
  }, []);

  const handleSelect = (client: { user_id: string; full_name: string }) => {
    setSelectedClient(client);
    setSearch("");
    setShowDropdown(false);
    fetchClientAppointments(client.user_id);
    onClientSelect?.(client.user_id);
  };

  const handleClose = () => {
    setSelectedClient(null);
    setAppointments([]);
    onClientSelect?.(null);
  };

  const handleClear = () => {
    setSearch("");
    setShowDropdown(false);
    onClientSelect?.(null);
  };

  return (
    <>
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => search.trim().length >= 2 && setShowDropdown(true)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {search && (
            <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.slice(0, 10).map((c) => (
              <button
                key={c.user_id}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2 text-sm"
                onClick={() => handleSelect(c)}
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.full_name}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal with all appointments */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Agendamentos de {selectedClient?.full_name}
            </DialogTitle>
            <DialogDescription>
              {appointments.length} agendamento(s) encontrado(s)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {loadingAppts ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : appointments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Nenhum agendamento encontrado.</div>
            ) : (
              <div className="space-y-3 pb-4">
                {appointments.map((a) => {
                  const st = STATUS_MAP[a.status] || STATUS_MAP.pending;
                  return (
                    <div key={a.id} className={cn("rounded-lg border p-3 space-y-1.5", st.color.split(" ")[0])}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Scissors className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-sm truncate">{a.services?.name || "Serviço"}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-xs shrink-0", st.color)}>
                          {st.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(a.appointment_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {a.appointment_time?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {Number(a.services?.price || 0).toFixed(2)}
                        </span>
                        {a.branches?.name && (
                          <span className="flex items-center gap-1">
                            🏢 {a.branches.name}
                          </span>
                        )}
                      </div>
                      {a.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">📝 {a.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
