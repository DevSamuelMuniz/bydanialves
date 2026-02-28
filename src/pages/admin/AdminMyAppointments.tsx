import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Clock, DollarSign, User, Scissors, CheckCircle2, XCircle, PlayCircle, ListChecks } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendente",   color: "bg-amber-500/15 text-amber-600 border-amber-400/30" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  completed: { label: "Concluído",  color: "bg-green-500/15 text-green-700 border-green-400/30" },
  cancelled: { label: "Cancelado",  color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function AdminMyAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profName, setProfName] = useState("");
  const [active, setActive] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const TAG_PREFIX = "[Atendido por:";

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Get professional name
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const name = prof?.full_name || "";
    setProfName(name);

    if (!name) { setLoading(false); return; }

    // Fetch all appointments that have this professional's tag in notes
    const { data } = await supabase
      .from("appointments")
      .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone)")
      .ilike("notes", `%${TAG_PREFIX} ${name}]%`)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: true });

    const all = data || [];
    setActive(all.filter((a) => ["pending", "confirmed"].includes(a.status)));
    setHistory(all.filter((a) => ["completed", "cancelled"].includes(a.status)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

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
    return (
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          {/* Color bar by status */}
          <div className={`h-1 w-full ${
            a.status === "confirmed" ? "bg-blue-500" :
            a.status === "completed" ? "bg-green-500" :
            a.status === "cancelled" ? "bg-destructive" : "bg-amber-500"
          }`} />
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold leading-tight">{a.profiles?.full_name || "Cliente"}</p>
                  {a.profiles?.phone && (
                    <p className="text-xs text-muted-foreground">📱 {a.profiles.phone}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${st.color}`}>{st.label}</Badge>
            </div>

            <Separator />

            {/* Service details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Scissors className="h-3.5 w-3.5" />
                <span>{a.services?.name || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">R$ {Number(a.services?.price || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}</span>
              </div>
              {a.services?.duration_minutes && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>{a.services.duration_minutes} min</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => markComplete(a.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Concluir
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
                      <XCircle className="h-3.5 w-3.5" />
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl">Meus Atendimentos</h1>
        {profName && <p className="text-sm text-muted-foreground mt-0.5">Olá, {profName} — aqui estão seus atendimentos</p>}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {/* Active */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold text-lg">Em andamento / Confirmados</h2>
              {active.length > 0 && (
                <Badge className="bg-blue-500/15 text-blue-600 border-blue-400/30" variant="outline">{active.length}</Badge>
              )}
            </div>
            {active.length === 0 ? (
              <Card className="border-dashed border-border">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <PlayCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum atendimento ativo no momento.</p>
                  <p className="text-sm mt-1">Use "Pegar Agendamento" na Agenda para assumir um cliente.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {active.map((a) => <AppointmentCard key={a.id} a={a} showActions />)}
              </div>
            )}
          </div>

          {/* History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Histórico</h2>
              {history.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground">{history.length}</Badge>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">Nenhum atendimento concluído ou cancelado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {history.map((a) => <AppointmentCard key={a.id} a={a} showActions={false} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
