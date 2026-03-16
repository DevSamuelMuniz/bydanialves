import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";
import {
  Award,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  History,
  TrendingUp,
  Calculator,
  Timer,
  Sparkles,
} from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Types ───────────────────────────────────────────────────────────────────

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
  profiles?: { full_name: string; avatar_url: string | null };
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
  profiles?: { full_name: string; avatar_url: string | null };
  plans?: { name: string };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminBonification() {
  const perms = useAdminPermissions();

  const [rules, setRules] = useState<BonificationRule[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [allHours, setAllHours] = useState<ProfessionalHours[]>([]);
  const [payments, setPayments] = useState<BonificationPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Rule dialog
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BonificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    percentage: "10",
    total_sales: "",
    reference_period: "",
    description: "",
    active: true,
  });
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  // Hours dialog
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [hoursRuleId, setHoursRuleId] = useState<string | null>(null);
  const [hoursForm, setHoursForm] = useState<
    { professional_id: string; full_name: string; hours: string; notes: string; report_hours: number }[]
  >([]);

  // Distribute dialog
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [distributeRuleId, setDistributeRuleId] = useState<string | null>(null);

  // History filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("");

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  async function fetchAll() {
    setLoading(true);
    const [rulesRes, profRes, hoursRes, paymentsRes] = await Promise.all([
      supabase
        .from("bonification_rules" as any)
        .select("id,percentage,description,active,is_global,reference_period,total_sales,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_roles")
        .select("user_id, profiles(user_id,full_name,avatar_url)")
        .eq("role", "admin")
        .eq("admin_level", "professional"),
      supabase
        .from("professional_hours" as any)
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("bonification_payments" as any)
        .select("*, plans(name)")
        .order("created_at", { ascending: false }),
    ]);

    if (rulesRes.data) setRules(rulesRes.data as unknown as BonificationRule[]);

    if (profRes.data) {
      const profs: Professional[] = (profRes.data as any[])
        .map((r) => r.profiles)
        .filter(Boolean)
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name ?? "—",
          avatar_url: p.avatar_url ?? null,
        }));
      setProfessionals(profs);
    }

    // Enrich hours with profile names
    if (hoursRes.data && profRes.data) {
      const profileMap = new Map(
        (profRes.data as any[])
          .map((r) => r.profiles)
          .filter(Boolean)
          .map((p: any) => [p.user_id, p])
      );
      const enriched = (hoursRes.data as any[]).map((h) => ({
        ...h,
        profiles: profileMap.get(h.professional_id) ?? null,
      }));
      setAllHours(enriched as unknown as ProfessionalHours[]);
    }

    // Enrich payments with profile
    if (paymentsRes.data) {
      const profileMap = new Map(
        ((profRes.data ?? []) as any[])
          .map((r) => r.profiles)
          .filter(Boolean)
          .map((p: any) => [p.user_id, p])
      );
      const enriched = (paymentsRes.data as any[]).map((pay) => ({
        ...pay,
        profiles: profileMap.get(pay.professional_id) ?? null,
      }));
      setPayments(enriched as unknown as BonificationPayment[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const pool = rules
      .filter((r) => r.active && r.total_sales)
      .reduce((acc, r) => acc + ((r.total_sales ?? 0) * r.percentage) / 100, 0);

    const pending = payments
      .filter((p) => p.status === "pending")
      .reduce((acc, p) => acc + p.bonus_amount, 0);

    const paid = payments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + p.bonus_amount, 0);

    return { pool, pending, paid };
  }, [rules, payments]);

  // ─── Rule helpers ────────────────────────────────────────────────────────────

  function getCurrentPeriod() {
    return new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });
  }

  function openAddRule() {
    setEditingRule(null);
    setRuleForm({
      percentage: "10",
      total_sales: "",
      reference_period: getCurrentPeriod(),
      description: "",
      active: true,
    });
    setRuleDialogOpen(true);
  }

  function openEditRule(rule: BonificationRule) {
    setEditingRule(rule);
    setRuleForm({
      percentage: String(rule.percentage),
      total_sales: rule.total_sales ? String(rule.total_sales) : "",
      reference_period: rule.reference_period ?? "",
      description: rule.description ?? "",
      active: rule.active,
    });
    setRuleDialogOpen(true);
  }

  async function saveRule() {
    const pct = parseFloat(ruleForm.percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100)
      return toast({ title: "Porcentagem inválida (1-100)", variant: "destructive" });
    if (!ruleForm.reference_period.trim())
      return toast({ title: "Informe o período de referência", variant: "destructive" });

    const totalSales = parseFloat(ruleForm.total_sales || "0") || 0;

    const payload: any = {
      percentage: pct,
      total_sales: totalSales,
      reference_period: ruleForm.reference_period.trim(),
      description: ruleForm.description || null,
      active: ruleForm.active,
      is_global: true,
    };

    if (editingRule) {
      const { error } = await supabase
        .from("bonification_rules" as any)
        .update(payload)
        .eq("id", editingRule.id);
      if (error)
        return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      toast({ title: "Regra atualizada!" });
    } else {
      const { error } = await supabase.from("bonification_rules" as any).insert(payload);
      if (error)
        return toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      toast({ title: "Regra criada!" });
    }

    setRuleDialogOpen(false);
    fetchAll();
  }

  async function deleteRule(id: string) {
    const { error } = await supabase
      .from("bonification_rules" as any)
      .delete()
      .eq("id", id);
    if (error)
      return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    toast({ title: "Regra excluída" });
    setDeleteRuleId(null);
    fetchAll();
  }

  // ─── Hours helpers ───────────────────────────────────────────────────────────

  const [hoursLoading, setHoursLoading] = useState(false);

  async function openHoursDialog(ruleId: string) {
    setHoursRuleId(ruleId);
    const rule = rules.find((r) => r.id === ruleId);
    const period = rule?.reference_period ?? getCurrentPeriod();

    // Parse period string like "março 2026" → date range
    const parsePeriod = (p: string): { from: string; to: string } | null => {
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
    };

    setHoursLoading(true);
    setHoursDialogOpen(true);

    // Build initial form from saved hours
    const baseForm = professionals.map((prof) => {
      const existing = allHours.find(
        (h) => h.professional_id === prof.user_id && h.rule_id === ruleId
      );
      return {
        professional_id: prof.user_id,
        full_name: prof.full_name,
        hours: existing ? String(existing.hours_worked) : "",
        notes: existing?.notes ?? "",
        report_hours: 0, // will be filled from appointments
      };
    });

    // Fetch completed appointments in period to auto-calculate hours
    const range = parsePeriod(period);
    if (range) {
      const profIds = professionals.map((p) => p.user_id);
      const { data: appts } = await supabase
        .from("appointments")
        .select("professional_id, services(duration_minutes)")
        .in("professional_id", profIds)
        .eq("status", "completed")
        .gte("appointment_date", range.from)
        .lte("appointment_date", range.to);

      if (appts) {
        // Sum duration_minutes per professional → convert to hours (decimal)
        const minutesMap: Record<string, number> = {};
        (appts as any[]).forEach((a) => {
          const mins = (a.services as any)?.duration_minutes ?? 60;
          minutesMap[a.professional_id] = (minutesMap[a.professional_id] ?? 0) + mins;
        });

        baseForm.forEach((f) => {
          const mins = minutesMap[f.professional_id] ?? 0;
          f.report_hours = parseFloat((mins / 60).toFixed(2));
          // Auto-fill from report if not already manually saved
          if (!f.hours) {
            f.hours = f.report_hours > 0 ? String(f.report_hours) : "";
          }
        });
      }
    }

    setHoursForm(baseForm);
    setHoursLoading(false);
  }

  async function saveHours() {
    if (!hoursRuleId) return;
    const rule = rules.find((r) => r.id === hoursRuleId);
    const period = rule?.reference_period ?? getCurrentPeriod();

    const toSave = hoursForm.filter((f) => f.hours.trim() !== "" && parseFloat(f.hours) >= 0);
    if (toSave.length === 0)
      return toast({ title: "Informe pelo menos 1 hora", variant: "destructive" });

    const upserts = toSave.map((f) => ({
      professional_id: f.professional_id,
      reference_period: period,
      hours_worked: parseFloat(f.hours) || 0,
      rule_id: hoursRuleId,
      notes: f.notes || null,
    }));

    const { error } = await supabase
      .from("professional_hours" as any)
      .upsert(upserts, { onConflict: "professional_id,reference_period" });

    if (error)
      return toast({ title: "Erro ao salvar horas", description: error.message, variant: "destructive" });

    toast({ title: "Horas salvas com sucesso!" });
    setHoursDialogOpen(false);
    fetchAll();
  }

  // ─── Distribute bonus ────────────────────────────────────────────────────────

  function openDistribute(ruleId: string) {
    setDistributeRuleId(ruleId);
    setDistributeDialogOpen(true);
  }

  async function distributeBonus() {
    if (!distributeRuleId) return;
    const rule = rules.find((r) => r.id === distributeRuleId);
    if (!rule) return;

    const period = rule.reference_period ?? getCurrentPeriod();
    const totalSales = rule.total_sales ?? 0;
    const bonusPool = (totalSales * rule.percentage) / 100;

    // Get hours for this rule
    const hoursForRule = allHours.filter((h) => h.rule_id === distributeRuleId);
    const totalHours = hoursForRule.reduce((a, h) => a + h.hours_worked, 0);

    if (totalHours === 0)
      return toast({ title: "Nenhuma hora registrada para este período", variant: "destructive" });

    if (bonusPool === 0)
      return toast({ title: "Valor total de vendas não informado na regra", variant: "destructive" });

    // Check if payments already exist for this period+rule
    const existing = payments.filter(
      (p) => p.rule_id === distributeRuleId && p.reference_period === period
    );
    if (existing.length > 0)
      return toast({ title: "Distribuição já realizada para este período", variant: "destructive" });

    const newPayments = hoursForRule
      .filter((h) => h.hours_worked > 0)
      .map((h) => ({
        professional_id: h.professional_id,
        rule_id: distributeRuleId,
        plan_id: null,
        hours_worked: h.hours_worked,
        bonus_amount: parseFloat(((h.hours_worked / totalHours) * bonusPool).toFixed(2)),
        reference_period: period,
        status: "pending",
        notes: `Distribuição proporcional: ${h.hours_worked}h de ${totalHours}h totais`,
      }));

    const { error } = await supabase
      .from("bonification_payments" as any)
      .insert(newPayments);

    if (error)
      return toast({ title: "Erro ao distribuir", description: error.message, variant: "destructive" });

    toast({ title: `Bônus distribuído para ${newPayments.length} profissional(is)!` });
    setDistributeDialogOpen(false);
    fetchAll();
  }

  // ─── Mark paid ───────────────────────────────────────────────────────────────

  async function markAsPaid(id: string) {
    const { error } = await supabase
      .from("bonification_payments" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error)
      return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Marcado como pago!" });
    fetchAll();
  }

  // ─── Filtered payments ───────────────────────────────────────────────────────

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterPeriod && !p.reference_period.toLowerCase().includes(filterPeriod.toLowerCase()))
        return false;
      return true;
    });
  }, [payments, filterStatus, filterPeriod]);

  // ─── Guard ──────────────────────────────────────────────────────────────────

  if (!perms.canViewBonification) return <AccessDenied />;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Award className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonificação</h1>
          <p className="text-sm text-muted-foreground">
            Distribua o fundo de bônus proporcionalmente às horas trabalhadas
          </p>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fundo de Bonificação</p>
              <p className="text-xl font-bold text-foreground">{fmt(kpis.pool)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente de Pagamento</p>
              <p className="text-xl font-bold text-foreground">{fmt(kpis.pending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              <p className="text-xl font-bold text-foreground">{fmt(kpis.paid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How it works banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-foreground/80 space-y-1">
            <p className="font-semibold text-foreground">Como funciona o modelo de distribuição</p>
            <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
              <li>CEO cria uma <strong>regra mensal</strong> com o valor total de vendas e a % de bônus</li>
              <li>Registra as <strong>horas trabalhadas</strong> de cada profissional no período</li>
              <li>Clica em <strong>Distribuir</strong> — o sistema divide proporcionalmente às horas</li>
              <li>Quem trabalhou mais, recebe mais do fundo</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="rules">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="rules" className="gap-2">
            <Calculator className="w-4 h-4" /> Regras
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Timer className="w-4 h-4" /> Horas Trabalhadas
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Regras ── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openAddRule} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nova Regra Mensal
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-10 text-center">
                <Calculator className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma regra criada.</p>
                <p className="text-sm text-muted-foreground/70">
                  Crie uma regra mensal para iniciar a distribuição de bônus.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const pool = ((rule.total_sales ?? 0) * rule.percentage) / 100;
                const hoursForRule = allHours.filter((h) => h.rule_id === rule.id);
                const totalHours = hoursForRule.reduce((a, h) => a + h.hours_worked, 0);
                const alreadyDistributed = payments.some(
                  (p) => p.rule_id === rule.id && p.reference_period === rule.reference_period
                );
                return (
                  <Card key={rule.id} className="border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <DollarSign className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">
                                {rule.reference_period ?? "—"}
                              </span>
                              <Badge variant={rule.active ? "default" : "secondary"} className="text-xs">
                                {rule.active ? "Ativa" : "Inativa"}
                              </Badge>
                              {alreadyDistributed && (
                                <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">
                                  Distribuído
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Vendas: <span className="font-medium text-foreground">{fmt(rule.total_sales ?? 0)}</span>
                              {" · "}
                              <span className="font-medium text-primary">{rule.percentage}%</span>
                              {" = fundo "}
                              <span className="font-bold text-primary">{fmt(pool)}</span>
                            </p>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5">{rule.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {totalHours > 0
                                ? `${totalHours}h totais registradas com ${hoursForRule.length} profissional(is)`
                                : "Nenhuma hora registrada ainda"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => openHoursDialog(rule.id)}
                          >
                            <Timer className="w-4 h-4" /> Registrar Horas
                          </Button>
                          {!alreadyDistributed && totalHours > 0 && pool > 0 && (
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => openDistribute(rule.id)}
                            >
                              <Sparkles className="w-4 h-4" /> Distribuir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditRule(rule)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteRuleId(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Horas Trabalhadas ── */}
        <TabsContent value="hours" className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : allHours.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-10 text-center">
                <Timer className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma hora registrada.</p>
                <p className="text-sm text-muted-foreground/70">
                  Vá em Regras e clique em "Registrar Horas" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Group by period */}
              {Array.from(new Set(allHours.map((h) => h.reference_period))).map((period) => {
                const periodHours = allHours.filter((h) => h.reference_period === period);
                const totalH = periodHours.reduce((a, h) => a + h.hours_worked, 0);
                return (
                  <div key={period} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground capitalize">{period}</span>
                      <span className="text-xs text-muted-foreground">— {totalH}h totais</span>
                    </div>
                    {periodHours.map((h) => (
                      <Card key={h.id} className="border-border/60">
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {h.profiles?.avatar_url ? (
                              <img
                                src={h.profiles.avatar_url}
                                alt={h.profiles.full_name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {(h.profiles?.full_name ?? "?").charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground text-sm">{h.profiles?.full_name ?? "—"}</p>
                              {h.notes && <p className="text-xs text-muted-foreground truncate">{h.notes}</p>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-primary">{h.hours_worked}h</p>
                            {totalH > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {((h.hours_worked / totalH) * 100).toFixed(1)}% do total
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Histórico ── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtrar por período…"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-52"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-10 text-center">
                <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum lançamento encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((p) => (
                <Card key={p.id} className="border-border/60">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.profiles?.avatar_url ? (
                        <img
                          src={p.profiles.avatar_url}
                          alt={p.profiles.full_name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(p.profiles?.full_name ?? "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {p.profiles?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.reference_period}
                          {p.hours_worked > 0 && ` · ${p.hours_worked}h trabalhadas`}
                        </p>
                        {p.notes && (
                          <p className="text-xs text-muted-foreground/60 truncate">{p.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                      <div className="text-right">
                        <p className="font-bold text-foreground">{fmt(p.bonus_amount)}</p>
                        {p.paid_at && (
                          <p className="text-xs text-muted-foreground">
                            Pago em {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          p.status === "paid"
                            ? "bg-green-500/20 text-green-700 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
                        }
                      >
                        {p.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                      {p.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-green-500/40 text-green-700 hover:bg-green-500/10"
                          onClick={() => markAsPaid(p.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Marcar Pago
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Rule Dialog ── */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Editar Regra" : "Nova Regra de Bonificação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Período de Referência</Label>
              <Input
                value={ruleForm.reference_period}
                onChange={(e) => setRuleForm((f) => ({ ...f, reference_period: e.target.value }))}
                placeholder="ex: Março 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Total de Vendas de Planos no Mês (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={ruleForm.total_sales}
                onChange={(e) => setRuleForm((f) => ({ ...f, total_sales: e.target.value }))}
                placeholder="ex: 5000.00"
              />
              <p className="text-xs text-muted-foreground">
                Valor total arrecadado com planos neste período
              </p>
            </div>
            <div className="space-y-2">
              <Label>Porcentagem de Bônus (%)</Label>
              <Input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={ruleForm.percentage}
                onChange={(e) => setRuleForm((f) => ({ ...f, percentage: e.target.value }))}
                placeholder="10"
              />
              {ruleForm.total_sales && (
                <p className="text-xs text-muted-foreground">
                  Fundo disponível:{" "}
                  <span className="font-semibold text-primary">
                    {fmt((parseFloat(ruleForm.total_sales || "0") * parseFloat(ruleForm.percentage || "0")) / 100)}
                  </span>{" "}
                  a ser distribuído proporcionalmente às horas
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={ruleForm.description}
                onChange={(e) => setRuleForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Notas sobre esta regra…"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={ruleForm.active}
                onCheckedChange={(v) => setRuleForm((f) => ({ ...f, active: v }))}
                id="rule-active"
              />
              <Label htmlFor="rule-active">Regra ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveRule}>
              {editingRule ? "Salvar" : "Criar Regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hours Dialog ── */}
      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Horas Trabalhadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Informe as horas de cada profissional no período. Quem trabalhou mais receberá uma fatia maior do fundo.
            </p>
            {professionals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum profissional encontrado. Cadastre profissionais primeiro.
              </p>
            ) : (
              hoursForm.map((f, i) => (
                <div key={f.professional_id} className="rounded-lg border border-border/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {f.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-sm text-foreground">{f.full_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Horas trabalhadas</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="0"
                        value={f.hours}
                        onChange={(e) => {
                          const updated = [...hoursForm];
                          updated[i] = { ...updated[i], hours: e.target.value };
                          setHoursForm(updated);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observação</Label>
                      <Input
                        placeholder="opcional"
                        value={f.notes}
                        onChange={(e) => {
                          const updated = [...hoursForm];
                          updated[i] = { ...updated[i], notes: e.target.value };
                          setHoursForm(updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoursDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveHours}>Salvar Horas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Distribute Confirm Dialog ── */}
      <AlertDialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Distribuir Bônus?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!distributeRuleId) return null;
                const rule = rules.find((r) => r.id === distributeRuleId);
                if (!rule) return null;
                const pool = ((rule.total_sales ?? 0) * rule.percentage) / 100;
                const hoursForRule = allHours.filter((h) => h.rule_id === distributeRuleId);
                const totalHours = hoursForRule.reduce((a, h) => a + h.hours_worked, 0);
                return (
                  <span>
                    O fundo de <strong>{fmt(pool)}</strong> será distribuído entre{" "}
                    <strong>{hoursForRule.length} profissional(is)</strong> com base em{" "}
                    <strong>{totalHours}h</strong> totais registradas.
                    <br />
                    Lançamentos pendentes serão criados automaticamente. Esta ação não pode ser desfeita.
                  </span>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={distributeBonus}>Distribuir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Rule Dialog ── */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(o) => !o && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              As horas e lançamentos associados também serão removidos. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRuleId && deleteRule(deleteRuleId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
