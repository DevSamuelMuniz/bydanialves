import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import AccessDenied from "@/components/admin/AccessDenied";
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
  BookOpen,
  History,
  TrendingUp,
} from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Types ───────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface BonificationRule {
  id: string;
  plan_id: string;
  percentage: number;
  description: string | null;
  active: boolean;
  created_at: string;
  plans?: Plan;
}

interface Professional {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  plans: { plan_id: string; plan_name: string; plan_price: number }[];
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

  const [plans, setPlans] = useState<Plan[]>([]);
  const [rules, setRules] = useState<BonificationRule[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [payments, setPayments] = useState<BonificationPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Rule dialog
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BonificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    plan_id: "",
    percentage: "10",
    description: "",
    active: true,
  });
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    plan_id: "",
    hours_worked: "",
    reference_period: "",
    notes: "",
  });

  // History filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("");

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  async function fetchAll() {
    setLoading(true);
    const [plansRes, rulesRes, ppRes, paymentsRes] = await Promise.all([
      supabase.from("plans").select("id,name,price,active").order("name"),
      supabase
        .from("bonification_rules" as any)
        .select("*, plans(id,name,price,active)")
        .order("created_at", { ascending: false }),
      supabase
        .from("plan_professionals")
        .select(
          "professional_id, plan_id, plans(id,name,price,active), profiles!plan_professionals_professional_id_fkey(user_id,full_name,avatar_url)"
        ),
      supabase
        .from("bonification_payments" as any)
        .select(
          "*, profiles!bonification_payments_professional_id_fkey(full_name,avatar_url), plans(name)"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (plansRes.data) setPlans(plansRes.data as Plan[]);
    if (rulesRes.data) setRules(rulesRes.data as unknown as BonificationRule[]);

    // Group professionals
    if (ppRes.data) {
      const map = new Map<string, Professional>();
      for (const row of ppRes.data as any[]) {
        const uid = row.professional_id;
        if (!map.has(uid)) {
          map.set(uid, {
            user_id: uid,
            full_name: row.profiles?.full_name ?? "—",
            avatar_url: row.profiles?.avatar_url ?? null,
            plans: [],
          });
        }
        if (row.plans) {
          map.get(uid)!.plans.push({
            plan_id: row.plan_id,
            plan_name: row.plans.name,
            plan_price: row.plans.price,
          });
        }
      }
      setProfessionals(Array.from(map.values()));
    }

    if (paymentsRes.data)
      setPayments(paymentsRes.data as unknown as BonificationPayment[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const pool = rules
      .filter((r) => r.active && r.plans)
      .reduce((acc, r) => acc + (r.plans!.price * r.percentage) / 100, 0);

    const pending = payments
      .filter((p) => p.status === "pending")
      .reduce((acc, p) => acc + p.bonus_amount, 0);

    const paid = payments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + p.bonus_amount, 0);

    return { pool, pending, paid };
  }, [rules, payments]);

  // ─── Rule helpers ────────────────────────────────────────────────────────────

  function openAddRule() {
    setEditingRule(null);
    setRuleForm({ plan_id: "", percentage: "10", description: "", active: true });
    setRuleDialogOpen(true);
  }

  function openEditRule(rule: BonificationRule) {
    setEditingRule(rule);
    setRuleForm({
      plan_id: rule.plan_id,
      percentage: String(rule.percentage),
      description: rule.description ?? "",
      active: rule.active,
    });
    setRuleDialogOpen(true);
  }

  async function saveRule() {
    if (!ruleForm.plan_id)
      return toast({ title: "Selecione um plano", variant: "destructive" });
    const pct = parseFloat(ruleForm.percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100)
      return toast({ title: "Porcentagem inválida (1-100)", variant: "destructive" });

    const payload = {
      plan_id: ruleForm.plan_id,
      percentage: pct,
      description: ruleForm.description || null,
      active: ruleForm.active,
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

  // ─── Payment helpers ─────────────────────────────────────────────────────────

  function openPaymentDialog(prof: Professional) {
    setSelectedProfessional(prof);
    setPaymentForm({
      plan_id: prof.plans[0]?.plan_id ?? "",
      hours_worked: "",
      reference_period: new Date().toLocaleString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
      notes: "",
    });
    setPaymentDialogOpen(true);
  }

  async function savePayment() {
    if (!selectedProfessional || !paymentForm.plan_id)
      return toast({ title: "Selecione um plano", variant: "destructive" });
    if (!paymentForm.reference_period.trim())
      return toast({ title: "Informe o período de referência", variant: "destructive" });

    const rule = rules.find(
      (r) => r.plan_id === paymentForm.plan_id && r.active
    );
    const plan = selectedProfessional.plans.find(
      (p) => p.plan_id === paymentForm.plan_id
    );
    if (!plan) return;

    const pct = rule ? rule.percentage : 10;
    const bonus = (plan.plan_price * pct) / 100;

    const payload = {
      professional_id: selectedProfessional.user_id,
      plan_id: paymentForm.plan_id,
      rule_id: rule?.id ?? null,
      hours_worked: parseFloat(paymentForm.hours_worked) || 0,
      bonus_amount: bonus,
      reference_period: paymentForm.reference_period.trim(),
      notes: paymentForm.notes || null,
      status: "pending",
    };

    const { error } = await supabase
      .from("bonification_payments" as any)
      .insert(payload);
    if (error)
      return toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });

    toast({ title: "Lançamento registrado!" });
    setPaymentDialogOpen(false);
    fetchAll();
  }

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
      if (
        filterPeriod &&
        !p.reference_period.toLowerCase().includes(filterPeriod.toLowerCase())
      )
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
            Gerencie regras, profissionais e pagamentos de bonificação
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

      {/* Tabs */}
      <Tabs defaultValue="rules">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="rules" className="gap-2">
            <BookOpen className="w-4 h-4" /> Regras
          </TabsTrigger>
          <TabsTrigger value="professionals" className="gap-2">
            <Users className="w-4 h-4" /> Profissionais
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Regras ── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openAddRule} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nova Regra
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-10 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma regra criada.</p>
                <p className="text-sm text-muted-foreground/70">
                  Crie regras para definir as porcentagens de bonificação por plano.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className="border-border/60">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">
                            {rule.plans?.name ?? "—"}
                          </span>
                          <Badge
                            variant={rule.active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {rule.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          <span className="font-medium text-primary">
                            {rule.percentage}%
                          </span>
                          {rule.plans && (
                            <span className="ml-2 text-muted-foreground/70">
                              → {fmt((rule.plans.price * rule.percentage) / 100)} por
                              assinatura
                            </span>
                          )}
                        </p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Profissionais ── */}
        <TabsContent value="professionals" className="space-y-4 mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : professionals.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-10 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Nenhum profissional vinculado a planos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {professionals.map((prof) => {
                const totalBonus = prof.plans.reduce((acc, p) => {
                  const rule = rules.find(
                    (r) => r.plan_id === p.plan_id && r.active
                  );
                  const pct = rule ? rule.percentage : 10;
                  return acc + (p.plan_price * pct) / 100;
                }, 0);

                return (
                  <Card key={prof.user_id} className="border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {prof.avatar_url ? (
                            <img
                              src={prof.avatar_url}
                              alt={prof.full_name}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-primary">
                                {prof.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {prof.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {prof.plans.length} plano(s) vinculado(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Bônus total</p>
                          <p className="text-lg font-bold text-primary">
                            {fmt(totalBonus)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {prof.plans.map((p) => {
                          const rule = rules.find(
                            (r) => r.plan_id === p.plan_id && r.active
                          );
                          const pct = rule ? rule.percentage : 10;
                          const bonus = (p.plan_price * pct) / 100;
                          return (
                            <div
                              key={p.plan_id}
                              className="flex items-center justify-between text-sm rounded-md bg-muted/40 px-3 py-1.5"
                            >
                              <span className="text-foreground/80 truncate">
                                {p.plan_name}
                              </span>
                              <span className="font-medium text-primary ml-2 shrink-0">
                                {pct}% → {fmt(bonus)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => openPaymentDialog(prof)}
                      >
                        <Plus className="w-4 h-4" /> Registrar Lançamento
                      </Button>
                    </CardContent>
                  </Card>
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
                          {p.plans?.name ?? "—"} · {p.reference_period}
                          {p.hours_worked > 0 && ` · ${p.hours_worked}h`}
                        </p>
                        {p.notes && (
                          <p className="text-xs text-muted-foreground/60 truncate">
                            {p.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          {fmt(p.bonus_amount)}
                        </p>
                        {p.paid_at && (
                          <p className="text-xs text-muted-foreground">
                            Pago em{" "}
                            {new Date(p.paid_at).toLocaleDateString("pt-BR")}
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
              <Label>Plano</Label>
              <Select
                value={ruleForm.plan_id}
                onValueChange={(v) =>
                  setRuleForm((f) => ({ ...f, plan_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano…" />
                </SelectTrigger>
                <SelectContent>
                  {plans
                    .filter((p) => p.active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {fmt(p.price)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Porcentagem de Bonificação (%)</Label>
              <Input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={ruleForm.percentage}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, percentage: e.target.value }))
                }
                placeholder="10"
              />
              {ruleForm.plan_id && (
                <p className="text-xs text-muted-foreground">
                  Valor calculado:{" "}
                  <span className="font-medium text-primary">
                    {fmt(
                      ((plans.find((p) => p.id === ruleForm.plan_id)?.price ??
                        0) *
                        parseFloat(ruleForm.percentage || "0")) /
                        100
                    )}
                  </span>{" "}
                  por assinatura
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={ruleForm.description}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Descreva a regra…"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={ruleForm.active}
                onCheckedChange={(v) =>
                  setRuleForm((f) => ({ ...f, active: v }))
                }
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

      {/* ── Payment Dialog ── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Lançamento</DialogTitle>
          </DialogHeader>
          {selectedProfessional && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {selectedProfessional.avatar_url ? (
                  <img
                    src={selectedProfessional.avatar_url}
                    alt={selectedProfessional.full_name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {selectedProfessional.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="font-semibold text-foreground">
                  {selectedProfessional.full_name}
                </span>
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={paymentForm.plan_id}
                  onValueChange={(v) =>
                    setPaymentForm((f) => ({ ...f, plan_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProfessional.plans.map((p) => {
                      const rule = rules.find(
                        (r) => r.plan_id === p.plan_id && r.active
                      );
                      const pct = rule ? rule.percentage : 10;
                      return (
                        <SelectItem key={p.plan_id} value={p.plan_id}>
                          {p.plan_name} — {pct}% = {fmt((p.plan_price * pct) / 100)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período de Referência</Label>
                <Input
                  value={paymentForm.reference_period}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      reference_period: e.target.value,
                    }))
                  }
                  placeholder="ex: Março 2026"
                />
              </div>

              <div className="space-y-2">
                <Label>Horas Trabalhadas (opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={paymentForm.hours_worked}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      hours_worked: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Notas adicionais…"
                  rows={2}
                />
              </div>

              {paymentForm.plan_id && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Valor do lançamento
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {fmt(
                      (() => {
                        const plan = selectedProfessional.plans.find(
                          (p) => p.plan_id === paymentForm.plan_id
                        );
                        if (!plan) return 0;
                        const rule = rules.find(
                          (r) => r.plan_id === paymentForm.plan_id && r.active
                        );
                        const pct = rule ? rule.percentage : 10;
                        return (plan.plan_price * pct) / 100;
                      })()
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={savePayment}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Rule Confirm ── */}
      <AlertDialog
        open={!!deleteRuleId}
        onOpenChange={(o) => !o && setDeleteRuleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os lançamentos existentes não serão
              afetados.
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
