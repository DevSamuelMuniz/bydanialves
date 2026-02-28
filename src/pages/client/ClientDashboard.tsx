import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus, Clock, Crown, Filter, Sparkles, MapPin, Scissors, CheckCircle2, XCircle, AlertCircle, Timer } from "lucide-react";
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
      <div className="space-y-6 w-full">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    );
  }

  const totalEscovas = subscription ? parseEscovasFromIncludes(subscription.plans?.includes || "") : 0;
  const progressPercent = totalEscovas > 0 ? Math.min((escovasUsadas / totalEscovas) * 100, 100) : 0;

  return (
    <div className="space-y-8 w-full">
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
              {filtered.map((appt) => {
                const statusIcon = {
                  pending: <AlertCircle className="h-4 w-4" />,
                  confirmed: <CheckCircle2 className="h-4 w-4" />,
                  completed: <CheckCircle2 className="h-4 w-4" />,
                  cancelled: <XCircle className="h-4 w-4" />,
                }[appt.status] ?? <AlertCircle className="h-4 w-4" />;

                const dateFormatted = new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "long", year: "numeric"
                });
                const timeFormatted = appt.appointment_time?.slice(0, 5);
                const price = Number(appt.services?.price ?? 0);
                const duration = appt.services?.duration_minutes;

                return (
                  <Card key={appt.id} className="border-border/60 hover:border-primary/30 transition-all duration-300 overflow-hidden">
                    {/* colored left bar */}
                    <div className={`h-full absolute left-0 top-0 w-1 rounded-l-lg ${
                      appt.status === "confirmed" ? "bg-primary" :
                      appt.status === "completed" ? "bg-success" :
                      appt.status === "cancelled" ? "bg-destructive" :
                      "bg-warning"
                    }`} />
                    <CardContent className="pl-6 pr-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: main info */}
                        <div className="flex-1 space-y-3 min-w-0">
                          {/* Service name + badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Scissors className="h-4 w-4 text-primary" />
                            </div>
                            <p className="font-serif font-semibold text-base leading-tight">{appt.services?.name ?? "Serviço"}</p>
                            <Badge variant="outline" className={`${statusColors[appt.status]} border rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1`}>
                              {statusIcon}
                              {statusLabels[appt.status]}
                            </Badge>
                          </div>

                          {/* Date + Time row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-primary/60" />
                              <span className="capitalize">{dateFormatted}</span>
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              <span className="text-primary font-bold">{timeFormatted}</span>
                            </span>
                          </div>

                          {/* Duration + Price row */}
                          <div className="flex flex-wrap items-center gap-3">
                            {duration && (
                              <span className="flex items-center gap-1.5 text-xs bg-muted rounded-full px-3 py-1">
                                <Timer className="h-3 w-3 text-muted-foreground" />
                                {duration} min
                              </span>
                            )}
                            {price > 0 ? (
                              <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-semibold">
                                R$ {price.toFixed(2)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs bg-success/10 text-success rounded-full px-3 py-1 font-semibold">
                                Incluso no plano
                              </span>
                            )}
                            {appt.notes && (
                              <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                                "{appt.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
