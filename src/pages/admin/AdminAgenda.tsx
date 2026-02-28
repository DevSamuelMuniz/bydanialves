import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, CalendarDays, Filter, ChevronLeft, ChevronRight, StickyNote, Trash2, DollarSign, Handshake, UserCheck, CheckCircle2, XCircle, User, Scissors } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; bar: string; badge: string }> = {
  pending:   { label: "Pendente",   bar: "bg-amber-400",     badge: "bg-amber-500/15 text-amber-600 border-amber-400/30" },
  confirmed: { label: "Confirmado", bar: "bg-blue-500",      badge: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  completed: { label: "Concluído",  bar: "bg-green-500",     badge: "bg-green-500/15 text-green-700 border-green-400/30" },
  cancelled: { label: "Cancelado",  bar: "bg-destructive",   badge: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PAGE_SIZE = 20;

export default function AdminAgenda() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { adminLevel } = useAdminPermissions();
  const isProfessional = adminLevel === "professional";

  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Queue modal
  const [queueOpen, setQueueOpen] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [takingId, setTakingId] = useState<string | null>(null);

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
      .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone)", { count: "exact" });

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

  useEffect(() => { fetchServices(); }, []);
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "completed" | "cancelled") => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Status atualizado!" }); fetchAppointments(); }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ notes: notesValue }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Notas salvas!" }); setEditingNotes(null); fetchAppointments(); }
  };

  const fetchQueue = async () => {
    setQueueLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, services(name, price), profiles!appointments_client_profile_fkey(full_name, phone)")
      .in("status", ["pending", "confirmed"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });
    setQueue(data || []);
    setQueueLoading(false);
  };

  const takeAppointment = async (a: any) => {
    if (!user) return;
    setTakingId(a.id);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const profName = profile?.full_name || "Profissional";
    const noteTag = `[Atendido por: ${profName}]`;
    const newNotes = a.notes ? `${a.notes}\n${noteTag}` : noteTag;
    const { error } = await supabase.from("appointments").update({ status: "confirmed", notes: newNotes }).eq("id", a.id);
    setTakingId(null);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Agendamento pego!", description: `Você confirmou o atendimento de ${a.profiles?.full_name}.` });
      fetchQueue();
      fetchAppointments();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const resetFilters = () => {
    setDateFrom(undefined); setDateTo(undefined);
    setStatusFilter("all"); setServiceFilter("all"); setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Controle de Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalCount} agendamento(s) encontrado(s)</p>
        </div>
        {isProfessional && (
          <Button onClick={() => { setQueueOpen(true); fetchQueue(); }} className="gap-2">
            <Handshake className="h-4 w-4" />
            Pegar Agendamento
          </Button>
        )}
      </div>

      {/* Queue Modal */}
      <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Fila de Agendamentos
            </DialogTitle>
          </DialogHeader>
          {queueLoading ? (
            <div className="space-y-3 py-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : queue.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum agendamento pendente na fila.</p>
          ) : (
            <div className="space-y-3 py-2">
              {queue.map((a, i) => (
                <Card key={a.id} className="border-border">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-muted-foreground/30 w-7 text-center tabular-nums">{i + 1}</span>
                        <div>
                          <p className="font-medium">{a.profiles?.full_name || "Cliente"}</p>
                          <p className="text-sm text-muted-foreground">{a.services?.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}</span>
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {Number(a.services?.price || 0).toFixed(2)}</span>
                          </div>
                          {a.profiles?.phone && <p className="text-xs text-muted-foreground mt-0.5">📱 {a.profiles.phone}</p>}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => takeAppointment(a)} disabled={takingId === a.id} className="gap-1 shrink-0">
                        <UserCheck className="h-3 w-3" />
                        {takingId === a.id ? "Pegando..." : "Pegar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} locale={ptBR} /></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} locale={ptBR} /></PopoverContent>
            </Popover>
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
            <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Serviço" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os serviços</SelectItem>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || statusFilter !== "all" || serviceFilter !== "all") && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={resetFilters}>Limpar filtros</Button>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum agendamento encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const st = statusConfig[a.status] || statusConfig.pending;
            return (
              <Card key={a.id} className="border-border overflow-hidden">
                <CardContent className="p-0">
                  {/* Status color bar */}
                  <div className={`h-1 w-full ${st.bar}`} />

                  <div className="p-4 space-y-3">
                    {/* Top row: client info + badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{a.profiles?.full_name || "Cliente"}</p>
                          {a.profiles?.phone && <p className="text-xs text-muted-foreground">📱 {a.profiles.phone}</p>}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${st.badge}`}>{st.label}</Badge>
                    </div>

                    <Separator />

                    {/* Service + time + price */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Scissors className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{a.services?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-semibold text-foreground">R$ {Number(a.services?.price || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {editingNotes === a.id ? (
                      <div className="space-y-2">
                        <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Adicionar notas..." className="text-sm" rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(a.id)}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => { setEditingNotes(a.id); setNotesValue(a.notes || ""); }}
                      >
                        <StickyNote className="h-3 w-3" />
                        {a.notes ? a.notes.slice(0, 80) + (a.notes.length > 80 ? "..." : "") : "Adicionar notas"}
                      </button>
                    )}

                    <Separator />

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {a.status === "pending" && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-blue-600 border-blue-400/40 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => updateStatus(a.id, "confirmed")}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Confirmar
                        </Button>
                      )}
                      {(a.status === "pending" || a.status === "confirmed") && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-400/40 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => updateStatus(a.id, "completed")}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluir
                        </Button>
                      )}
                      <div className="ml-auto flex gap-2">
                        <Select value={a.status} onValueChange={(v: "pending" | "confirmed" | "completed" | "cancelled") => updateStatus(a.id, v)}>
                          <SelectTrigger className="h-8 w-32 text-xs">
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => updateStatus(a.id, "cancelled")}>Cancelar Agendamento</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
