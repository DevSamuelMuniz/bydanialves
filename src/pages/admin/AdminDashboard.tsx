import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Users, Clock, AlertCircle, TrendingUp,
  Scissors, Building2, Star, DollarSign, CalendarIcon, X,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, eachDayOfInterval, parseISO, startOfDay, endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// ─── Types ────────────────────────────────────────────────────────────────────
type PeriodPreset = "today" | "this_week" | "this_month" | "last_7" | "last_30" | "last_month" | "this_year" | "custom";

interface DateFilter {
  preset: PeriodPreset;
  from: Date;
  to: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDateStr(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function getPresetRange(preset: PeriodPreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_7":
      return { from: subDays(now, 6), to: now };
    case "last_30":
      return { from: subDays(now, 29), to: now };
    case "last_month": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "this_year":
      return { from: startOfYear(now), to: endOfDay(now) };
    default:
      return { from: startOfMonth(now), to: endOfDay(now) };
  }
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  this_week: "Esta semana",
  this_month: "Este mês",
  last_7: "Últimos 7 dias",
  last_30: "Últimos 30 dias",
  last_month: "Mês anterior",
  this_year: "Este ano",
  custom: "Personalizado",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const BAR_COLORS = [
  "hsl(40,65%,48%)", "hsl(40,55%,52%)",
  "hsl(40,45%,56%)", "hsl(40,38%,60%)", "hsl(40,30%,65%)",
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { canViewDashboard, canViewDashboardFinancials, canViewBranchKpis, adminLevel } = useAdminPermissions();
  const { adminBranchId } = useAuth();

  const isProfessional = adminLevel === "professional";
  const isManagerOrCeo = adminLevel === "manager" || adminLevel === "ceo";

  useEffect(() => {
    if (!canViewDashboard) navigate("/admin/my-appointments", { replace: true });
  }, [canViewDashboard]);

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Date filter state
  const initialRange = getPresetRange("this_month");
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: "this_month",
    from: initialRange.from,
    to: initialRange.to,
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // KPIs
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [rangeCount, setRangeCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  // Charts
  const [revenueChart, setRevenueChart] = useState<{ day: string; value: number }[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topServices, setTopServices] = useState<{ name: string; count: number }[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: string; count: number }[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [branchKpis, setBranchKpis] = useState<{ id: string; name: string; count: number; revenue: number; pending: number }[]>([]);

  // Reviews
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [allReviews, setAllReviews] = useState<{ rating: number; comment: string | null; created_at: string; service_name: string }[]>([]);

  // ─── Load branches ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isManagerOrCeo) { setBranchesLoaded(true); return; }
    supabase.from("branches").select("id, name").eq("active", true).order("name")
      .then(({ data }) => { setBranches(data || []); setBranchesLoaded(true); });
  }, [isManagerOrCeo]);

  useEffect(() => {
    if (!isManagerOrCeo) setBranchesLoaded(true);
  }, [isManagerOrCeo]);

  // ─── Active branch ────────────────────────────────────────────────────────
  const activeBranchId: string | null = isManagerOrCeo
    ? (branchFilter !== "all" ? branchFilter : null)
    : (adminBranchId || null);

  // ─── Date helpers ─────────────────────────────────────────────────────────
  const dateFrom = toDateStr(dateFilter.from);
  const dateTo = toDateStr(dateFilter.to);
  const today = toDateStr(new Date());

  function applyPreset(preset: PeriodPreset) {
    if (preset === "custom") return;
    const range = getPresetRange(preset);
    setDateFilter({ preset, from: range.from, to: range.to });
  }

  function applyCustomRange(range: DateRange | undefined) {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setDateFilter({ preset: "custom", from: range.from, to: range.to });
      setCalendarOpen(false);
    }
  }

  // ─── Fetch dashboard data ─────────────────────────────────────────────────
  const fetchData = useCallback(async (
    currentBranches: { id: string; name: string }[],
    currentActiveBranchId: string | null,
    from: string,
    to: string,
  ) => {
    setLoading(true);

    const todayStr = toDateStr(new Date());

    const withBranch = (q: any) =>
      currentActiveBranchId ? q.eq("branch_id", currentActiveBranchId) : q;

    // Parallel queries — all scoped to [from, to] and branch
    const [
      todayRes,
      pendingRes,
      rangeRes,
      completedRes,
      servicesRes,
      hoursRes,
      rateRes,
    ] = await Promise.all([
      // Today's appointments (always "today", branch-filtered)
      withBranch(
        supabase.from("appointments")
          .select("*, services(name, price), profiles!appointments_client_profile_fkey(full_name)")
          .eq("appointment_date", todayStr)
      ).order("appointment_time"),

      // Pending in date range
      withBranch(
        supabase.from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .gte("appointment_date", from)
          .lte("appointment_date", to)
      ),

      // Total in date range
      withBranch(
        supabase.from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("appointment_date", from)
          .lte("appointment_date", to)
      ),

      // Completed in date range
      withBranch(
        supabase.from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("appointment_date", from)
          .lte("appointment_date", to)
      ),

      // Top services in date range
      withBranch(
        supabase.from("appointments")
          .select("service_id, services(name)")
          .gte("appointment_date", from)
          .lte("appointment_date", to)
          .neq("status", "cancelled")
      ).limit(1000),

      // Peak hours in date range (completed)
      withBranch(
        supabase.from("appointments")
          .select("appointment_time")
          .eq("status", "completed")
          .gte("appointment_date", from)
          .lte("appointment_date", to)
      ).limit(1000),

      // Completion rate in date range
      withBranch(
        supabase.from("appointments")
          .select("status")
          .gte("appointment_date", from)
          .lte("appointment_date", to)
      ).limit(1000),
    ]);

    // Clients (total, no date filter — count is cumulative)
    const { data: clientRoles } = await supabase
      .from("user_roles").select("user_id").eq("role", "client");
    const clientUserIds = (clientRoles || []).map((r) => r.user_id);
    const placeholder = ["00000000-0000-0000-0000-000000000000"];

    let clientCountQ = supabase.from("profiles")
      .select("id", { count: "exact", head: true })
      .in("user_id", clientUserIds.length > 0 ? clientUserIds : placeholder);
    if (currentActiveBranchId) clientCountQ = clientCountQ.eq("branch_id", currentActiveBranchId);

    let recentClientsQ = supabase.from("profiles")
      .select("full_name, created_at, branch_id")
      .in("user_id", clientUserIds.length > 0 ? clientUserIds : placeholder)
      .order("created_at", { ascending: false })
      .limit(6);
    if (currentActiveBranchId) recentClientsQ = recentClientsQ.eq("branch_id", currentActiveBranchId);

    const [clientCountRes, recentClientsRes] = await Promise.all([clientCountQ, recentClientsQ]);

    // Financial records — scoped to date range
    // financial_records uses created_at (timestamp), branch as text
    let finQuery = supabase.from("financial_records")
      .select("amount, created_at, branch")
      .eq("type", "income")
      .gte("created_at", from)
      .lte("created_at", to + "T23:59:59");

    if (currentActiveBranchId) {
      const found = currentBranches.find((b) => b.id === currentActiveBranchId);
      if (found) finQuery = finQuery.ilike("branch", found.name);
    }

    const finRes = await finQuery;

    // ── Set KPIs ──
    setTodayAppointments(todayRes.data || []);
    setPendingCount(pendingRes.count || 0);
    setRangeCount(rangeRes.count || 0);
    setCompletedCount(completedRes.count || 0);
    setTotalClients(clientCountRes.count || 0);
    setRecentClients(recentClientsRes.data || []);

    // ── Revenue chart ──
    const fin = finRes.data || [];
    setTotalRevenue(fin.reduce((s, r) => s + Number(r.amount), 0));

    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    const days = eachDayOfInterval({ start: fromDate, end: toDate > new Date() ? new Date() : toDate });
    const dayMap: Record<string, number> = {};
    for (const d of days) dayMap[format(d, "yyyy-MM-dd")] = 0;
    for (const r of fin) {
      const d = r.created_at.split("T")[0];
      if (dayMap[d] !== undefined) dayMap[d] += Number(r.amount);
    }
    // If range > 60 days, group by week for readability
    const rangeLen = days.length;
    if (rangeLen > 60) {
      const weekMap: Record<string, number> = {};
      for (const [d, v] of Object.entries(dayMap)) {
        const w = format(parseISO(d), "dd/MM");
        weekMap[w] = (weekMap[w] || 0) + v;
      }
      setRevenueChart(Object.entries(weekMap).map(([day, value]) => ({ day, value })));
    } else {
      setRevenueChart(
        Object.entries(dayMap).map(([day, value]) => ({
          day: format(parseISO(day), "dd/MM"),
          value,
        }))
      );
    }

    // ── Top services ──
    const svcMap: Record<string, { name: string; count: number }> = {};
    for (const a of servicesRes.data || []) {
      const id = a.service_id;
      const name = (a.services as any)?.name || "Desconhecido";
      if (!svcMap[id]) svcMap[id] = { name, count: 0 };
      svcMap[id].count++;
    }
    setTopServices(Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 5));

    // ── Peak hours ──
    const hourMap: Record<number, number> = {};
    for (let h = 8; h <= 20; h++) hourMap[h] = 0;
    for (const a of hoursRes.data || []) {
      const h = parseInt(a.appointment_time?.split(":")[0] || "0");
      if (hourMap[h] !== undefined) hourMap[h]++;
    }
    setPeakHours(Object.entries(hourMap).map(([h, count]) => ({ hour: `${h}h`, count })));

    // ── Completion rate ──
    const allAppts = rateRes.data || [];
    const done = allAppts.filter((a) => a.status === "completed").length;
    setCompletionRate(allAppts.length > 0 ? Math.round((done / allAppts.length) * 100) : 0);

    setLoading(false);
  }, []);

