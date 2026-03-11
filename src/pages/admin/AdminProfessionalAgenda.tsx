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
import { useToast } from "@/hooks/use-toast";
import { Clock, CalendarDays, StickyNote, Trash2, DollarSign, Handshake, CheckCircle2, User, Scissors, RefreshCw, AlertCircle, XCircle, Building2, Filter, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AccessDenied } from "@/components/admin/AccessDenied";

const PAGE_SIZE = 100;

export default function AdminProfessionalAgenda() {
  const { toast } = useToast();
  const { user, adminBranchId } = useAuth();
  const { adminLevel } = useAdminPermissions();

  const isManager = adminLevel === "manager" || adminLevel === "ceo";
  const isProfessional = adminLevel === "professional";
  const isAttendant = adminLevel === "attendant";

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<{ user_id: string; full_name: string }[]>([]);
  const [profFilter, setProfFilter] = useState<string>("self");
  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  // Fetch professionals list for manager/ceo filter
  useEffect(() => {
    if (!isManager) return;
    const load = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, admin_level")
        .eq("role", "admin")
        .in("admin_level", ["professional", "attendant"]);
      if (!roles?.length) return;
      const ids = roles.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids)
        .order("full_name");
      setProfessionals(profs || []);
      setProfFilter("all");
    };
    load();
  }, [isManager]);

  useEffect(() => {
    if (!isManager) return;
    const load = async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("active", true).order("name");
      setBranches(data || []);
    };
    load();
  }, [isManager]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone)")
      .in("status", ["confirmed", "cancelled"]);

    // Professional sees only their own
    if (!isManager) {
      query = query.eq("professional_id", user?.id ?? "");
    } else {
      // Manager/CEO: filter by selected professional or branch
      if (profFilter !== "all" && profFilter !== "self") {
        query = query.eq("professional_id", profFilter);
      }
      if (adminBranchId) {
        query = query.eq("branch_id", adminBranchId);
      } else if (branchFilter !== "all") {
        query = query.eq("branch_id", branchFilter);
      }
    }

    if (dateFrom) query = query.gte("appointment_date", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) query = query.lte("appointment_date", format(dateTo, "yyyy-MM-dd"));

    const { data } = await query
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(PAGE_SIZE);

    setAppointments(data || []);
    setLoading(false);
  }, [dateFrom, dateTo, adminBranchId, branchFilter, profFilter, isManager, user]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    const channel = supabase
      .channel("prof-agenda-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "completed" | "cancelled", appointment?: any) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (status === "confirmed" && appointment) {
      toast({ title: "✅ Agendamento confirmado!", description: `${appointment.profiles?.full_name} foi notificado(a).` });
      const { data: waData } = await supabase.functions.invoke("send-whatsapp-confirmation", { body: { appointmentId: id } });
      if (waData?.ok && waData?.waUrl) window.open(waData.waUrl, "_blank");
    } else {
      toast({ title: "Status atualizado!" });
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ notes: notesValue }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Notas salvas!" }); setEditingNotes(null); }
  };

  const takeAppointment = async (a: any) => {
    if (!user) return;
    if (a.status !== "confirmed") {
      toast({ title: "Confirme antes de pegar", description: "O agendamento precisa ser confirmado primeiro.", variant: "destructive" });
      return;
    }
    setTakingId(a.id);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const profName = profile?.full_name || "Profissional";
    const noteTag = `[Atendido por: ${profName}]`;
    const newNotes = a.notes ? `${a.notes}\n${noteTag}` : noteTag;
    const { error } = await supabase.from("appointments").update({ notes: newNotes }).eq("id", a.id);
    setTakingId(null);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Agendamento pego!", description: `Você assumiu o atendimento de ${a.profiles?.full_name}.` });
  };

  const resetFilters = () => {
    setDateFrom(undefined); setDateTo(undefined); setBranchFilter("all");
    if (isManager) setProfFilter("all");
  };

  function hasAttendant(a: any) { return a.notes && a.notes.includes("[Atendido por:"); }

  const toTake    = appointments.filter((a) => a.status === "confirmed" && !hasAttendant(a));
  const toDo      = appointments.filter((a) => a.status === "confirmed" && hasAttendant(a));
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  const columns = [
    { key: "take",      title: "Confirmados",  icon: <Handshake className="h-4 w-4" />,   dot: "bg-blue-400",    headerColor: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",     items: toTake, emptyMsg: "Nenhum aguardando" },
    { key: "complete",  title: "A Concluir",   icon: <CheckCircle2 className="h-4 w-4" />, dot: "bg-green-400",   headerColor: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400", items: toDo,   emptyMsg: "Nenhum em andamento" },
    { key: "cancelled", title: "Cancelados",   icon: <XCircle className="h-4 w-4" />,      dot: "bg-destructive", headerColor: "bg-destructive/10 text-destructive",                                   items: cancelled, emptyMsg: "Nenhum cancelado" },
  ];

  const AppointmentCard = ({ a, col }: { a: any; col: typeof columns[0] }) => {
    const isTakeCol     = col.key === "take";
    const isCompleteCol = col.key === "complete";

    return (
      <Card className="border border-border overflow-hidden shadow-sm">
        <div className={`h-1 w-full ${col.dot}`} />
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{a.profiles?.full_name || "Cliente"}</p>
              {a.profiles?.phone && <p className="text-xs text-muted-foreground">📱 {a.profiles.phone}</p>}
            </div>
          </div>
          <Separator />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-3 w-3 text-primary shrink-0" />
              <span className="text-sm font-semibold truncate">{a.services?.name || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">R$ {Number(a.services?.price || 0).toFixed(2)}</span>
            </div>
          </div>
          {editingNotes === a.id ? (
            <div className="space-y-1.5">
              <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Notas..." className="text-xs" rows={2} />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={() => saveNotes(a.id)}>Salvar</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingNotes(null)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left" onClick={() => { setEditingNotes(a.id); setNotesValue(a.notes || ""); }}>
              <StickyNote className="h-3 w-3 shrink-0" />
              <span className="truncate">{a.notes ? a.notes.replace(/\[Atendido por:.*?\]/g, "").trim().slice(0, 50) || "Notas" : "Adicionar notas"}</span>
            </button>
          )}
          {hasAttendant(a) && (
            <p className="text-xs text-muted-foreground italic truncate">
              {a.notes?.match(/\[Atendido por: (.+?)\]/)?.[1] ? `👤 ${a.notes.match(/\[Atendido por: (.+?)\]/)[1]}` : ""}
            </p>
          )}
          <Separator />
          <div className="flex items-center gap-1.5 flex-wrap">
            {isTakeCol && isProfessional && (
              <Button size="sm" className="h-7 text-xs gap-1" variant="outline" onClick={() => takeAppointment(a)} disabled={takingId === a.id}>
                <Handshake className="h-3 w-3" />{takingId === a.id ? "Pegando..." : "Pegar"}
              </Button>
            )}
            {isCompleteCol && (isProfessional || isManager) && (
              <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(a.id, "completed")}>
                <CheckCircle2 className="h-3 w-3" />Concluir
              </Button>
            )}
            {col.key !== "cancelled" && (
              <div className="ml-auto">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></Button>
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Agenda do Profissional</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isProfessional ? "Seus agendamentos ativos" : `${appointments.length} agendamento(s) ativos`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchAppointments()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className={`grid grid-cols-1 gap-3 ${isManager ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
            {isManager && (
              <Select value={profFilter} onValueChange={setProfFilter}>
                <SelectTrigger className="gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {isManager && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={(d) => setDateFrom(d)} locale={ptBR} /></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={(d) => setDateTo(d)} locale={ptBR} /></PopoverContent>
            </Popover>
          </div>
          {(dateFrom || dateTo || branchFilter !== "all" || (isManager && profFilter !== "all")) && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={resetFilters}>Limpar filtros</Button>
          )}
        </CardContent>
      </Card>

      {/* Kanban */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[0,1].map(j => <Skeleton key={j} className="h-44 w-full rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${col.headerColor}`}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {col.icon}
                  {col.title}
                </div>
                <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">{col.items.length}</Badge>
              </div>
              {col.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center py-10 text-xs text-muted-foreground">
                  {col.emptyMsg}
                </div>
              ) : (
                col.items.map((a) => <AppointmentCard key={a.id} a={a} col={col} />)
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
