import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Users, Clock, Scissors, Star, TrendingUp, CheckCircle2, XCircle, Calendar,
} from "lucide-react";

interface ProfessionalSummary {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  admin_level: string;
  branch_name: string | null;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  confirmed: number;
  hours_worked: number;
  avg_rating: number | null;
  review_count: number;
  top_services: { name: string; count: number }[];
  by_month: { month: string; count: number }[];
}

const LEVEL_LABELS: Record<string, string> = {
  ceo: "CEO",
  manager: "Gerente",
  professional: "Profissional",
  attendant: "Atendente",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(var(--chart-2))",
  cancelled: "hsl(var(--destructive))",
  pending: "hsl(var(--chart-4))",
  confirmed: "hsl(var(--chart-1))",
};

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "min" : ""}`.trim() : `${m}min`;
}

export default function AdminProfessionalReport() {
  const perms = useAdminPermissions();
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState<ProfessionalSummary[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all admin roles with professional/attendant level
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, admin_level, branch_id")
        .eq("role", "admin")
        .in("admin_level", ["professional", "attendant", "manager", "ceo"]);

      if (!roles || roles.length === 0) { setProfessionals([]); setLoading(false); return; }

      // 2. Fetch profiles for those users
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      // 3. Fetch branches
      const branchIds = roles.map((r) => r.branch_id).filter(Boolean) as string[];
      const { data: branches } = branchIds.length
        ? await supabase.from("branches").select("id, name").in("id", branchIds)
        : { data: [] };

      // 4. Fetch appointments with service data in range
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, professional_id, status, appointment_date, appointment_time, service_id, services(name, duration_minutes)")
        .in("professional_id", userIds)
        .gte("appointment_date", dateFrom)
        .lte("appointment_date", dateTo);

      // 5. Fetch reviews for those appointments
      const apptIds = (appointments || []).map((a) => a.id);
      const { data: reviews } = apptIds.length
        ? await supabase.from("reviews").select("appointment_id, rating").in("appointment_id", apptIds)
        : { data: [] };

      // Build map: appointment_id -> rating
      const ratingMap: Record<string, number> = {};
      (reviews || []).forEach((r) => { ratingMap[r.appointment_id] = r.rating; });

      // 6. Build summaries per professional
      const summaries: ProfessionalSummary[] = roles.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);
        const branch = branches?.find((b) => b.id === role.branch_id);
        const myAppts = (appointments || []).filter((a) => a.professional_id === role.user_id);

        const completed = myAppts.filter((a) => a.status === "completed");
        const cancelled = myAppts.filter((a) => a.status === "cancelled");
        const pending = myAppts.filter((a) => a.status === "pending");
        const confirmed = myAppts.filter((a) => a.status === "confirmed");

        // Hours worked = sum of duration_minutes of completed appointments
        const hours_worked = completed.reduce((acc, a) => {
          const svc = a.services as any;
          return acc + (svc?.duration_minutes ?? 60);
        }, 0);

        // Avg rating
        const myRatings = completed.map((a) => ratingMap[a.id]).filter((r) => r != null) as number[];
        const avg_rating = myRatings.length ? myRatings.reduce((a, b) => a + b, 0) / myRatings.length : null;

        // Top services
        const svcCount: Record<string, { name: string; count: number }> = {};
        myAppts.forEach((a) => {
          const svc = a.services as any;
          if (!svc) return;
          if (!svcCount[a.service_id]) svcCount[a.service_id] = { name: svc.name, count: 0 };
          svcCount[a.service_id].count++;
        });
        const top_services = Object.values(svcCount).sort((a, b) => b.count - a.count).slice(0, 5);

        // By month (last 6 months)
        const monthMap: Record<string, number> = {};
        myAppts.forEach((a) => {
          const d = new Date(a.appointment_date);
          const key = `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
          monthMap[key] = (monthMap[key] || 0) + 1;
        });
        const by_month = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

        return {
          user_id: role.user_id,
          full_name: profile?.full_name ?? "—",
          avatar_url: profile?.avatar_url ?? null,
          admin_level: role.admin_level ?? "professional",
          branch_name: branch?.name ?? null,
          total: myAppts.length,
          completed: completed.length,
          cancelled: cancelled.length,
          pending: pending.length,
          confirmed: confirmed.length,
          hours_worked,
          avg_rating,
          review_count: myRatings.length,
          top_services,
          by_month,
        };
      });

      setProfessionals(summaries);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!perms.canViewProfessionals) return <AccessDenied />;

  const displayList = selected === "all" ? professionals : professionals.filter((p) => p.user_id === selected);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Profissionais</h1>
        <p className="text-muted-foreground text-sm mt-1">Análise completa de desempenho por profissional</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs mb-1 block">Profissional</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs mb-1 block">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs mb-1 block">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : displayList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum profissional encontrado no período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {displayList.map((prof) => (
            <ProfCard key={prof.user_id} prof={prof} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfCard({ prof }: { prof: ProfessionalSummary }) {
  const initials = prof.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const completionRate = prof.total > 0 ? Math.round((prof.completed / prof.total) * 100) : 0;

  const statusData = [
    { name: "Concluídos", value: prof.completed, color: STATUS_COLORS.completed },
    { name: "Confirmados", value: prof.confirmed, color: STATUS_COLORS.confirmed },
    { name: "Pendentes",  value: prof.pending,   color: STATUS_COLORS.pending },
    { name: "Cancelados", value: prof.cancelled,  color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  return (
    <Card className="overflow-hidden border shadow-sm">
      {/* Prof header */}
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={prof.avatar_url ?? undefined} />
            <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{prof.full_name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{LEVEL_LABELS[prof.admin_level] ?? prof.admin_level}</Badge>
              {prof.branch_name && <Badge variant="outline" className="text-xs">{prof.branch_name}</Badge>}
            </div>
          </div>
          {prof.avg_rating != null && (
            <div className="flex flex-col items-center shrink-0">
              <span className="text-2xl font-bold text-amber-500">{prof.avg_rating.toFixed(1)}</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`h-3 w-3 ${s <= Math.round(prof.avg_rating!) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{prof.review_count} avaliações</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiMini icon={<Calendar className="h-4 w-4" />} label="Total" value={String(prof.total)} color="text-primary" />
          <KpiMini icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={String(prof.completed)} color="text-emerald-600" />
          <KpiMini icon={<Clock className="h-4 w-4" />} label="Horas trabalhadas" value={fmtHours(prof.hours_worked)} color="text-blue-600" />
          <KpiMini icon={<TrendingUp className="h-4 w-4" />} label="Conclusão" value={`${completionRate}%`} color="text-violet-600" />
        </div>

        {/* Status breakdown + Top services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status bar chart */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" /> Atendimentos por status
            </p>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => [v, "Qtd"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem atendimentos no período</p>
            )}
          </div>

          {/* Top services */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" /> Serviços mais realizados
            </p>
            {prof.top_services.length > 0 ? (
              <div className="space-y-2">
                {prof.top_services.map((svc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-muted-foreground font-mono">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate font-medium">{svc.name}</span>
                        <span className="shrink-0 ml-2 text-muted-foreground">{svc.count}x</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (svc.count / (prof.top_services[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem serviços no período</p>
            )}
          </div>
        </div>

        {/* Monthly evolution */}
        {prof.by_month.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Atendimentos por mês
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={prof.by_month} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Atendimentos"]} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cancelled warning */}
        {prof.cancelled > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{prof.cancelled} cancelamento{prof.cancelled > 1 ? "s" : ""} registrado{prof.cancelled > 1 ? "s" : ""} no período</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-1">
      <div className={`flex items-center gap-1.5 ${color}`}>{icon}<span className="text-xs font-medium">{label}</span></div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
