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
  Users, Clock, Scissors, Star, TrendingUp, CheckCircle2, XCircle, Calendar, Download, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

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

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/* ───── PDF GENERATION ───── */
function downloadProfPDF(prof: ProfessionalSummary, dateFrom: string, dateTo: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = W - margin * 2;
  let y = 0;

  const fromStr = new Date(dateFrom + "T12:00:00").toLocaleDateString("pt-BR");
  const toStr = new Date(dateTo + "T12:00:00").toLocaleDateString("pt-BR");
  const genDate = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  // ── Dark header bar
  doc.setFillColor(26, 27, 30);
  doc.rect(0, 0, W, 90, "F");
  // Gold accent line
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 90, W, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Desempenho", margin, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text(`Período: ${fromStr} a ${toStr}`, margin, 60);
  doc.text(`Gerado em: ${genDate}`, margin, 75);

  y = 115;

  // ── Professional info section
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(margin, y, contentW, 55, 6, 6, "F");
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(prof.full_name, margin + 16, y + 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 110);
  const roleText = `${LEVEL_LABELS[prof.admin_level] || prof.admin_level}${prof.branch_name ? `  •  Filial: ${prof.branch_name}` : ""}`;
  doc.text(roleText, margin + 16, y + 43);

  // Rating badge on right
  if (prof.avg_rating != null) {
    const rx = W - margin - 70;
    doc.setFillColor(255, 193, 7);
    doc.roundedRect(rx, y + 8, 54, 38, 4, 4, "F");
    doc.setTextColor(50, 30, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(prof.avg_rating.toFixed(1), rx + 10, y + 28);
    doc.setFontSize(7);
    doc.text(`${prof.review_count} aval.`, rx + 8, y + 40);
  }

  y += 75;

  // ── Section title helper
  const sectionTitle = (title: string) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 40);
    doc.text(title, margin, y);
    y += 4;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 80, y);
    y += 16;
  };

  // ── KPI Grid (2x3)
  sectionTitle("Indicadores de Desempenho");

  const completionRate = prof.total > 0 ? Math.round((prof.completed / prof.total) * 100) : 0;
  const kpis = [
    { label: "Total Atendimentos", value: String(prof.total), color: [79, 70, 229] },
    { label: "Concluídos", value: String(prof.completed), color: [16, 185, 129] },
    { label: "Horas Trabalhadas", value: fmtHours(prof.hours_worked), color: [59, 130, 246] },
    { label: "Taxa de Conclusão", value: `${completionRate}%`, color: [139, 92, 246] },
    { label: "Cancelamentos", value: String(prof.cancelled), color: [239, 68, 68] },
    { label: "Bonificação", value: fmtBRL(prof.total_bonification), color: [212, 175, 55] },
  ];

  const kpiW = (contentW - 20) / 3;
  const kpiH = 52;
  kpis.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const kx = margin + col * (kpiW + 10);
    const ky = y + row * (kpiH + 10);

    // Card bg
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(kx, ky, kpiW, kpiH, 5, 5, "F");
    // Left accent
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(kx, ky, 4, kpiH, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 130);
    doc.text(kpi.label.toUpperCase(), kx + 14, ky + 18);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kx + 14, ky + 40);
  });

  y += 2 * (kpiH + 10) + 20;

  // ── Status Breakdown
  sectionTitle("Distribuição por Status");

  const statusItems = [
    { label: "Concluídos", value: prof.completed, color: [16, 185, 129] },
    { label: "Confirmados", value: prof.confirmed, color: [59, 130, 246] },
    { label: "Pendentes", value: prof.pending, color: [245, 158, 11] },
    { label: "Cancelados", value: prof.cancelled, color: [239, 68, 68] },
  ];

  const barMaxW = contentW - 120;
  statusItems.forEach((item) => {
    const pct = prof.total > 0 ? item.value / prof.total : 0;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 90);
    doc.text(item.label, margin, y + 10);

    // Background bar
    doc.setFillColor(235, 235, 240);
    doc.roundedRect(margin + 80, y, barMaxW, 14, 3, 3, "F");
    // Filled bar
    if (pct > 0) {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.roundedRect(margin + 80, y, Math.max(barMaxW * pct, 8), 14, 3, 3, "F");
    }

    // Count text
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 70);
    doc.text(`${item.value} (${Math.round(pct * 100)}%)`, margin + 80 + barMaxW + 8, y + 10);

    y += 22;
  });

  y += 14;

  // ── Check if we need a new page
  const checkPage = (needed: number) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - 40) {
      doc.addPage();
      y = 40;
    }
  };

  // ── Top Services
  checkPage(160);
  sectionTitle("Serviços Mais Realizados");

  if (prof.top_services.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 160);
    doc.text("Sem registros no período.", margin, y);
    y += 20;
  } else {
    const maxCount = prof.top_services[0]?.count || 1;
    prof.top_services.forEach((svc, i) => {
      const pct = svc.count / maxCount;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 90);
      doc.text(`${i + 1}. ${svc.name}`, margin, y + 10);

      const sBarX = margin + 160;
      const sBarW = contentW - 200;
      doc.setFillColor(235, 235, 240);
      doc.roundedRect(sBarX, y, sBarW, 14, 3, 3, "F");
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(sBarX, y, Math.max(sBarW * pct, 8), 14, 3, 3, "F");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`${svc.count}x`, sBarX + sBarW + 8, y + 10);

      y += 22;
    });
  }

  y += 10;

  // ── Monthly Evolution
  if (prof.by_month.length > 0) {
    checkPage(140);
    sectionTitle("Evolução Mensal");

    const monthMaxCount = Math.max(...prof.by_month.map((m) => m.count), 1);
    const mBarW = Math.min((contentW - 20) / prof.by_month.length - 8, 50);

    prof.by_month.forEach((m, i) => {
      const mx = margin + i * (mBarW + 8);
      const barH = Math.max((m.count / monthMaxCount) * 80, 4);
      const barY = y + 80 - barH;

      doc.setFillColor(79, 70, 229);
      doc.roundedRect(mx, barY, mBarW, barH, 3, 3, "F");

      // Count on top
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(String(m.count), mx + mBarW / 2 - 4, barY - 4);

      // Month label
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 130);
      doc.text(m.month, mx + 2, y + 92);
    });

    y += 108;
  }

  // ── Bonification highlight box
  checkPage(70);
  doc.setFillColor(255, 248, 230);
  doc.roundedRect(margin, y, contentW, 50, 6, 6, "F");
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, y, contentW, 50, 6, 6, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(160, 130, 20);
  doc.text("BONIFICAÇÃO / COMISSÃO NO PERÍODO", margin + 16, y + 20);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 140, 0);
  doc.text(fmtBRL(prof.total_bonification), margin + 16, y + 42);

  // ── Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 30, W - margin, pageH - 30);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 170);
  doc.text("Documento gerado automaticamente pelo sistema", margin, pageH - 18);
  doc.text(genDate, W - margin - 60, pageH - 18);

  // Save
  const safeName = prof.full_name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`relatorio_${safeName}.pdf`);
}

