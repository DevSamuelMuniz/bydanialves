import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, DollarSign, Users, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function AdminDashboard() {
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ day: string; value: number }[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

    Promise.all([
      supabase.from("appointments").select("*, services(name), profiles!appointments_client_id_fkey(full_name)").eq("appointment_date", today).order("appointment_time"),
      supabase.from("financial_records").select("amount, created_at").eq("type", "income").gte("created_at", monthStart),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", weekStart).lte("appointment_date", today),
      supabase.from("financial_records").select("amount, created_at").eq("type", "income").gte("created_at", weekStart),
      supabase.from("profiles").select("full_name, created_at").order("created_at", { ascending: false }).limit(5),
    ]).then(([apptRes, finRes, clientRes, pendingRes, weekRes, weekFinRes, recentRes]) => {
      setTodayAppointments(apptRes.data || []);
      setMonthRevenue((finRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0));
      setTotalClients(clientRes.count || 0);
      setPendingCount(pendingRes.count || 0);
      setWeekCount(weekRes.count || 0);
      setRecentClients(recentRes.data || []);

      // Build weekly chart data
      const dayMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap[d] = 0;
      }
      for (const r of weekFinRes.data || []) {
        const d = r.created_at.split("T")[0];
        if (dayMap[d] !== undefined) dayMap[d] += Number(r.amount);
      }
      setWeeklyRevenue(
        Object.entries(dayMap).map(([day, value]) => ({
          day: format(new Date(day + "T12:00:00"), "EEE", { locale: ptBR }),
          value,
        }))
      );

      setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="text-xl font-serif font-bold">{todayAppointments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><AlertCircle className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-serif font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Semana</p>
              <p className="text-xl font-serif font-bold">{weekCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Faturamento</p>
              <p className="text-lg font-serif font-bold">R$ {monthRevenue.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes</p>
              <p className="text-xl font-serif font-bold">{totalClients}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly revenue chart */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <h3 className="font-serif text-sm font-medium mb-4">Receita - Últimos 7 dias</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyRevenue}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={50} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="value" fill="hsl(43, 72%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent clients */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <h3 className="font-serif text-sm font-medium mb-4">Últimos Clientes Cadastrados</h3>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente.</p>
            ) : (
              <div className="space-y-2">
                {recentClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <p className="text-sm font-medium">{c.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today schedule */}
      <div>
        <h2 className="font-serif text-lg mb-3">Agenda de Hoje</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map((a) => (
              <Card key={a.id} className="border-border">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.profiles?.full_name || "Cliente"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{a.appointment_time?.slice(0, 5)} — {a.services?.name}
                    </p>
                  </div>
                  <Badge variant="outline">{statusLabels[a.status]}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
