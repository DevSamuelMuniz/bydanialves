import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus, Clock, Crown, Filter } from "lucide-react";
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
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
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
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false }),
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

      // Count escovas used
      const escovas = (escovasRes.data || []).filter((a: any) =>
        a.services?.is_system === true
      );
      setEscovasUsadas(escovas.length);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalEscovas = subscription ? parseEscovasFromIncludes(subscription.plans?.includes || "") : 0;
  const progressPercent = totalEscovas > 0 ? Math.min((escovasUsadas / totalEscovas) * 100, 100) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">
          Olá, {profile?.full_name || "Cliente"} ✨
        </h1>
        <p className="text-muted-foreground mt-1">Bem-vinda ao seu espaço de beleza</p>
      </div>

      {/* Plan card */}
      {subscription ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" /> {subscription.plans?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{subscription.plans?.includes}</p>
            {totalEscovas > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Escovas usadas este mês</span>
                  <span className="font-medium">{escovasUsadas}/{totalEscovas}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
            <p className="text-xl font-serif font-bold text-primary">
              R$ {Number(subscription.plans?.price).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-primary/20">
          <CardContent className="py-6 text-center space-y-3">
            <Crown className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não tem um plano ativo</p>
            <Link to="/client/plans">
              <Button variant="outline">Conhecer planos</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Link to="/client/booking">
        <Button size="lg" className="w-full md:w-auto">
          <CalendarPlus className="mr-2 h-5 w-5" />
          Novo Agendamento
        </Button>
      </Link>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg">Próximos Agendamentos</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-sm">
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
            <Card className="border-dashed border-primary/20">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum agendamento encontrado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((appt) => (
                <Card key={appt.id} className="border-border">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{(appt as any).services?.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(appt.appointment_date).toLocaleDateString("pt-BR")} às {appt.appointment_time?.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant="secondary" className={statusColors[appt.status]}>
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
