import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, Clock, AlertCircle, TrendingUp, CheckCircle2, Scissors, Building2, Star } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import { format, subDays, startOfMonth, eachDayOfInterval, parseISO } from "date-fns";
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
  const { canViewDashboard, canViewDashboardFinancials, canViewBranchKpis, adminLevel } = useAdminPermissions();
  const { adminBranchId } = useAuth();

  const isProfessional = adminLevel === "professional";
  const isManager = adminLevel === "manager" || adminLevel === "ceo";

  useEffect(() => {
    if (!canViewDashboard) navigate("/admin/my-appointments", { replace: true });
  }, [canViewDashboard]);

  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  // Chart data
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ day: string; value: number }[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [topServices, setTopServices] = useState<{ name: string; count: number }[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: string; count: number }[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [branchKpis, setBranchKpis] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  const [loading, setLoading] = useState(true);

  // Load branches for manager/ceo filter
  useEffect(() => {
    if (!isManager) return;
    supabase.from("branches").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setBranches(data || []));
  }, [isManager]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = startOfMonth(new Date()).toISOString().split("T")[0];
    const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const last30Start = format(subDays(new Date(), 29), "yyyy-MM-dd");

    // Determine which branch ID to filter by:
    // - Staff with a fixed branch → always use adminBranchId
    // - Manager/CEO → use branchFilter dropdown (or null for all)
    const activeBranchId = adminBranchId
      ? adminBranchId
      : (isManager && branchFilter !== "all" ? branchFilter : null);

    // Helper to optionally add branch filter
    const withBranch = (q: any) => activeBranchId ? q.eq("branch_id", activeBranchId) : q;

    const apptBase = supabase.from("appointments");
    const todayQ   = withBranch(apptBase.select("*, services(name), profiles!appointments_client_profile_fkey(full_name)").eq("appointment_date", today)).order("appointment_time");
    const pendingQ = withBranch(supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"));
    const weekQ    = withBranch(supabase.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", weekStart).lte("appointment_date", today));
    const completedQ = withBranch(supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"));
    const servicesQ  = withBranch(supabase.from("appointments").select("service_id, services(name)").gte("appointment_date", last30Start).neq("status", "cancelled"));
    const hoursQ     = withBranch(supabase.from("appointments").select("appointment_time").eq("status", "completed")).limit(500);
    const rateQ      = withBranch(supabase.from("appointments").select("status").gte("appointment_date", last30Start));

    Promise.all([
      todayQ,
      supabase.from("financial_records").select("amount, created_at").eq("type", "income").gte("created_at", monthStart),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      pendingQ,
      weekQ,
      completedQ,
      supabase.from("profiles").select("full_name, created_at").order("created_at", { ascending: false }).limit(5),
      servicesQ,
      hoursQ,
      rateQ,
    ]).then(([apptRes, finRes, clientRes, pendingRes, weekRes, completedRes, recentRes, servicesRes, hoursRes, rateRes]) => {
      setTodayAppointments(apptRes.data || []);
      setTotalClients(clientRes.count || 0);
      setPendingCount(pendingRes.count || 0);
      setWeekCount(weekRes.count || 0);
      setCompletedCount(completedRes.count || 0);
      setRecentClients(recentRes.data || []);

      // Monthly revenue — day by day
      const fin = finRes.data || [];
      const monthTotal = fin.reduce((s, r) => s + Number(r.amount), 0);
      setMonthRevenue(monthTotal);

      const days = eachDayOfInterval({ start: parseISO(monthStart), end: new Date() });
      const dayMap: Record<string, number> = {};
      for (const d of days) dayMap[format(d, "yyyy-MM-dd")] = 0;
      for (const r of fin) {
        const d = r.created_at.split("T")[0];
        if (dayMap[d] !== undefined) dayMap[d] += Number(r.amount);
      }
      setMonthlyRevenue(
        Object.entries(dayMap).map(([day, value]) => ({
          day: format(parseISO(day), "dd/MM"),
          value,
        }))
      );

      // Top services
      const svcMap: Record<string, { name: string; count: number }> = {};
      for (const a of servicesRes.data || []) {
        const id = a.service_id;
        const name = (a.services as any)?.name || "Desconhecido";
        if (!svcMap[id]) svcMap[id] = { name, count: 0 };
        svcMap[id].count++;
      }
      setTopServices(
        Object.values(svcMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      // Peak hours
      const hourMap: Record<number, number> = {};
      for (let h = 8; h <= 20; h++) hourMap[h] = 0;
      for (const a of hoursRes.data || []) {
        const h = parseInt(a.appointment_time?.split(":")[0] || "0");
        if (hourMap[h] !== undefined) hourMap[h]++;
      }
      setPeakHours(
        Object.entries(hourMap).map(([h, count]) => ({ hour: `${h}h`, count }))
      );

      // Completion rate
      const all = rateRes.data || [];
      const done = all.filter((a) => a.status === "completed").length;
      setCompletionRate(all.length > 0 ? Math.round((done / all.length) * 100) : 0);

      setLoading(false);
    });

    // Reviews average
    (async () => {
      const { data: reviewsData } = await (supabase as any)
        .from("reviews")
        .select("rating");
      if (reviewsData && reviewsData.length > 0) {
        const avg = reviewsData.reduce((s: number, r: any) => s + r.rating, 0) / reviewsData.length;
        setAvgRating(Math.round(avg * 10) / 10);
        setReviewCount(reviewsData.length);
      }
    })();

    // Branch KPIs (always global — shows all branches for CEO/Gerente comparison)
    (async () => {
      const monthStart2 = startOfMonth(new Date()).toISOString().split("T")[0];
      const [branchAppts, branchFin, branchListRes] = await Promise.all([
        supabase.from("appointments").select("branch_id" as any).gte("appointment_date", monthStart2),
        supabase.from("financial_records").select("branch, amount").eq("type", "income").gte("created_at", monthStart2),
        (supabase.from("branches" as any) as any).select("id, name").eq("active", true),
      ]);
      const branchMap: Record<string, { name: string; count: number; revenue: number }> = {};
      for (const br of (branchListRes.data || []) as any[]) {
        branchMap[br.id] = { name: br.name, count: 0, revenue: 0 };
      }
      for (const a of ((branchAppts as any).data || []) as any[]) {
        if (a.branch_id && branchMap[a.branch_id]) branchMap[a.branch_id].count++;
      }
      for (const r of ((branchFin as any).data || []) as any[]) {
        const entry = Object.values(branchMap).find((b) => b.name === r.branch);
        if (entry) entry.revenue += Number(r.amount);
      }
      setBranchKpis(Object.values(branchMap).sort((a, b) => b.count - a.count));
    })();
  }, [adminBranchId, branchFilter, isManager]);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );

  const kpis = [
    { label: "Hoje", value: todayAppointments.length, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pendentes", value: pendingCount, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Esta semana", value: weekCount, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Clientes", value: totalClients, icon: Users, color: "text-violet-600", bg: "bg-violet-500/10" },
  ];

  const BAR_COLORS = ["hsl(40,65%,48%)", "hsl(40,55%,52%)", "hsl(40,45%,56%)", "hsl(40,38%,60%)", "hsl(40,30%,65%)"];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl md:text-3xl tracking-tight animate-slide-up">Dashboard</h1>
        <div className="flex items-center gap-3 animate-slide-up">
          {/* Branch filter — Gerente/CEO only */}
          {isManager && branches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48 gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Row 1: Receita do mês + Serviços mais populares */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Receita acumulada do mês */}
        {canViewDashboardFinancials ? (
          <Card className="lg:col-span-3 border-border/60 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-serif text-base font-medium tracking-tight">Receita do Mês</h3>
                <span className="text-sm font-semibold text-primary">R$ {monthRevenue.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Evolução diária de receita no mês atual</p>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(40,65%,48%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(40,65%,48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} width={52} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(40,65%,48%)" strokeWidth={2.5}
                    fill="url(#monthGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "hsl(40,65%,48%)", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {/* Serviços mais populares */}
        <Card className={`border-border/60 animate-slide-up ${!canViewDashboardFinancials ? "lg:col-span-5" : "lg:col-span-2"}`} style={{ animationDelay: "0.25s" }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Scissors className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-medium tracking-tight">Serviços Populares</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Top 5 — últimos 30 dias</p>
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={topServices} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    formatter={(v: number) => [v, "Agendamentos"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {topServices.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Horários de pico + Taxa de conclusão + Agenda de hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horários de pico */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium tracking-tight mb-1">Horários de Pico</h3>
            <p className="text-xs text-muted-foreground mb-4">Agendamentos concluídos por hora</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={peakHours} barSize={10}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11 }} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [v, "Agendamentos"]}
                  contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                />
                <Bar dataKey="count" fill="hsl(40,65%,48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Taxa de conclusão */}
        <Card className="border-border/60 animate-slide-up flex flex-col" style={{ animationDelay: "0.32s" }}>
          <CardContent className="pt-6 flex flex-col items-center justify-center flex-1 gap-3">
            <h3 className="font-serif text-base font-medium tracking-tight self-start">Taxa de Conclusão</h3>
            <p className="text-xs text-muted-foreground self-start -mt-2 mb-2">Últimos 30 dias</p>
            {/* Gauge via SVG */}
            <div className="relative flex items-center justify-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <path d="M 14 80 A 66 66 0 0 1 146 80" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
                <path
                  d="M 14 80 A 66 66 0 0 1 146 80"
                  fill="none"
                  stroke="hsl(40,65%,48%)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(completionRate / 100) * 207} 207`}
                />
              </svg>
              <div className="absolute bottom-0 text-center">
                <p className="text-4xl font-serif font-bold text-primary">{completionRate}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-1">
              <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-center">
                <p className="text-lg font-bold text-success">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground">Concluídos</p>
              </div>
              <div className="rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-center">
                <p className="text-lg font-bold text-warning">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agenda de Hoje */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-4 tracking-tight">Agenda de Hoje</h3>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum agendamento para hoje.</p>
            ) : (
              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {todayAppointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card hover:border-primary/20 transition-all">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium truncate">{a.profiles?.full_name || "Cliente"}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {a.appointment_time?.slice(0, 5)} · {a.services?.name}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${statusColors[a.status] || ""} border rounded-full px-2 py-0 text-[9px] font-medium shrink-0 ml-2`}>
                      {statusLabels[a.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Avaliações + Últimos clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Avaliações */}
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <CardContent className="pt-6 flex flex-col items-center justify-center gap-3 h-full">
            <div className="flex items-center gap-2 self-start">
              <Star className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-medium tracking-tight">Avaliações</h3>
            </div>
            <p className="text-xs text-muted-foreground self-start -mt-2">Média geral dos atendimentos</p>
            {avgRating !== null ? (
              <>
                <p className="text-5xl font-serif font-bold text-primary">{avgRating.toFixed(1)}</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${s <= Math.round(avgRating!) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{reviewCount} avaliação{reviewCount !== 1 ? "ões" : ""}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem avaliações ainda.</p>
            )}
          </CardContent>
        </Card>

        {/* Últimos clientes */}
        <Card className="lg:col-span-3 border-border/60 animate-slide-up" style={{ animationDelay: "0.42s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-4 tracking-tight">Últimos Clientes Cadastrados</h3>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentClients.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/20 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(c.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: KPIs por Filial (Gerente e CEO) */}
      {canViewBranchKpis && branchKpis.length > 0 && (
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.45s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium mb-1 tracking-tight">Desempenho por Filial</h3>
            <p className="text-xs text-muted-foreground mb-4">Agendamentos e receita no mês atual</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {branchKpis.map((b) => (
                <div key={b.name} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/20 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.count} agendamento{b.count !== 1 ? "s" : ""}</p>
                    {canViewDashboardFinancials && (
                      <p className="text-xs text-primary font-medium">R$ {b.revenue.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
