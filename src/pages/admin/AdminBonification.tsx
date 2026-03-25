import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Award,
  Search,
  CheckCircle2,
  Sparkles,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface BonificationRule {
  id: string;
  percentage: number;
  description: string | null;
  active: boolean;
  is_global: boolean;
  reference_period: string | null;
  total_sales: number | null;
  created_at: string;
}

interface Professional {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ProfessionalHours {
  id: string;
  professional_id: string;
  reference_period: string;
  hours_worked: number;
  rule_id: string | null;
  notes: string | null;
}

interface BonificationPayment {
  id: string;
  professional_id: string;
  plan_id: string | null;
  rule_id: string | null;
  hours_worked: number;
  bonus_amount: number;
  reference_period: string;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  plans?: { name: string };
}

// Row assembled for the table
interface CommissionRow {
  professional_id: string;
  full_name: string;
  avatar_url: string | null;
  services_count: number;         // completed appointments count
  time_worked_min: number;        // sum of duration_minutes
  clients_count: number;          // distinct clients
  hours_worked: number;           // from professional_hours
  bonus_amount: number;           // calculated share from pool
  payment_id: string | null;
  payment_status: string | null;
  paid_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthOptions(): { label: string; value: string }[] {
  const months = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  const now = new Date();
  const options = [];
  for (let i = 5; i >= -1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${months[d.getMonth()]} de ${d.getFullYear()}`;
    const value = `${months[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ label, value });
  }
  return options;
}

function parsePeriod(p: string): { from: string; to: string } | null {
  const months: Record<string, number> = {
    janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  };
  const parts = p.toLowerCase().trim().split(/\s+/);
  const monthIdx = months[parts[0]];
  const year = parseInt(parts[1]);
  if (monthIdx == null || isNaN(year)) return null;
  const from = new Date(year, monthIdx, 1).toISOString().split("T")[0];
  const to = new Date(year, monthIdx + 1, 0).toISOString().split("T")[0];
  return { from, to };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminBonification() {
  const perms = useAdminPermissions();

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const defaultPeriod = monthOptions[monthOptions.length - 2]?.value ?? monthOptions[0]?.value;

  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [totalPool, setTotalPool] = useState(""); // total_sales value
  const [percentage, setPercentage] = useState("10");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [allHours, setAllHours] = useState<ProfessionalHours[]>([]);
  const [payments, setPayments] = useState<BonificationPayment[]>([]);
  const [rules, setRules] = useState<BonificationRule[]>([]);

  // Appointment stats per professional for the selected period
  const [apptStats, setApptStats] = useState<
    Record<string, { services_count: number; time_worked_min: number; clients_count: number }>
  >({});

  // Detail dialog
  const [detailPro, setDetailPro] = useState<CommissionRow | null>(null);

  // Distribute confirm
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  async function fetchBase() {
    const [rolesRes, paymentsRes, rulesRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "admin").eq("admin_level", "professional"),
      supabase.from("bonification_payments" as any).select("*, plans(name)").order("created_at", { ascending: false }),
      supabase.from("bonification_rules" as any).select("*").order("created_at", { ascending: false }),
    ]);

    const profIds = (rolesRes.data ?? []).map((r: any) => r.user_id);
    let profs: Professional[] = [];
    if (profIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", profIds);
      if (profilesData) {
        profs = profilesData.map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name ?? "—",
          avatar_url: p.avatar_url ?? null,
        }));
      }
    }
    setProfessionals(profs);
    setPayments((paymentsRes.data ?? []) as unknown as BonificationPayment[]);
    setRules((rulesRes.data ?? []) as unknown as BonificationRule[]);
  }

  async function fetchPeriodData(period: string) {
    setLoading(true);
    const range = parsePeriod(period);

    // Fetch hours for period
    const { data: hoursData } = await supabase
      .from("professional_hours" as any)
      .select("*")
      .eq("reference_period", period);
    setAllHours((hoursData ?? []) as unknown as ProfessionalHours[]);

    // Fetch appointment stats
    if (range) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("professional_id, client_id, services(duration_minutes)")
        .eq("status", "completed")
        .gte("appointment_date", range.from)
        .lte("appointment_date", range.to);

      const stats: Record<string, { services_count: number; time_worked_min: number; clients_set: Set<string> }> = {};
      (appts ?? []).forEach((a: any) => {
        const pid = a.professional_id;
        if (!pid) return;
        if (!stats[pid]) stats[pid] = { services_count: 0, time_worked_min: 0, clients_set: new Set() };
        stats[pid].services_count++;
        stats[pid].time_worked_min += a.services?.duration_minutes ?? 60;
        stats[pid].clients_set.add(a.client_id);
      });

      const finalStats: Record<string, { services_count: number; time_worked_min: number; clients_count: number }> = {};
      Object.entries(stats).forEach(([pid, s]) => {
        finalStats[pid] = {
          services_count: s.services_count,
          time_worked_min: s.time_worked_min,
          clients_count: s.clients_set.size,
        };
      });
      setApptStats(finalStats);
    } else {
      setApptStats({});
    }

    // Auto-fill total sales from active subscriptions if not set
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("plan_id, plans(price)")
      .eq("status", "active");
    if (subs && subs.length > 0) {
      const total = (subs as any[]).reduce((acc, s) => acc + (s.plans?.price ?? 0), 0);
      setTotalPool(total.toFixed(2));
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchBase();
  }, []);

  useEffect(() => {
    if (professionals.length > 0 || loading) {
      fetchPeriodData(selectedPeriod);
    }
  }, [selectedPeriod, professionals.length]);

  // ─── Computed rows ───────────────────────────────────────────────────────────

  const bonusPool = useMemo(() => {
    const sales = parseFloat(totalPool || "0") || 0;
    const pct = parseFloat(percentage || "0") || 0;
    return (sales * pct) / 100;
  }, [totalPool, percentage]);

  const totalHoursInPeriod = useMemo(
    () => allHours.reduce((a, h) => a + h.hours_worked, 0),
    [allHours]
  );

  const rows = useMemo<CommissionRow[]>(() => {
    return professionals.map((prof) => {
      const stats = apptStats[prof.user_id] ?? { services_count: 0, time_worked_min: 0, clients_count: 0 };
      const hoursEntry = allHours.find((h) => h.professional_id === prof.user_id);
      const hours = hoursEntry?.hours_worked ?? parseFloat((stats.time_worked_min / 60).toFixed(2));

      const paymentEntry = payments.find(
        (p) => p.professional_id === prof.user_id && p.reference_period === selectedPeriod
      );

      const bonus =
        totalHoursInPeriod > 0
          ? parseFloat(((hours / totalHoursInPeriod) * bonusPool).toFixed(2))
          : 0;

      return {
        professional_id: prof.user_id,
        full_name: prof.full_name,
        avatar_url: prof.avatar_url,
        services_count: stats.services_count,
        time_worked_min: stats.time_worked_min,
        clients_count: stats.clients_count,
        hours_worked: hours,
        bonus_amount: paymentEntry?.bonus_amount ?? bonus,
        payment_id: paymentEntry?.id ?? null,
        payment_status: paymentEntry?.status ?? null,
        paid_at: paymentEntry?.paid_at ?? null,
      };
    });
  }, [professionals, apptStats, allHours, payments, selectedPeriod, bonusPool, totalHoursInPeriod]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rows, searchQuery]);

  const alreadyDistributed = useMemo(
    () => payments.some((p) => p.reference_period === selectedPeriod),
    [payments, selectedPeriod]
  );

  const pendingPayments = useMemo(
    () => rows.filter((r) => r.payment_status === "pending"),
    [rows]
  );

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!totalPool || parseFloat(totalPool) <= 0)
      return toast({ title: "Informe o Total Bolo", variant: "destructive" });
    if (alreadyDistributed)
      return toast({ title: "Distribuição já realizada para este período", variant: "destructive" });
    if (totalHoursInPeriod === 0) {
      // Auto-fill hours from appointments
      const toUpsert = professionals
        .map((prof) => {
          const stats = apptStats[prof.user_id];
          if (!stats || stats.time_worked_min === 0) return null;
          return {
            professional_id: prof.user_id,
            reference_period: selectedPeriod,
            hours_worked: parseFloat((stats.time_worked_min / 60).toFixed(2)),
            rule_id: null,
            notes: "Calculado automaticamente dos atendimentos",
          };
        })
        .filter(Boolean);

      if (toUpsert.length > 0) {
        await supabase
          .from("professional_hours" as any)
          .upsert(toUpsert, { onConflict: "professional_id,reference_period" });
        await fetchPeriodData(selectedPeriod);
        return;
      } else {
        return toast({ title: "Nenhuma hora registrada no período", variant: "destructive" });
      }
    }
    setDistributeDialogOpen(true);
  }

  async function distributeBonus() {
    setGenerating(true);
    const sales = parseFloat(totalPool || "0");
    const pct = parseFloat(percentage || "10");
    const pool = (sales * pct) / 100;

    // Upsert rule
    const rulePayload: any = {
      percentage: pct,
      total_sales: sales,
      reference_period: selectedPeriod,
      active: true,
      is_global: true,
    };
    const { data: ruleData, error: ruleErr } = await supabase
      .from("bonification_rules" as any)
      .upsert(rulePayload, { onConflict: "reference_period" })
      .select()
      .single();
    if (ruleErr) {
      toast({ title: "Erro ao salvar regra", description: ruleErr.message, variant: "destructive" });
      setGenerating(false);
      return;
    }

    const ruleId = (ruleData as any)?.id;

    // Ensure hours are saved
    const hoursToSave = professionals
      .map((prof) => {
        const stats = apptStats[prof.user_id];
        const existingHours = allHours.find((h) => h.professional_id === prof.user_id);
        const h = existingHours?.hours_worked ?? (stats ? parseFloat((stats.time_worked_min / 60).toFixed(2)) : 0);
        if (h <= 0) return null;
        return {
          professional_id: prof.user_id,
          reference_period: selectedPeriod,
          hours_worked: h,
          rule_id: ruleId,
          notes: null,
        };
      })
      .filter(Boolean);

    if (hoursToSave.length === 0) {
      toast({ title: "Nenhuma hora disponível para distribuição", variant: "destructive" });
      setGenerating(false);
      return;
    }

    await supabase
      .from("professional_hours" as any)
      .upsert(hoursToSave, { onConflict: "professional_id,reference_period" });

    const totalH = hoursToSave.reduce((a: number, h: any) => a + h!.hours_worked, 0);

    const newPayments = hoursToSave.map((h: any) => ({
      professional_id: h!.professional_id,
      rule_id: ruleId,
      plan_id: null,
      hours_worked: h!.hours_worked,
      bonus_amount: parseFloat(((h!.hours_worked / totalH) * pool).toFixed(2)),
      reference_period: selectedPeriod,
      status: "pending",
      notes: `Distribuição proporcional: ${h!.hours_worked}h de ${totalH}h totais`,
    }));

    const { error } = await supabase.from("bonification_payments" as any).insert(newPayments);
    if (error) {
      toast({ title: "Erro ao distribuir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Bônus distribuído para ${newPayments.length} profissional(is)!` });
    }

    setDistributeDialogOpen(false);
    setGenerating(false);
    await fetchBase();
    await fetchPeriodData(selectedPeriod);
  }

  async function handlePayAll() {
    if (pendingPayments.length === 0)
      return toast({ title: "Nenhum pagamento pendente", variant: "destructive" });
    setPaying(true);
    const ids = pendingPayments.map((r) => r.payment_id).filter(Boolean);
    const { error } = await supabase
      .from("bonification_payments" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      toast({ title: "Erro ao pagar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} pagamento(s) marcado(s) como pago(s)!` });
    }
    setPaying(false);
    await fetchBase();
  }

  async function markOnePaid(paymentId: string) {
    const { error } = await supabase
      .from("bonification_payments" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marcado como pago!" });
      await fetchBase();
    }
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const periodPayments = payments.filter((p) => p.reference_period === selectedPeriod);
    const pending = periodPayments.filter((p) => p.status === "pending").reduce((a, p) => a + p.bonus_amount, 0);
    const paid = periodPayments.filter((p) => p.status === "paid").reduce((a, p) => a + p.bonus_amount, 0);
    return { pending, paid };
  }, [payments, selectedPeriod]);

  // ─── Guard ───────────────────────────────────────────────────────────────────

  if (!perms.canViewBonification) return <AccessDenied />;

  const periodLabel = monthOptions.find((m) => m.value === selectedPeriod)?.label ?? selectedPeriod;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Award className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comissões Assinaturas</h1>
          <p className="text-sm text-muted-foreground">
            Distribua o fundo de bônus proporcionalmente às horas trabalhadas
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Period */}
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Total Bolo */}
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Total Bolo (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={totalPool}
                onChange={(e) => setTotalPool(e.target.value)}
                className="h-9"
              />
            </div>

            {/* % da Equipe */}
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">% da Equipe</Label>
              <Input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                placeholder="10"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Pool preview */}
            {bonusPool > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fundo a distribuir</Label>
                <div className="h-9 flex items-center px-3 rounded-md bg-primary/10 text-primary font-bold text-sm">
                  {fmt(bonusPool)}
                </div>
              </div>
            )}

            <div className="flex gap-2 ml-auto">
              <Button
                onClick={handleGenerate}
                disabled={loading || generating || alreadyDistributed}
                className="gap-2 h-9"
                variant="outline"
              >
                <Search className="w-4 h-4" />
                {alreadyDistributed ? "Já gerado" : "Gerar"}
              </Button>
              <Button
                onClick={handlePayAll}
                disabled={paying || pendingPayments.length === 0}
                className="gap-2 h-9"
              >
                <CheckCircle2 className="w-4 h-4" />
                Pagar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI mini bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Fundo do período</p>
              <p className="text-base font-bold text-foreground">{fmt(bonusPool)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-warning shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-base font-bold text-foreground">{fmt(kpis.pending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pago</p>
              <p className="text-base font-bold text-foreground">{fmt(kpis.paid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {/* Table header bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {periodLabel} · {filteredRows.length} profissional(is)
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum profissional encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-56">Profissional</TableHead>
                    <TableHead className="text-center">Qtd serviços</TableHead>
                    <TableHead className="text-center">Tempo trabalhado</TableHead>
                    <TableHead className="text-center">% da equipe</TableHead>
                    <TableHead className="text-center">Comissão</TableHead>
                    <TableHead className="text-center">Clientes atendidos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const teamPct =
                      totalHoursInPeriod > 0
                        ? ((row.hours_worked / totalHoursInPeriod) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <TableRow key={row.professional_id}>
                        {/* Profissional */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {row.avatar_url ? (
                              <img
                                src={row.avatar_url}
                                alt={row.full_name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {row.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-medium text-foreground text-sm">{row.full_name}</span>
                          </div>
                        </TableCell>

                        {/* Qtd serviços */}
                        <TableCell className="text-center text-sm text-foreground">
                          {row.services_count}
                        </TableCell>

                        {/* Tempo trabalhado */}
                        <TableCell className="text-center text-sm text-foreground">
                          {row.time_worked_min > 0
                            ? `${row.time_worked_min} min`
                            : `${row.hours_worked}h`}
                        </TableCell>

                        {/* % da equipe */}
                        <TableCell className="text-center text-sm text-foreground">
                          {teamPct}%
                        </TableCell>

                        {/* Comissão */}
                        <TableCell className="text-center">
                          <span className="font-semibold text-primary text-sm">
                            {fmt(row.bonus_amount)}
                          </span>
                        </TableCell>

                        {/* Clientes atendidos */}
                        <TableCell className="text-center text-sm text-foreground">
                          {row.clients_count}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {row.payment_status === "paid" ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                              Pago
                            </Badge>
                          ) : row.payment_status === "pending" ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                Pendente
                              </Badge>
                              <button
                                onClick={() => row.payment_id && markOnePaid(row.payment_id)}
                                className="text-xs text-primary hover:underline"
                              >
                                Marcar pago
                              </button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-xs">—</Badge>
                          )}
                        </TableCell>

                        {/* Detalhes */}
                        <TableCell className="text-center">
                          <button
                            onClick={() => setDetailPro(row)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver detalhes"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailPro} onOpenChange={(o) => !o && setDetailPro(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes — {detailPro?.full_name}</DialogTitle>
          </DialogHeader>
          {detailPro && (
            <div className="space-y-3 text-sm py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-medium text-foreground capitalize">{selectedPeriod}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Serviços realizados</p>
                  <p className="font-medium text-foreground">{detailPro.services_count}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Tempo trabalhado</p>
                  <p className="font-medium text-foreground">
                    {detailPro.time_worked_min > 0
                      ? `${detailPro.time_worked_min} min (${detailPro.hours_worked}h)`
                      : `${detailPro.hours_worked}h`}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Clientes atendidos</p>
                  <p className="font-medium text-foreground">{detailPro.clients_count}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">% da equipe</p>
                  <p className="font-medium text-foreground">
                    {totalHoursInPeriod > 0
                      ? `${((detailPro.hours_worked / totalHoursInPeriod) * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Comissão</p>
                  <p className="font-bold text-primary">{fmt(detailPro.bonus_amount)}</p>
                </div>
              </div>
              {detailPro.payment_status === "paid" && detailPro.paid_at && (
                <p className="text-xs text-muted-foreground text-center">
                  Pago em {new Date(detailPro.paid_at).toLocaleDateString("pt-BR")}
                </p>
              )}
              {detailPro.payment_status === "pending" && detailPro.payment_id && (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    markOnePaid(detailPro.payment_id!);
                    setDetailPro(null);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Marcar como Pago
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailPro(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Distribute Confirm Dialog ── */}
      <AlertDialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Distribuir Comissões?</AlertDialogTitle>
            <AlertDialogDescription>
              O fundo de <strong>{fmt(bonusPool)}</strong> será distribuído entre{" "}
              <strong>{rows.filter((r) => r.hours_worked > 0).length} profissional(is)</strong> com base no{" "}
              <strong>tempo trabalhado</strong> no período de <strong>{periodLabel}</strong>.
              <br /><br />
              Lançamentos pendentes serão criados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={distributeBonus} disabled={generating}>
              {generating ? "Distribuindo…" : "Distribuir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
