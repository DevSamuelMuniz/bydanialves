import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { cn } from "@/lib/utils";
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
  Users, Clock, Scissors, Star, TrendingUp, CheckCircle2, XCircle, Calendar, Printer, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  total_bonification: number;
}

const LEVEL_LABELS: Record<string, string> = {
  ceo: "CEO",
  manager: "Gerente",
  professional: "Profissional",
  attendant: "Atendente",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(142 71% 45%)",
  cancelled: "hsl(var(--destructive))",
  pending: "hsl(var(--chart-4))",
  confirmed: "hsl(217 91% 60%)",
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
  const [printingId, setPrintingId] = useState<string | null>(null);
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
      // 1. Fetch all admin roles with professional level only (no attendants)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, admin_level, branch_id")
        .eq("role", "admin")
        .in("admin_level", ["professional", "manager", "ceo"]);

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

      // 6. Fetch bonification payments in range
      const { data: bonusPayments } = await supabase
        .from("bonification_payments" as any)
        .select("professional_id, bonus_amount, created_at")
        .in("professional_id", userIds)
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");

      // 7. Build summaries per professional
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

        // Bonification total
        const myBonuses = (bonusPayments || []).filter((b: any) => b.professional_id === role.user_id);
        const total_bonification = myBonuses.reduce((acc, b: any) => acc + (b.bonus_amount || 0), 0);

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
          total_bonification,
        };
      });

      setProfessionals(summaries);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = (userId: string) => {
    setPrintingId(userId);
    setTimeout(() => {
      window.print();
      setPrintingId(null);
    }, 150);
  };

  if (!perms.canViewProfessionals) return <AccessDenied />;

  const displayList = selected === "all" ? professionals : professionals.filter((p) => p.user_id === selected);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório de Profissionais</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise completa de desempenho por profissional</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Reset layout for print */
          .print\\:hidden, .dashboard-ui, header, aside, .sidebar-trigger, [data-sidebar], button { 
            display: none !important; 
          }
          
          /* Forced Reset on all parent containers to avoid scrollbars/clipping */
          html, body, #root, [data-sidebar-wrapper], main, .flex-1.overflow-auto {
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }

          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset root container padding and spacing */
          .p-6.space-y-6 { 
            padding: 0 !important; 
            margin: 0 !important; 
            display: block !important;
            overflow: visible !important;
            height: auto !important;
          }
          .p-6.space-y-6 > * { 
            margin-top: 0 !important; 
          }

          /* Show and style the printable report */
          .printable-report { 
            display: block !important; 
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
          }
          
          @page {
            margin: 1.5cm;
            size: A4;
          }

          .page-break-before { 
            page-break-before: always !important; 
            break-before: page !important;
          }
          .page-break-inside-avoid { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important;
          }
        }

        /* Hide printable report in UI */
        .printable-report { display: none; }
      `}} />

      {/* Dashboard UI Wrapper to hide during print */}
      <div className="dashboard-ui space-y-6">
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
              <div 
                key={prof.user_id} 
                className="prof-card"
              >
                <ProfCard 
                  prof={prof} 
                  onExportPDF={() => handleExport(prof.user_id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Printable Report (shown only in @media print) */}
      {!loading && (
        <PrintableProfessionalReport 
          professionals={printingId ? professionals.filter(p => p.user_id === printingId) : displayList}
          dateFrom={new Date(dateFrom).toLocaleDateString('pt-BR')}
          dateTo={new Date(dateTo).toLocaleDateString('pt-BR')}
        />
      )}
    </div>
  );
}

/**
 * HIGH-FIDELITY PRINTABLE REPORT
 * Matches the user's provided design (dark header, formal boxes, horizontal charts)
 */
function PrintableProfessionalReport({ 
  professionals, 
  dateFrom, 
  dateTo 
}: { 
  professionals: ProfessionalSummary[], 
  dateFrom: string, 
  dateTo: string 
}) {
  const generationDate = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="printable-report w-full mx-auto text-gray-900 bg-white">
      {professionals.map((prof, idx) => (
        <div key={prof.user_id} className={cn("space-y-8", idx > 0 && "page-break-before")}>
          {/* Header Section */}
          <div className="bg-[#1a1b1e] text-white p-8 rounded-t-lg flex justify-between items-end border-b-4 border-primary">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Relatório de Desempenho</h1>
              <p className="text-gray-400 mt-2 font-medium">Período: {dateFrom} a {dateTo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Gerado em: {generationDate}</p>
            </div>
          </div>

          {/* Professional Header */}
          <div className="px-4 py-6 border-b border-gray-100">
            <h2 className="text-4xl font-black text-slate-800">{prof.full_name}</h2>
            <p className="text-lg text-slate-500 mt-1 font-medium italic">
              Cargo: {LEVEL_LABELS[prof.admin_level] || prof.admin_level} | Filial: {prof.branch_name || '—'}
            </p>
          </div>

          {/* KPI Boxes Grid */}
          <div className="grid grid-cols-2 gap-4 px-4">
            <PrintKpiBox label="TOTAL DE ATENDIMENTOS" value={String(prof.total)} color="border-indigo-500 text-indigo-600" />
            <PrintKpiBox label="CONCLUÍDOS" value={String(prof.completed)} color="border-emerald-500 text-emerald-600" />
            <PrintKpiBox label="HORAS TRABALHADAS" value={fmtHours(prof.hours_worked)} color="border-blue-500 text-blue-600" />
            <PrintKpiBox label="TAXA DE CONCLUSÃO" value={`${prof.total > 0 ? Math.round((prof.completed / prof.total) * 100) : 0}%`} color="border-violet-500 text-violet-600" />
            
            {/* ADDED BONIFICATION KPI */}
            <div className="col-span-2">
              <PrintKpiBox 
                label="TOTAL DE BONIFICAÇÃO / COMISSÃO" 
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prof.total_bonification)} 
                color="border-amber-500 text-amber-600 bg-amber-50/20" 
              />
            </div>
          </div>

          {/* Status Breakdown Section */}
          <div className="px-4 pt-4 page-break-inside-avoid">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
              Atendimentos por status
            </h3>
            <div className="space-y-5">
              <PrintProgressRow label="Concluídos" value={prof.completed} total={prof.total} color="bg-emerald-500" />
              <PrintProgressRow label="Confirmados" value={prof.confirmed} total={prof.total} color="bg-blue-500" />
              <PrintProgressRow label="Cancelados" value={prof.cancelled} total={prof.total} color="bg-red-500" />
            </div>
          </div>

          {/* Top Services Section */}
          <div className="px-4 pt-8 page-break-inside-avoid">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
              Serviços mais realizados
            </h3>
            <div className="space-y-4">
              {prof.top_services.length > 0 ? (
                prof.top_services.map((svc, sIdx) => (
                  <PrintServiceRow 
                    key={sIdx} 
                    idx={sIdx + 1} 
                    name={svc.name} 
                    count={svc.count} 
                    max={prof.top_services[0]?.count || 1} 
                  />
                ))
              ) : (
                <p className="text-gray-400 italic">Sem registros no período.</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrintKpiBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className={cn("p-4 rounded-xl border-2 shadow-sm flex flex-col gap-1", color)}>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</span>
      <span className="text-3xl font-black">{value}</span>
    </div>
  );
}

function PrintProgressRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-4 break-inside-avoid">
      <span className="w-32 text-sm font-semibold text-slate-600">{label}</span>
      <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden flex items-center pr-2">
        <div className={cn("h-full", color)} style={{ width: `${percentage}%` }} />
        <span className="ml-auto text-sm font-bold text-slate-400">{value}</span>
      </div>
    </div>
  );
}

function PrintServiceRow({ idx, name, count, max }: { idx: number, name: string, count: number, max: number }) {
  const percentage = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4 break-inside-avoid">
      <div className="flex items-center gap-3 w-48 shrink-0">
        <span className="text-sm font-mono text-slate-400">{idx}.</span>
        <span className="text-sm font-bold text-slate-700 truncate">{name}</span>
      </div>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary/80" style={{ width: `${percentage}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-black text-primary">{count}x</span>
    </div>
  );
}

function ProfCard({ 
  prof, 
  onExportPDF 
}: { 
  prof: ProfessionalSummary; 
  onExportPDF: () => void;
}) {
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
      <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
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

        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 print:hidden ml-4"
          onClick={onExportPDF}
        >
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiMini icon={<Calendar className="h-4 w-4" />} label="Total" value={String(prof.total)} color="text-primary" />
          <KpiMini icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={String(prof.completed)} color="text-emerald-600" />
          <KpiMini icon={<Clock className="h-4 w-4" />} label="Horas" value={fmtHours(prof.hours_worked)} color="text-blue-600" />
          <KpiMini icon={<TrendingUp className="h-4 w-4" />} label="Conclusão" value={`${completionRate}%`} color="text-violet-600" />
          <BonificationKpi value={prof.total_bonification} />
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

function BonificationKpi({ value }: { value: number }) {
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex flex-col gap-1 shadow-sm print:bg-amber-50 print:border-amber-400">
      <div className="flex items-center gap-1.5 text-amber-600">
        <DollarSign className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Bonificação</span>
      </div>
      <span className="text-xl font-bold text-amber-700">{formatted}</span>
    </div>
  );
}
