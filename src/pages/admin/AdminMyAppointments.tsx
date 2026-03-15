import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS = [
  { value: "cash",        label: "💵 Dinheiro" },
  { value: "pix",         label: "📱 PIX" },
  { value: "credit_card", label: "💳 Cartão de Crédito" },
  { value: "debit_card",  label: "💳 Cartão de Débito" },
  { value: "other",       label: "Outro" },
];
import {
  Clock, DollarSign, User, Scissors, CheckCircle2, XCircle,
  PlayCircle, ListChecks, ChevronDown, ChevronUp, CalendarIcon, RotateCcw,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendente",   color: "bg-amber-500/15 text-amber-600 border-amber-400/30" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  completed: { label: "Concluído",  color: "bg-green-500/15 text-green-700 border-green-400/30" },
  cancelled: { label: "Cancelado",  color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function AdminMyAppointments() {
  const { user, adminLevel, adminBranchId } = useAuth();
  const { toast } = useToast();
  const isAttendant = adminLevel === "attendant";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [profName, setProfName] = useState("");
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Modal de conclusão
  const [completeTarget, setCompleteTarget] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [completing, setCompleting] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfName(prof?.full_name || "");

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    let apptQuery = (supabase as any)
      .from("appointments")
      .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone)")
      .order("appointment_time", { ascending: true });

    // Atendentes veem todos os agendamentos da filial no dia; profissionais veem apenas os seus
    if (isAttendant) {
      apptQuery = apptQuery.eq("appointment_date", dateStr);
      if (adminBranchId) apptQuery = apptQuery.eq("branch_id", adminBranchId);
    } else {
      apptQuery = apptQuery
        .eq("professional_id", user.id)
        .order("appointment_date", { ascending: true });
      if (adminBranchId) apptQuery = apptQuery.eq("branch_id", adminBranchId);
    }

    const { data } = await apptQuery;
    const all = data || [];
    setConfirmed(all.filter((a: any) => ["pending", "confirmed"].includes(a.status)));
    setHistory(all.filter((a: any) => ["completed", "cancelled"].includes(a.status)).reverse());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, selectedDate]);

  useEffect(() => {
    const channel = supabase
      .channel("my-appointments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedDate]);

  const openCompleteModal = (appt: any) => {
    setCompleteTarget(appt);
    setPaymentMethod("cash");
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    setCompleting(true);
    // 1. Marca como concluído (trigger cria o registro financeiro)
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", completeTarget.id);
    if (error) {
      toast({ title: "Erro ao concluir", description: error.message, variant: "destructive" });
      setCompleting(false);
      return;
    }
    // 2. Aguarda trigger e atualiza forma de pagamento
    await new Promise((r) => setTimeout(r, 600));
    await supabase
      .from("financial_records")
      .update({ payment_method: paymentMethod })
      .eq("appointment_id", completeTarget.id);
    const label = PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
    toast({ title: "✅ Atendimento concluído!", description: `Pagamento: ${label}` });
    setCompleteTarget(null);
    setCompleting(false);
    fetchData();
  };

  const markComplete = async (id: string) => { /* kept for compat */ };

  const markCancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Atendimento cancelado." }); fetchData(); }
  };

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  const AppointmentCard = ({ a, showActions }: { a: any; showActions: boolean }) => {
    const st = statusConfig[a.status] || statusConfig.pending;
    const barColor =
      a.status === "confirmed" ? "bg-blue-500" :
      a.status === "completed" ? "bg-green-500" :
      a.status === "cancelled" ? "bg-destructive" : "bg-amber-500";

    return (
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          <div className={`h-1 w-full ${barColor}`} />
          <div className="p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{a.profiles?.full_name || "Cliente"}</p>
                  {a.profiles?.phone && (
                    <p className="text-xs text-muted-foreground">📱 {a.profiles.phone}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${st.color}`}>{st.label}</Badge>
            </div>

            <Separator />

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Scissors className="h-3 w-3" />
                <span className="font-medium text-foreground">{a.services?.name || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>
                  {isAttendant
                    ? a.appointment_time?.slice(0, 5)
                    : `${new Date(a.appointment_date + "T00:00:00").toLocaleDateString("pt-BR")} às ${a.appointment_time?.slice(0, 5)}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" />
                <span className="font-medium text-foreground">R$ {Number(a.services?.price || 0).toFixed(2)}</span>
                {a.services?.duration_minutes && (
                  <span className="ml-auto">{a.services.duration_minutes} min</span>
                )}
              </div>
            </div>

            {showActions && (
              <div className="flex gap-1.5 pt-0.5">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => openCompleteModal(a)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Concluir
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10">
                      <XCircle className="h-3 w-3" />
                      Cancelar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar atendimento?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita. O agendamento será marcado como cancelado.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        onClick={() => markCancel(a.id)}
                      >
                        Confirmar Cancelamento
                      </AlertDialogAction>
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

  const EmptyCol = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <Card className="border-dashed border-border h-32">
      <CardContent className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Icon className="h-6 w-6 mb-1.5 opacity-30" />
        <p className="text-xs text-center">{text}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">
            {isAttendant ? "Atendimentos" : "Meus Atendimentos"}
          </h1>
          {profName && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAttendant
                ? `Atendimentos de ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
                : `Olá, ${profName} — aqui estão seus atendimentos`}
            </p>
          )}
        </div>

        {/* Date filter (only for attendant) */}
        {isAttendant && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-52 justify-start text-left font-normal gap-2",
                    isToday && "border-primary/40 text-primary"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  {isToday
                    ? "Hoje"
                    : format(selectedDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {!isToday && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSelectedDate(today)}
                title="Voltar para hoje"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Em Atendimento */}
          <div className="space-y-3">
            <Card className="border-blue-400/30 bg-blue-500/5">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-blue-500" />
                  {isAttendant ? "Pendentes / Confirmados" : "Em Atendimento"}
                  <Badge variant="outline" className="ml-auto bg-blue-500/15 text-blue-600 border-blue-400/30 text-xs">
                    {confirmed.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            {confirmed.length === 0
              ? <EmptyCol icon={PlayCircle} text="Nenhum agendamento para este dia." />
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {confirmed.map((a) => <AppointmentCard key={a.id} a={a} showActions />)}
                </div>
              )
            }
          </div>

          {/* Histórico */}
          <div className="space-y-3">
            <Card className="border-border bg-muted/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  Concluídos / Cancelados
                  <Badge variant="outline" className="ml-auto text-muted-foreground text-xs">
                    {history.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1 shrink-0"
                    onClick={() => setHistoryOpen((v) => !v)}
                    title={historyOpen ? "Esconder" : "Mostrar"}
                  >
                    {historyOpen
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>
            {historyOpen && (
              history.length === 0
                ? <EmptyCol icon={ListChecks} text="Nenhum registro para este dia." />
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {history.map((a) => <AppointmentCard key={a.id} a={a} showActions={false} />)}
                  </div>
                )
            )}
          </div>

        </div>
      )}


    {/* Modal de conclusão com forma de pagamento */}
    <Dialog open={!!completeTarget} onOpenChange={(o) => !o && setCompleteTarget(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Concluir Atendimento
          </DialogTitle>
        </DialogHeader>

        {completeTarget && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={completeTarget.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {completeTarget.profiles?.full_name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{completeTarget.profiles?.full_name ?? "Cliente"}</p>
                  {completeTarget.profiles?.phone && (
                    <p className="text-xs text-muted-foreground">📱 {completeTarget.profiles.phone}</p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Serviço</p>
                  <p className="font-medium">{completeTarget.services?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Horário</p>
                  <p className="font-medium">{completeTarget.appointment_time?.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração</p>
                  <p className="font-medium">{completeTarget.services?.duration_minutes ?? "—"} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-semibold text-green-700">
                    R$ {completeTarget.services?.price?.toFixed(2) ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Forma de pagamento */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Forma de pagamento
              </label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancelar</Button>
          <Button onClick={confirmComplete} disabled={completing} className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {completing ? "Salvando..." : "Confirmar conclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
