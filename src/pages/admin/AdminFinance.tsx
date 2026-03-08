import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Filter, CalendarDays, Edit2, Trash2,
  TrendingUp, TrendingDown, Wallet, Scissors, ShoppingBag, Users, Building2,
  CreditCard, Banknote, QrCode, BarChart3, Target, DollarSign, FileText, Upload, Download
} from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── Constants ────────────────────────────────────────────
const CATEGORIES = [
  { value: "services",    label: "Serviços (mão de obra)",   icon: Scissors },
  { value: "products",    label: "Produtos / Varejo",         icon: ShoppingBag },
  { value: "commission",  label: "Comissões",                 icon: Users },
  { value: "fixed_cost",  label: "Custos Fixos",              icon: Building2 },
  { value: "cmv",         label: "CMV (Custo Mercadoria)",    icon: BarChart3 },
  { value: "other",       label: "Outros",                    icon: DollarSign },
];

const PAYMENT_METHODS = [
  { value: "cash",        label: "Dinheiro",        icon: Banknote },
  { value: "pix",         label: "PIX",             icon: QrCode },
  { value: "credit_card", label: "Cartão Crédito",  icon: CreditCard },
  { value: "debit_card",  label: "Cartão Débito",   icon: CreditCard },
  { value: "other",       label: "Outro",           icon: Wallet },
];

const PAYMENT_COLORS: Record<string, string> = {
  cash:        "hsl(142,60%,50%)",
  pix:         "hsl(199,80%,55%)",
  credit_card: "hsl(40,65%,48%)",
  debit_card:  "hsl(280,60%,55%)",
  other:       "hsl(220,13%,55%)",
};

const CATEGORY_COLORS: Record<string, string> = {
  services:   "hsl(40,65%,48%)",
  products:   "hsl(199,80%,55%)",
  commission: "hsl(280,60%,55%)",
  fixed_cost: "hsl(0,70%,55%)",
  cmv:        "hsl(25,80%,55%)",
  other:      "hsl(220,13%,55%)",
};

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (a: number, b: number) =>
  b === 0 ? 0 : Math.round((a / b) * 100);

