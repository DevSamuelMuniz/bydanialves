import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, DollarSign, Users, Clock, AlertCircle, TrendingUp, CheckCircle2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subDays } from "date-fns";
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

type SparkDay = { day: string; v: number };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { canViewDashboard, canViewDashboardFinancials } = useAdminPermissions();

  useEffect(() => {
    if (!canViewDashboard) navigate("/admin/agenda", { replace: true });
  }, [canViewDashboard]);

  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ day: string; value: number }[]>([]);
  const [statusSparklines, setStatusSparklines] = useState<{
    confirmed: SparkDay[];
    completed: SparkDay[];
    cancelled: SparkDay[];
  }>({ confirmed: [], completed: [], cancelled: [] });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split("T")[0];
    const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

    Promise.all([
      supabase
        .from("appointments")
        .select("*, services(name), profiles!appointments_client_profile_fkey(full_name)")
        .eq("appointment_date", today)
        .order("appointment_time"),
      supabase.from("financial_records").select("amount, created_at").eq("type", "income").gte("created_at", monthStart),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("appointments").select("id", { count: "exact", head: true })
        .gte("appointment_date", weekStart).lte("appointment_date", today),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("financial_records").select("amount, created_at").eq("type", "income").gte("created_at", weekStart),
      supabase.from("profiles").select("full_name, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("appointments").select("status, appointment_date")
        .gte("appointment_date", weekStart).lte("appointment_date", today),
    ]).then(([apptRes, finRes, clientRes, pendingRes, weekRes, completedRes, cancelledRes, confirmedRes, weekFinRes, recentRes, statusRes]) => {
      setTodayAppointments(apptRes.data || []);
      setMonthRevenue((finRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0));
      setTotalClients(clientRes.count || 0);
      setPendingCount(pendingRes.count || 0);
      setWeekCount(weekRes.count || 0);
      setCompletedCount(completedRes.count || 0);
      setCancelledCount(cancelledRes.count || 0);
      setConfirmedCount(confirmedRes.count || 0);
      setRecentClients(recentRes.data || []);

      // Build weekly revenue area data
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

      // Build sparklines per status
      const mkMap = () => {
        const m: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) m[format(subDays(new Date(), i), "yyyy-MM-dd")] = 0;
        return m;
      };
      const maps = { confirmed: mkMap(), completed: mkMap(), cancelled: mkMap() } as Record<string, Record<string, number>>;
      for (const a of statusRes.data || []) {
        const d = a.appointment_date;
        if (maps[a.status] && maps[a.status][d] !== undefined) maps[a.status][d]++;
      }
      const toSpark = (m: Record<string, number>): SparkDay[] =>
        Object.entries(m).map(([day, v]) => ({
          day: format(new Date(day + "T12:00:00"), "EEE", { locale: ptBR }),
          v,
        }));
      setStatusSparklines({
        confirmed: toSpark(maps.confirmed),
        completed: toSpark(maps.completed),
        cancelled: toSpark(maps.cancelled),
      });

      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-48 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );

  const kpis = [
    { label: "Hoje", value: todayAppointments.length, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pendentes", value: pendingCount, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Semana", value: weekCount, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Concluídos", value: completedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Clientes", value: totalClients, icon: Users, color: "text-violet-600", bg: "bg-violet-500/10" },
  ];

  const miniDashboards = [
    {
      label: "Confirmados",
      count: confirmedCount,
      color: "hsl(220,60%,55%)",
      bg: "bg-blue-500/8",
      border: "border-blue-500/20",
      textColor: "text-blue-600",
      spark: statusSparklines.confirmed,
    },
    {
      label: "Concluídos",
      count: completedCount,
      color: "hsl(142,60%,40%)",
      bg: "bg-emerald-500/8",
      border: "border-emerald-500/20",
      textColor: "text-emerald-600",
      spark: statusSparklines.completed,
    },
    {
      label: "Cancelados",
      count: cancelledCount,
      color: "hsl(0,60%,50%)",
      bg: "bg-red-500/8",
      border: "border-red-500/20",
      textColor: "text-red-500",
      spark: statusSparklines.cancelled,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <h1 className="font-serif text-2xl md:text-3xl tracking-tight animate-slide-up">Dashboard</h1>
        <p className="text-sm text-muted-foreground animate-slide-up">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={kpi.label} className="border-border/60 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <CardContent className="pt-5 pb-4 px-4">
              <div className={`inline-flex p-2.5 rounded-xl ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-serif font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart — Receita */}
        {canViewDashboardFinancials && (
          <Card className="lg:col-span-2 border-border/60 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-serif text-base font-medium tracking-tight">Receita — Últimos 7 dias</h3>
                <span className="text-xs text-muted-foreground font-medium">
                  R$ {monthRevenue.toFixed(2)} este mês
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-5">Receita diária em reais</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyRevenue}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(40,65%,48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(40,65%,48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} width={55} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(40,65%,48%)"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={{ r: 4, fill: "hsl(40,65%,48%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 3 mini-dashboards — Status da semana */}
        <div className={`flex flex-col gap-4 ${!canViewDashboardFinancials ? "lg:col-span-3 grid grid-cols-1 sm:grid-cols-3" : ""}`}>
          {miniDashboards.map((m) => (
            <Card key={m.label} className={`border ${m.border} ${m.bg} animate-slide-up flex-1`} style={{ animationDelay: "0.3s" }}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <p className={`text-2xl font-serif font-bold ${m.textColor}`}>{m.count}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Últimos 7 dias</p>
                <ResponsiveContainer width="100%" height={48}>
                  <BarChart data={m.spark} barSize={6}>
                    <Bar dataKey="v" fill={m.color} radius={[3, 3, 0, 0]} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 11, padding: "4px 8px" }}
                      formatter={(v: number) => [v, m.label]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-5 tracking-tight">Últimos Clientes</h3>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente.</p>
            ) : (
              <div className="space-y-2">
                {recentClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
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

        {/* Today schedule */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-5 tracking-tight">Agenda de Hoje</h3>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento para hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card hover:border-primary/20 transition-all">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{a.profiles?.full_name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {a.appointment_time?.slice(0, 5)} — {a.services?.name}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${statusColors[a.status] || ""} border rounded-full px-2.5 py-0.5 text-[10px] font-medium`}>
                      {statusLabels[a.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