/* ───── MAIN PAGE ───── */
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
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, admin_level, branch_id")
        .eq("role", "admin")
        .in("admin_level", ["professional", "manager", "ceo"]);

      if (!roles || roles.length === 0) { setProfessionals([]); setLoading(false); return; }

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const branchIds = roles.map((r) => r.branch_id).filter(Boolean) as string[];
      const { data: branches } = branchIds.length
        ? await supabase.from("branches").select("id, name").in("id", branchIds)
        : { data: [] };

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, professional_id, status, appointment_date, appointment_time, service_id, services(name, duration_minutes)")
        .in("professional_id", userIds)
        .gte("appointment_date", dateFrom)
        .lte("appointment_date", dateTo);

      const apptIds = (appointments || []).map((a) => a.id);
      const { data: reviews } = apptIds.length
        ? await supabase.from("reviews").select("appointment_id, rating").in("appointment_id", apptIds)
        : { data: [] };

      const ratingMap: Record<string, number> = {};
      (reviews || []).forEach((r) => { ratingMap[r.appointment_id] = r.rating; });

      const { data: bonusPayments } = await supabase
        .from("bonification_payments" as any)
        .select("professional_id, bonus_amount, created_at")
        .in("professional_id", userIds)
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");

      const summaries: ProfessionalSummary[] = roles.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);
        const branch = branches?.find((b) => b.id === role.branch_id);
        const myAppts = (appointments || []).filter((a) => a.professional_id === role.user_id);

        const completed = myAppts.filter((a) => a.status === "completed");
        const cancelled = myAppts.filter((a) => a.status === "cancelled");
        const pending = myAppts.filter((a) => a.status === "pending");
        const confirmed = myAppts.filter((a) => a.status === "confirmed");

        const hours_worked = completed.reduce((acc, a) => {
          const svc = a.services as any;
          return acc + (svc?.duration_minutes ?? 60);
        }, 0);

        const myRatings = completed.map((a) => ratingMap[a.id]).filter((r) => r != null) as number[];
        const avg_rating = myRatings.length ? myRatings.reduce((a, b) => a + b, 0) / myRatings.length : null;

        const svcCount: Record<string, { name: string; count: number }> = {};
        myAppts.forEach((a) => {
          const svc = a.services as any;
          if (!svc) return;
          if (!svcCount[a.service_id]) svcCount[a.service_id] = { name: svc.name, count: 0 };
          svcCount[a.service_id].count++;
        });
        const top_services = Object.values(svcCount).sort((a, b) => b.count - a.count).slice(0, 5);

        const monthMap: Record<string, number> = {};
        myAppts.forEach((a) => {
          const d = new Date(a.appointment_date);
          const key = `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
          monthMap[key] = (monthMap[key] || 0) + 1;
        });
        const by_month = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

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

  if (!perms.canViewProfessionals) return <AccessDenied />;

  const displayList = selected === "all" ? professionals : professionals.filter((p) => p.user_id === selected);

  const handleExportAll = () => {
    displayList.forEach((prof) => downloadProfPDF(prof, dateFrom, dateTo));
  };

  const handleExportOne = (userId: string) => {
    const prof = professionals.find((p) => p.user_id === userId);
    if (prof) downloadProfPDF(prof, dateFrom, dateTo);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório de Profissionais</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise completa de desempenho por profissional</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportAll}>
          <Download className="h-4 w-4" />
          Exportar Todos em PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs mb-1 block">Profissional</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
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
            <div key={prof.user_id}>
              <ProfCard prof={prof} onExportPDF={() => handleExportOne(prof.user_id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── PROF CARD (UI) ───── */
function ProfCard({ prof, onExportPDF }: { prof: ProfessionalSummary; onExportPDF: () => void }) {
  const initials = prof.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const completionRate = prof.total > 0 ? Math.round((prof.completed / prof.total) * 100) : 0;

  const statusData = [
    { name: "Concluídos", value: prof.completed, color: STATUS_COLORS.completed },
    { name: "Confirmados", value: prof.confirmed, color: STATUS_COLORS.confirmed },
    { name: "Pendentes", value: prof.pending, color: STATUS_COLORS.pending },
    { name: "Cancelados", value: prof.cancelled, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  return (
    <Card className="overflow-hidden border shadow-sm">
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
        <Button variant="outline" size="sm" className="gap-2 ml-4" onClick={onExportPDF}>
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiMini icon={<Calendar className="h-4 w-4" />} label="Total" value={String(prof.total)} color="text-primary" />
          <KpiMini icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={String(prof.completed)} color="text-emerald-600" />
          <KpiMini icon={<Clock className="h-4 w-4" />} label="Horas" value={fmtHours(prof.hours_worked)} color="text-blue-600" />
          <KpiMini icon={<TrendingUp className="h-4 w-4" />} label="Conclusão" value={`${completionRate}%`} color="text-violet-600" />
          <BonificationKpi value={prof.total_bonification} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (svc.count / (prof.top_services[0]?.count || 1)) * 100)}%` }} />
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
  const formatted = fmtBRL(value);
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-1.5 text-amber-600">
        <DollarSign className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Bonificação</span>
      </div>
      <span className="text-xl font-bold text-amber-700">{formatted}</span>
    </div>
  );
}