  // ─── Trigger fetchData ────────────────────────────────────────────────────
  useEffect(() => {
    if (!branchesLoaded) return;
    fetchData(branches, activeBranchId, dateFrom, dateTo);
  }, [branchesLoaded, branchFilter, adminBranchId, branches, dateFrom, dateTo, fetchData]);

  // ─── Fetch reviews ────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from("reviews")
      .select("rating, comment, created_at, appointments(service_id, services(name))")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data && data.length > 0) {
      setAvgRating(Math.round((data.reduce((s: number, r: any) => s + r.rating, 0) / data.length) * 10) / 10);
      setReviewCount(data.length);
      setAllReviews(data.map((r: any) => ({
        rating: r.rating, comment: r.comment ?? null,
        created_at: r.created_at,
        service_name: (r.appointments as any)?.services?.name ?? "Serviço",
      })));
    } else { setAvgRating(null); setReviewCount(0); setAllReviews([]); }
  }, []);

  // ─── Fetch branch KPIs (respects date filter) ────────────────────────────
  const fetchBranchKpis = useCallback(async (from: string, to: string) => {
    if (!canViewBranchKpis) return;
    const [branchListRes, branchApptsRes, branchFinRes] = await Promise.all([
      supabase.from("branches").select("id, name").eq("active", true),
      supabase.from("appointments").select("branch_id, status")
        .gte("appointment_date", from).lte("appointment_date", to),
      supabase.from("financial_records").select("branch, amount")
        .eq("type", "income").gte("created_at", from).lte("created_at", to + "T23:59:59"),
    ]);
    const branchMap: Record<string, { id: string; name: string; count: number; revenue: number; pending: number }> = {};
    for (const br of (branchListRes.data || []))
      branchMap[br.id] = { id: br.id, name: br.name, count: 0, revenue: 0, pending: 0 };
    for (const a of (branchApptsRes.data || []))
      if (a.branch_id && branchMap[a.branch_id]) {
        branchMap[a.branch_id].count++;
        if (a.status === "pending") branchMap[a.branch_id].pending++;
      }
    for (const r of (branchFinRes.data || [])) {
      const norm = normalizeName(r.branch || "");
      const entry = Object.values(branchMap).find((b) => normalizeName(b.name) === norm);
      if (entry) entry.revenue += Number(r.amount);
    }
    setBranchKpis(Object.values(branchMap).sort((a, b) => b.count - a.count));
  }, [canViewBranchKpis]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchBranchKpis(dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchBranchKpis]);

  // ─── Skeleton ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-52 rounded-lg" />
          </div>
        </div>
        {isProfessional ? <Skeleton className="h-48 w-full max-w-xs rounded-xl" /> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Skeleton className="lg:col-span-3 h-64 rounded-xl" />
              <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          </>
        )}
      </div>
    );
  }

  const activeBranchLabel = activeBranchId
    ? (branches.find((b) => b.id === activeBranchId)?.name || "Filial")
    : "Todas as filiais";

  const periodLabel = dateFilter.preset === "custom"
    ? `${format(dateFilter.from, "dd/MM/yyyy")} – ${format(dateFilter.to, "dd/MM/yyyy")}`
    : PRESET_LABELS[dateFilter.preset];

  const kpis = [
    { label: "Hoje", value: todayAppointments.length, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10", sub: "agend. hoje" },
    { label: "No período", value: rangeCount, icon: TrendingUp, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", sub: "total agend." },
    { label: "Concluídos", value: completedCount, icon: TrendingUp, color: "text-success", bg: "bg-success/10", sub: "no período" },
    { label: "Clientes", value: totalClients, icon: Users, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", sub: "cadastrados" },
  ];

  // ─── Professional view ────────────────────────────────────────────────────
  if (isProfessional) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl md:text-3xl tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border/60">
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
                    {[1,2,3,4,5].map(s => <Star key={s} className={`h-5 w-5 ${s <= Math.round(avgRating!) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}
                  </div>
                  <p className="text-xs text-muted-foreground">{reviewCount} avaliação{reviewCount !== 1 ? "ões" : ""}</p>
                </>
              ) : <p className="text-sm text-muted-foreground text-center py-4">Sem avaliações ainda.</p>}
            </CardContent>
          </Card>
          <Card className="border-border/60 sm:col-span-1 lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-base font-medium tracking-tight">Comentários dos Clientes</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Avaliações mais recentes</p>
              {allReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem avaliações ainda.</p>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {allReviews.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border/50 bg-muted/30 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">{r.service_name}</p>
                      {r.comment
                        ? <p className="text-sm text-foreground leading-relaxed">"{r.comment}"</p>
                        : <p className="text-xs text-muted-foreground italic">Sem comentário.</p>}
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

  // ─── Full view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── Header + Filters ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl tracking-tight animate-slide-up">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 animate-slide-up">
          {/* Branch filter */}
          {isManagerOrCeo && branches.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue placeholder="Filtrar filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period preset */}
          <Select
            value={dateFilter.preset === "custom" ? "custom" : dateFilter.preset}
            onValueChange={(v) => applyPreset(v as PeriodPreset)}
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRESET_LABELS) as PeriodPreset[]).filter(p => p !== "custom").map(p => (
                <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom date range picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-1.5 text-sm font-normal",
                  dateFilter.preset === "custom" && "border-primary text-primary"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFilter.preset === "custom"
                  ? `${format(dateFilter.from, "dd/MM")} – ${format(dateFilter.to, "dd/MM/yy")}`
                  : "Período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customRange ?? { from: dateFilter.from, to: dateFilter.to }}
                onSelect={applyCustomRange}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* Clear custom */}
          {dateFilter.preset === "custom" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => applyPreset("this_month")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active filters badge */}
      <div className="flex items-center gap-2 -mt-4 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
          <CalendarIcon className="h-2.5 w-2.5 mr-1" />
          {periodLabel}
        </Badge>
        {activeBranchId && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
            <Building2 className="h-2.5 w-2.5 mr-1" />
            {activeBranchLabel}
          </Badge>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={kpi.label} className="border-border/60 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <CardContent className="pt-5 pb-4 px-4">
              <div className={`inline-flex p-2.5 rounded-xl ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-serif font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue + Top services ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {canViewDashboardFinancials && (
          <Card className="lg:col-span-3 border-border/60 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="font-serif text-base font-medium tracking-tight">Receita do Período</h3>
                </div>
                <span className="text-base font-bold text-primary">
                  R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {periodLabel} — {activeBranchLabel}
              </p>
              {revenueChart.every(d => d.value === 0) ? (
                <div className="flex items-center justify-center h-[190px] text-sm text-muted-foreground">
                  Sem receita registrada neste período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={revenueChart}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(40,65%,48%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(40,65%,48%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} width={60} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `R$${v.toLocaleString("pt-BR")}`} />
                    <Tooltip
                      formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                      contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(40,65%,48%)" strokeWidth={2.5}
                      fill="url(#revGrad)" dot={false}
                      activeDot={{ r: 5, fill: "hsl(40,65%,48%)", strokeWidth: 2, stroke: "#fff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={`border-border/60 animate-slide-up ${!canViewDashboardFinancials ? "lg:col-span-5" : "lg:col-span-2"}`} style={{ animationDelay: "0.25s" }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Scissors className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-medium tracking-tight">Serviços Populares</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Top 5 — {periodLabel}</p>
            {topServices.length === 0 ? (
              <div className="flex items-center justify-center h-[190px] text-sm text-muted-foreground">Sem dados no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={topServices} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={88} />
                  <Tooltip
                    formatter={(v: number) => [v, "Agendamentos"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {topServices.map((_, idx) => <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Peak hours + Completion rate + Agenda hoje ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardContent className="pt-6">
            <h3 className="font-serif text-base font-medium tracking-tight mb-1">Horários de Pico</h3>
            <p className="text-xs text-muted-foreground mb-4">Agendamentos concluídos por hora</p>
            {peakHours.every(h => h.count === 0) ? (
              <div className="flex items-center justify-center h-[170px] text-sm text-muted-foreground">Sem dados ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={peakHours} barSize={10}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 11 }} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Agendamentos"]} contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(40,65%,48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 animate-slide-up flex flex-col" style={{ animationDelay: "0.32s" }}>
          <CardContent className="pt-6 flex flex-col items-center justify-center flex-1 gap-3">
            <h3 className="font-serif text-base font-medium tracking-tight self-start">Taxa de Conclusão</h3>
            <p className="text-xs text-muted-foreground self-start -mt-2 mb-2">{periodLabel}</p>
            <div className="relative flex items-center justify-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <path d="M 14 80 A 66 66 0 0 1 146 80" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
                <path d="M 14 80 A 66 66 0 0 1 146 80" fill="none" stroke="hsl(40,65%,48%)" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${(completionRate / 100) * 207} 207`} />
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

        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-medium tracking-tight">Agenda de Hoje</h3>
              <Badge variant="outline" className="text-[10px] px-2 py-0">{todayAppointments.length} agend.</Badge>
            </div>
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground text-center">Nenhum agendamento para hoje.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {todayAppointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card hover:border-primary/20 transition-all">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium truncate">{a.profiles?.full_name || "Cliente"}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {a.appointment_time?.slice(0, 5)} · {(a.services as any)?.name}
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

      {/* ── Avaliações + Últimos clientes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                  {[1,2,3,4,5].map(s => <Star key={s} className={`h-5 w-5 ${s <= Math.round(avgRating!) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}
                </div>
                <p className="text-xs text-muted-foreground">{reviewCount} avaliação{reviewCount !== 1 ? "ões" : ""}</p>
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-4">Sem avaliações ainda.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/60 animate-slide-up" style={{ animationDelay: "0.42s" }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-medium tracking-tight">Últimos Clientes Cadastrados</h3>
              {activeBranchId && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 text-primary border-primary/30">
                  {activeBranchLabel}
                </Badge>
              )}
            </div>
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {activeBranchId ? "Nenhum cliente nesta filial." : "Nenhum cliente cadastrado."}
              </p>
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

      {/* ── Desempenho por Filial ── */}
      {canViewBranchKpis && branchKpis.length > 0 && (
        <Card className="border-border/60 animate-slide-up" style={{ animationDelay: "0.45s" }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-base font-medium tracking-tight">Desempenho por Filial</h3>
              </div>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
                {periodLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Agendamentos e receita no período — visão global</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchKpis.map((b) => (
                <div key={b.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  activeBranchId === b.id ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border/40 hover:border-primary/20"
                }`}>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{b.name}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{b.count} agend.</span>
                      </div>
                      {b.pending > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-amber-600 dark:text-amber-400">{b.pending} pend.</span>
                        </div>
                      )}
                    </div>
                    {canViewDashboardFinancials && (
                      <p className="text-sm font-bold text-primary mt-1">
                        R$ {b.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
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
