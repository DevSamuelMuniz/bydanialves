import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
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

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { canViewDashboard } = useAdminPermissions();

  useEffect(() => {
    if (!canViewDashboard) navigate("/admin/agenda", { replace: true });
  }, [canViewDashboard]);

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
      supabase.from("appointments").select("*, services(name), profiles!appointments_client_profile_fkey(full_name)").eq("appointment_date", today).order("appointment_time"),
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

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-48 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );

  const kpis = [
    { label: "Hoje", value: todayAppointments.length, icon: CalendarDays, color: "text-primary" },
    { label: "Pendentes", value: pendingCount, icon: AlertCircle, color: "text-warning" },
    { label: "Semana", value: weekCount, icon: TrendingUp, color: "text-success" },
    { label: "Faturamento", value: `R$ ${monthRevenue.toFixed(0)}`, icon: DollarSign, color: "text-primary", small: true },
    { label: "Clientes", value: totalClients, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl md:text-3xl tracking-tight animate-slide-up">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={kpi.label} className="border-border/60 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <CardContent className="pt-5 pb-4 px-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-muted/80`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className={`${kpi.small ? "text-lg" : "text-xl"} font-serif font-bold tracking-tight`}>{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly revenue chart */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-5 tracking-tight">Receita — Últimos 7 dias</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyRevenue}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} width={50} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(38, 20%, 90%)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="value" fill="hsl(40, 65%, 48%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent clients */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-5 tracking-tight">Últimos Clientes</h3>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente.</p>
            ) : (
              <div className="space-y-2">
                {recentClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {(c.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium">{c.full_name || "Sem nome"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today schedule */}
      <div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
        <h2 className="font-serif text-xl mb-4 tracking-tight">Agenda de Hoje</h2>
        {todayAppointments.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum agendamento para hoje.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((a) => (
              <Card key={a.id} className="border-border/60 hover:border-primary/20 transition-all duration-300">
                <CardContent className="py-4 px-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{a.profiles?.full_name || "Cliente"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />{a.appointment_time?.slice(0, 5)} — {a.services?.name}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${statusColors[a.status] || ""} border rounded-full px-3 py-1 text-xs font-medium`}>
                    {statusLabels[a.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
