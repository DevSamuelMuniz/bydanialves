import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, CalendarDays, Filter, ChevronLeft, ChevronRight, StickyNote, Trash2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const PAGE_SIZE = 20;

export default function AdminAgenda() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  // Notes
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name").order("name");
    setServices(data || []);
  };

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("*, services(name, price), profiles!appointments_client_id_fkey(full_name)", { count: "exact" });

    if (dateFrom) query = query.gte("appointment_date", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) query = query.lte("appointment_date", format(dateTo, "yyyy-MM-dd"));
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    if (serviceFilter !== "all") query = query.eq("service_id", serviceFilter);

    const { data, count } = await query
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setAppointments(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [dateFrom, dateTo, statusFilter, serviceFilter, page]);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "completed" | "cancelled") => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      fetchAppointments();
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ notes: notesValue }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Notas salvas!" });
      setEditingNotes(null);
      fetchAppointments();
    }
  };

  const cancelAppointment = async (id: string) => {
    await updateStatus(id, "cancelled");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatusFilter("all");
    setServiceFilter("all");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Controle de Agenda</h1>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} locale={ptBR} /></PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} locale={ptBR} /></PopoverContent>
            </Popover>

            {/* Status */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            {/* Service */}
            <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Serviço" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os serviços</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || statusFilter !== "all" || serviceFilter !== "all") && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={resetFilters}>Limpar filtros</Button>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{totalCount} agendamento(s) encontrado(s)</p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <Card key={a.id} className="border-border">
              <CardContent className="py-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{a.profiles?.full_name || "Cliente"}</p>
                    <p className="text-sm text-muted-foreground">{a.services?.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        R$ {Number(a.services?.price || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={a.status} onValueChange={(v: "pending" | "confirmed" | "completed" | "cancelled") => updateStatus(a.id, v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    {a.status !== "cancelled" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelAppointment(a.id)}>Cancelar Agendamento</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {editingNotes === a.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Adicionar notas..."
                      className="text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNotes(a.id)}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => { setEditingNotes(a.id); setNotesValue(a.notes || ""); }}
                  >
                    <StickyNote className="h-3 w-3" />
                    {a.notes ? a.notes.slice(0, 80) + (a.notes.length > 80 ? "..." : "") : "Adicionar notas"}
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
