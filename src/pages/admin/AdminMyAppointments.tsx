import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Clock, DollarSign, User, Scissors, CheckCircle2, XCircle, PlayCircle, ListChecks, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendente",   color: "bg-amber-500/15 text-amber-600 border-amber-400/30" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  completed: { label: "Concluído",  color: "bg-green-500/15 text-green-700 border-green-400/30" },
  cancelled: { label: "Cancelado",  color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function AdminMyAppointments() {
  const { user, adminBranchId } = useAuth();
  const { toast } = useToast();

  const [profName, setProfName] = useState("");
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  const TAG_PREFIX = "[Atendido por:";

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const name = prof?.full_name || "";
    setProfName(name);

    if (!name) { setLoading(false); return; }

    let apptQuery = supabase
      .from("appointments")
      .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone)")
      .ilike("notes", `%${TAG_PREFIX} ${name}]%`)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    // Filter by branch if staff is assigned to one
    if (adminBranchId) apptQuery = apptQuery.eq("branch_id", adminBranchId);

    const { data } = await apptQuery;

    const all = data || [];
    setConfirmed(all.filter((a) => ["pending", "confirmed"].includes(a.status)));
    setHistory(all.filter((a) => ["completed", "cancelled"].includes(a.status)).reverse());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel("my-appointments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markComplete = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Serviço concluído!" }); fetchData(); }
  };

  const markCancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Atendimento cancelado." }); fetchData(); }
  };

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
                <span>{new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}</span>
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
                  className="flex-1 h-7 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => markComplete(a.id)}
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
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => markCancel(a.id)}>Confirmar Cancelamento</AlertDialogAction>
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
      <div>
        <h1 className="font-serif text-2xl">Meus Atendimentos</h1>
        {profName && <p className="text-sm text-muted-foreground mt-0.5">Olá, {profName} — aqui estão seus atendimentos</p>}
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
                  Em Atendimento
                  <Badge variant="outline" className="ml-auto bg-blue-500/15 text-blue-600 border-blue-400/30 text-xs">
                    {confirmed.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            {confirmed.length === 0
              ? <EmptyCol icon={PlayCircle} text="Nenhum em andamento. Use 'Pegar Agendamento' na Agenda." />
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
                  Histórico
                  <Badge variant="outline" className="ml-auto text-muted-foreground text-xs">
                    {history.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1 shrink-0"
                    onClick={() => setHistoryOpen((v) => !v)}
                    title={historyOpen ? "Esconder histórico" : "Mostrar histórico"}
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
                ? <EmptyCol icon={ListChecks} text="Nenhum histórico ainda" />
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {history.map((a) => <AppointmentCard key={a.id} a={a} showActions={false} />)}
                  </div>
                )
            )}
          </div>

        </div>
      )}
    </div>
  );
}
