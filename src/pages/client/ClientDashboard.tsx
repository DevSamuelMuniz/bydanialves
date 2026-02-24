import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus, Clock, Crown, Filter, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

function parseEscovasFromIncludes(includes: string): number {
  const match = includes.match(/(\d+)\s*escova/i);
  return match ? parseInt(match[1], 10) : 0;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [escovasUsadas, setEscovasUsadas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      const [profileRes, apptRes, subRes, escovasRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase
          .from("appointments")
          .select("*, services(name, price, duration_minutes)")
          .eq("client_id", user.id)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true }),
        supabase.from("subscriptions").select("*, plans(*)").eq("client_id", user.id).eq("status", "active").maybeSingle(),
        supabase
          .from("appointments")
          .select("*, services(name, is_system)")
          .eq("client_id", user.id)
          .gte("appointment_date", startOfMonth)
          .lte("appointment_date", endOfMonth)
          .neq("status", "cancelled"),
      ]);
      setProfile(profileRes.data);
      setAppointments(apptRes.data || []);
      setSubscription(subRes.data);

      const escovas = (escovasRes.data || []).filter((a: any) => a.services?.is_system === true);
      setEscovasUsadas(escovas.length);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    );
  }

  const totalEscovas = subscription ? parseEscovasFromIncludes(subscription.plans?.includes || "") : 0;
  const progressPercent = totalEscovas > 0 ? Math.min((escovasUsadas / totalEscovas) * 100, 100) : 0;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Welcome */}
      <div className="animate-slide-up">
        <h1 className="font-serif text-2xl md:text-3xl tracking-tight">
          Olá, <span className="gradient-gold-text">{profile?.full_name || "Cliente"}</span> ✨
        </h1>
        <p className="text-muted-foreground mt-1.5">Bem-vinda ao seu espaço de beleza</p>
      </div>

      {/* Plan card */}
      {subscription ? (
        <Card className="border-primary/20 gradient-gold-subtle overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-gold flex items-center justify-center">
                <Crown className="h-4 w-4 text-primary-foreground" />
              </div>
              {subscription.plans?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{subscription.plans?.includes}</p>
            {totalEscovas > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Escovas usadas este mês</span>
                  <span className="font-semibold">{escovasUsadas}/{totalEscovas}</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 rounded-full" />
              </div>
            )}
            <p className="text-2xl font-serif font-bold gradient-gold-text">
              R$ {Number(subscription.plans?.price).toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-primary/20 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardContent className="py-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Crown className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Você ainda não tem um plano ativo</p>
            <Link to="/client/plans">
              <Button variant="outline">Conhecer planos</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <Link to="/client/booking">
          <Button size="lg" className="w-full md:w-auto">
            <CalendarPlus className="mr-2 h-5 w-5" />
            Novo Agendamento
          </Button>
        </Link>
      </div>

      {/* Appointments */}
      <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl tracking-tight">Agendamentos</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-sm rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(() => {
          const filtered = statusFilter === "all"
            ? appointments
            : appointments.filter((a) => a.status === statusFilter);
          return filtered.length === 0 ? (
            <Card className="border-dashed border-primary/15">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                Nenhum agendamento encontrado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((appt, i) => (
                <Card key={appt.id} className="border-border/60 hover:border-primary/20 transition-all duration-300">
                  <CardContent className="py-4 px-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{(appt as any).services?.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(appt.appointment_date).toLocaleDateString("pt-BR")} às {appt.appointment_time?.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${statusColors[appt.status]} border rounded-full px-3 py-1 text-xs font-medium`}>
                      {statusLabels[appt.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