// ─── Component ────────────────────────────────────────────
export default function AdminFinance() {
  const { toast } = useToast();
  const perms = useAdminPermissions();

  const isManager = perms.adminLevel === "manager" || perms.adminLevel === "ceo";

  const [records, setRecords]           = useState<any[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [branches, setBranches]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [receiptFile, setReceiptFile]   = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [form, setForm] = useState({
    type: "expense" as string,
    amount: "",
    description: "",
    category: "other",
    payment_method: "other",
    branch: "Principal",
    receipt_url: "" as string,
  });

  // Filters
  const [dateFrom, setDateFrom]         = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo]             = useState<Date | undefined>(undefined);
  const [typeFilter, setTypeFilter]     = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [tab, setTab]                   = useState("overview");

  // ─── Fetch branches (for manager/ceo filter) ────────────
  useEffect(() => {
    if (!isManager) return;
    supabase.from("branches").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setBranches(data || []));
  }, [isManager]);

  // ─── Fetch ──────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);

    // Fetch manual financial records
    let query = supabase
      .from("financial_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (dateFrom) query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo)   query = query.lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");
    if (typeFilter !== "all") query = query.eq("type", typeFilter as any);
    // Filter by branch name for manager/ceo
    if (isManager && branchFilter !== "all") {
      const selectedBranch = branches.find((b) => b.id === branchFilter);
      if (selectedBranch) query = query.eq("branch", selectedBranch.name);
    }
    const { data } = await query;
    setRecords(data || []);

    // Fetch completed appointments with service prices and client profiles
    let apptQuery = supabase
      .from("appointments")
      .select("id, appointment_date, appointment_time, created_at, notes, client_id, branch_id, profiles(full_name), services(name, price, is_system)")
      .eq("status", "completed")
      .order("appointment_date", { ascending: false })
      .limit(500);
    if (dateFrom) apptQuery = apptQuery.gte("appointment_date", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo)   apptQuery = apptQuery.lte("appointment_date", format(dateTo, "yyyy-MM-dd"));
    if (isManager && branchFilter !== "all") apptQuery = apptQuery.eq("branch_id", branchFilter);
    const { data: apptData } = await apptQuery;
    setCompletedAppointments(apptData || []);

    setLoading(false);
  }, [dateFrom, dateTo, typeFilter, branchFilter, isManager, branches]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ─── Derived KPIs ───────────────────────────────────────
  const income  = records.filter((r) => r.type === "income");
  const expense = records.filter((r) => r.type === "expense");

  // Receita de agendamentos concluídos (usada para ticket médio e gráfico separado)
  const appointmentServiceRevenue = useMemo(() =>
    completedAppointments.reduce((s, a) => s + Number((a.services as any)?.price || 0), 0),
  [completedAppointments]);

  // Faturamento bruto = soma de todos os registros de entrada (já inclui atendimentos concluídos via trigger)
  const totalIncome  = income.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = expense.reduce((s, r) => s + Number(r.amount), 0);

  // Receita por categoria (direto dos registros financeiros)
  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of income) {
      const cat = r.category || "other";
      map[cat] = (map[cat] || 0) + Number(r.amount);
    }
    return Object.entries(map).map(([cat, val]) => ({
      name: CATEGORIES.find((c) => c.value === cat)?.label ?? cat,
      value: val,
      fill: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other,
    }));
  }, [income, appointmentServiceRevenue]);

  // Despesa por categoria
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of expense) {
      const cat = r.category || "other";
      map[cat] = (map[cat] || 0) + Number(r.amount);
    }
    return Object.entries(map).map(([cat, val]) => ({
      name: CATEGORIES.find((c) => c.value === cat)?.label ?? cat,
      value: val,
      fill: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other,
    }));
  }, [expense]);

  // Métodos de pagamento (apenas entradas manuais)
  const byPayment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of income) {
      const pm = r.payment_method || "other";
      map[pm] = (map[pm] || 0) + Number(r.amount);
    }
    return Object.entries(map).map(([pm, val]) => ({
      name: PAYMENT_METHODS.find((p) => p.value === pm)?.label ?? pm,
      value: val,
      fill: PAYMENT_COLORS[pm] ?? PAYMENT_COLORS.other,
    }));
  }, [income]);

  // KPIs financeiros
  const serviceRevenue    = income.filter((r) => r.category === "services").reduce((s, r) => s + Number(r.amount), 0);
  const productRevenue    = income.filter((r) => r.category === "products").reduce((s, r) => s + Number(r.amount), 0);
  const totalCommissions  = expense.filter((r) => r.category === "commission").reduce((s, r) => s + Number(r.amount), 0);
  const totalCMV          = expense.filter((r) => r.category === "cmv").reduce((s, r) => s + Number(r.amount), 0);
  const totalFixedCosts   = expense.filter((r) => r.category === "fixed_cost").reduce((s, r) => s + Number(r.amount), 0);
  const totalVariableCosts = totalCommissions + totalCMV;
  const contributionMargin = totalIncome - totalVariableCosts;
  const netProfit          = totalIncome - totalExpense;
  const grossMarginPct     = pct(netProfit, totalIncome);
  const avgTicket          = completedAppointments.length > 0
    ? appointmentServiceRevenue / completedAppointments.length
    : 0;

  // Faturamento por filial
  const byBranch = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const r of records) {
      const b = r.branch || "Principal";
      if (!map[b]) map[b] = { income: 0, expense: 0 };
      if (r.type === "income")  map[b].income  += Number(r.amount);
      if (r.type === "expense") map[b].expense += Number(r.amount);
    }
    return Object.entries(map).map(([name, v]) => ({
      name,
      Receita: v.income,
      Despesas: v.expense,
      "Lucro Líquido": v.income - v.expense,
    }));
  }, [records]);

  // Evolução mensal (últimos 6 meses)
  const monthlyEvolution = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        key:   format(d, "yyyy-MM"),
        label: format(d, "MMM", { locale: ptBR }),
        income:  0,
        expense: 0,
      };
    });
    // Registros manuais
    for (const r of records) {
      const key = r.created_at?.slice(0, 7);
      const m = months.find((m) => m.key === key);
      if (!m) continue;
      if (r.type === "income")  m.income  += Number(r.amount);
      if (r.type === "expense") m.expense += Number(r.amount);
    }
    // Agendamentos concluídos (receita automática)
    for (const a of completedAppointments) {
      const key = a.appointment_date?.slice(0, 7);
      const m = months.find((m) => m.key === key);
      if (!m) continue;
      m.income += Number((a.services as any)?.price || 0);
    }
    return months.map((m) => ({
      name: m.label,
      Receita: m.income,
      Despesas: m.expense,
      Lucro: m.income - m.expense,
    }));
  }, [records, completedAppointments]);

  // ─── CRUD ───────────────────────────────────────────────
  const openAdd = () => {
    setEditingRecord(null);
    setReceiptFile(null);
    setForm({ type: "expense", amount: "", description: "", category: "other", payment_method: "other", branch: "Principal", receipt_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingRecord(r);
    setReceiptFile(null);
    setForm({
      type: r.type,
      amount: String(r.amount),
      description: r.description,
      category: r.category || "other",
      payment_method: r.payment_method || "other",
      branch: r.branch || "Principal",
      receipt_url: r.receipt_url || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingReceipt(true);

    let receipt_url = form.receipt_url;

    // Upload do comprovante se houver arquivo selecionado
    if (receiptFile && form.type === "expense") {
      const ext = receiptFile.name.split(".").pop();
      const path = `receipts/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, receiptFile, { upsert: true });
      if (uploadError) {
        toast({ title: "Erro ao enviar comprovante", description: uploadError.message, variant: "destructive" });
        setUploadingReceipt(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
      receipt_url = urlData.publicUrl;
    }

    setUploadingReceipt(false);

    const payload: any = {
      type: form.type as "income" | "expense",
      amount: Number(form.amount),
      description: form.description,
      category: form.category,
      payment_method: form.payment_method,
      branch: form.branch,
    };
    if (receipt_url) payload.receipt_url = receipt_url;

    if (editingRecord) {
      const { error } = await supabase.from("financial_records").update(payload).eq("id", editingRecord.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Registro atualizado!" });
    } else {
      const { error } = await supabase.from("financial_records").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Registro adicionado!" });
    }
    setDialogOpen(false);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("financial_records").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Registro excluído!" }); fetchRecords(); }
  };

  // ─── Guards ─────────────────────────────────────────────
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!perms.canViewFinance) return <AccessDenied />;

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão gerencial completa · {perms.adminLevel === "ceo" ? "CEO" : "Gerente"}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className={`grid grid-cols-1 gap-3 ${isManager ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
            {/* Branch filter — Gerente/CEO only */}
            {isManager && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-sm font-normal">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} />
              </PopoverContent>
            </Popover>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(branchFilter !== "all" || dateFrom || dateTo || typeFilter !== "all") && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs"
              onClick={() => { setBranchFilter("all"); setDateFrom(undefined); setDateTo(undefined); setTypeFilter("all"); }}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>


      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Faturamento Bruto" value={fmt(totalIncome)} icon={<ArrowUpCircle className="h-5 w-5 text-green-600" />} sub="Todas as entradas" accent="green" />
        <KpiCard label="Despesas Totais"   value={fmt(totalExpense)} icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} sub="Todas as saídas" accent="red" />
        <KpiCard label="Lucro Líquido"     value={fmt(netProfit)} icon={<TrendingUp className={`h-5 w-5 ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`} />} sub={`Margem ${grossMarginPct}%`} accent={netProfit >= 0 ? "green" : "red"} />
        <KpiCard label="Margem Contribuição" value={fmt(contributionMargin)} icon={<Target className="h-5 w-5 text-primary" />} sub="Receita − variáveis" accent="primary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Serviços"     value={fmt(serviceRevenue)}   icon={<Scissors className="h-5 w-5 text-amber-600" />}    sub="Mão de obra" accent="amber" />
        <KpiCard label="Produtos"     value={fmt(productRevenue)}   icon={<ShoppingBag className="h-5 w-5 text-sky-600" />}   sub="Venda varejo" accent="sky" />
        <KpiCard label="Comissões"    value={fmt(totalCommissions)} icon={<Users className="h-5 w-5 text-purple-600" />}      sub="Repasse profissionais" accent="purple" />
        <KpiCard label="CMV + Fixos"  value={fmt(totalCMV + totalFixedCosts)} icon={<TrendingDown className="h-5 w-5 text-orange-600" />} sub="Custos operacionais" accent="orange" />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="payments">Métodos Pgto</TabsTrigger>
          <TabsTrigger value="branches">Por Filial</TabsTrigger>
          <TabsTrigger value="records">Registros</TabsTrigger>
          <TabsTrigger value="appointments">Atendimentos</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142,60%,50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142,60%,50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0,70%,55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0,70%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="Receita"  stroke="hsl(142,60%,50%)" fill="url(#gIncome)"  />
                  <Area type="monotone" dataKey="Despesas" stroke="hsl(0,70%,55%)"   fill="url(#gExpense)" />
                  <Area type="monotone" dataKey="Lucro"    stroke="hsl(40,65%,48%)" fill="none" strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resumo rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryRow label="Custos Fixos"           value={fmt(totalFixedCosts)} />
            <SummaryRow label="CMV"                    value={fmt(totalCMV)} />
            <SummaryRow label="Ticket Médio Serviços"  value={avgTicket > 0 ? fmt(avgTicket) : "—"} />
            <SummaryRow label="Atendimentos Concluídos" value={`${completedAppointments.length} serviços`} />
          </div>
        </TabsContent>

        {/* ── Categories ── */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={incomeByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {incomeByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}>
                      {expenseByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Comparativo Serviços vs Produtos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Serviços vs Produtos · Oportunidade de Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ProgressBar label="Serviços (mão de obra)" value={serviceRevenue} total={totalIncome} color="hsl(40,65%,48%)" />
                <ProgressBar label="Produtos / Varejo"      value={productRevenue} total={totalIncome} color="hsl(199,80%,55%)" />
                {productRevenue === 0 && serviceRevenue > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 mt-2">
                    💡 Dica: Nenhuma receita de produtos registrada. Vender produtos na prateleira pode aumentar o ticket médio.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Métodos de Pagamento · Previsão de Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byPayment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]}>
                    {byPayment.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {byPayment.map((pm) => (
                  <div key={pm.name} className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">{pm.name}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: pm.fill }}>{fmt(pm.value)}</p>
                    <p className="text-xs text-muted-foreground">{pct(pm.value, totalIncome)}% do total</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">💡 Dinheiro e PIX caem imediatamente · Cartão de crédito pode cair em até 30 dias</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Branches ── */}
        <TabsContent value="branches" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento por Filial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byBranch}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Receita"       fill="hsl(142,60%,50%)" radius={[4,4,0,0]} />
                  <Bar dataKey="Despesas"      fill="hsl(0,70%,55%)"   radius={[4,4,0,0]} />
                  <Bar dataKey="Lucro Líquido" fill="hsl(40,65%,48%)"  radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {byBranch.map((b) => (
                  <div key={b.name} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{b.name}</span>
                      <span className={`text-sm font-bold ${b["Lucro Líquido"] >= 0 ? "text-green-600" : "text-red-500"}`}>
                        Lucro: {fmt(b["Lucro Líquido"])}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>Receita<br /><span className="font-medium text-foreground">{fmt(b.Receita)}</span></div>
                      <div>Despesas<br /><span className="font-medium text-foreground">{fmt(b.Despesas)}</span></div>
                      <div>Margem<br /><span className="font-medium text-foreground">{pct(b["Lucro Líquido"], b.Receita)}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Records ── */}
        <TabsContent value="records" className="mt-4 space-y-2">
          {records.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum registro encontrado.</p>
          )}
          {records.map((r) => {
            const catLabel = CATEGORIES.find((c) => c.value === r.category)?.label;
            const pmLabel  = PAYMENT_METHODS.find((p) => p.value === r.payment_method)?.label;
            return (
              <Card key={r.id} className="border-border">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {r.type === "income"
                      ? <ArrowUpCircle className="h-4 w-4 text-green-600 shrink-0" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{r.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        {catLabel && <> · {catLabel}</>}
                        {pmLabel && <> · {pmLabel}</>}
                        {r.branch && <> · {r.branch}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${r.type === "income" ? "text-green-700" : "text-red-500"}`}>
                      {r.type === "income" ? "+" : "−"} {fmt(Number(r.amount))}
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-3 w-3" /></Button>
                    {perms.canDeleteFinancialRecords && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Appointments ── */}
        <TabsContent value="appointments" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Atendimentos Concluídos · Receita Contabilizada
                <span className="ml-auto font-bold text-foreground">{fmt(appointmentServiceRevenue)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum atendimento concluído no período.
                </p>
              ) : (
                <div className="space-y-2">
                  {completedAppointments.map((a) => {
                    const svc = a.services as any;
                    const profile = a.profiles as any;
                    return (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ArrowUpCircle className="h-4 w-4 text-green-600 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{svc?.name ?? "Serviço"}</p>
                            <p className="text-xs text-muted-foreground">
                              {profile?.full_name ?? "—"} · {new Date(a.appointment_date).toLocaleDateString("pt-BR")} às {a.appointment_time?.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-700">
                          + {fmt(Number(svc?.price || 0))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingRecord ? "Editar Registro" : "Novo Registro"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Filial</Label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="Principal" />
            </div>

            {/* Comprovante — apenas para saídas */}
            {form.type === "expense" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Nota Fiscal / Comprovante
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById("receipt-input")?.click()}>
                  {receiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium truncate max-w-[180px]">{receiptFile.name}</span>
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setReceiptFile(null); }}
                        className="text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                  ) : form.receipt_url ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline" onClick={(ev) => ev.stopPropagation()}>
                        Ver comprovante atual
                      </a>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      <Upload className="h-5 w-5 mx-auto mb-1" />
                      Clique para anexar NF ou comprovante (PDF, imagem)
                    </div>
                  )}
                  <input id="receipt-input" type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={uploadingReceipt}>
              {uploadingReceipt ? "Enviando..." : editingRecord ? "Salvar" : "Registrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────
function KpiCard({ label, value, icon, sub, accent }: {
  label: string; value: string; icon: React.ReactNode; sub: string; accent: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          {icon}
        </div>
        <p className="text-lg font-serif font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border">
      <CardContent className="py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const p = total === 0 ? 0 : Math.round((value / total) * 100);
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{fmt(value)} <span className="text-muted-foreground text-xs">({p}%)</span></span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
