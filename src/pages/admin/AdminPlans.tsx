import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Users, UserPlus, CheckCircle2, AlertCircle, Zap, Crown, Star, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PLAN_TIERS = [
  {
    Icon: Star,
    topBar: "from-muted-foreground/40 to-muted-foreground/20",
    badge: "Essencial",
    badgeClass: "bg-muted/60 text-muted-foreground border border-border",
    border: "border-border/60",
    glow: "",
    iconColor: "text-muted-foreground",
  },
  {
    Icon: Zap,
    topBar: "from-primary to-primary/60",
    badge: "Popular",
    badgeClass: "bg-primary/20 text-primary border border-primary/40",
    border: "border-primary/50",
    glow: "shadow-[0_6px_32px_hsl(40,65%,52%,0.20)]",
    iconColor: "text-primary",
  },
  {
    Icon: Crown,
    topBar: "from-purple-500 to-purple-400/60",
    badge: "Premium",
    badgeClass: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
    border: "border-purple-500/40",
    glow: "shadow-[0_6px_32px_hsl(280,50%,65%,0.18)]",
    iconColor: "text-purple-400",
  },
];

export default function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", description: "", restriction: "", price: "", active: true });

  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [professionals, setProfessionals] = useState<{ user_id: string; full_name: string }[]>([]);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, subsRes, servicesRes, profsRes] = await Promise.all([
      supabase.from("plans").select("*").order("price"),
      supabase.from("subscriptions").select("*, plans(name), profiles!subscriptions_client_profile_fkey(full_name)").order("created_at", { ascending: false }),
      supabase.from("services").select("id, name, price").eq("active", true).order("name"),
      supabase.from("user_roles").select("user_id, profiles!user_roles_user_id_fkey(full_name)").eq("role", "admin").eq("admin_level", "professional"),
    ]);
    setPlans(plansRes.data || []);
    setSubscriptions((subsRes.data as any[]) || []);
    setServices(servicesRes.data || []);
    setProfessionals(
      (profsRes.data || []).map((r: any) => ({ user_id: r.user_id, full_name: r.profiles?.full_name || r.user_id }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", restriction: "", price: "", active: true });
    setSelectedServices([]);
    setSelectedProfessionals([]);
    setDialogOpen(true);
  };

  const openEdit = async (p: any) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", restriction: p.restriction || "", price: String(p.price), active: p.active });
    // Pre-select services whose names appear in includes
    const existingLines = (p.includes || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
    const matched = services.filter((s) => existingLines.includes(s.name)).map((s) => s.id);
    setSelectedServices(matched);
    // Pre-select professionals already linked to this plan
    const { data: linked } = await (supabase as any).from("plan_professionals").select("professional_id").eq("plan_id", p.id);
    setSelectedProfessionals((linked || []).map((r: any) => r.professional_id));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const includesText = selectedServices
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join("\n");
    const payload = {
      name: form.name,
      description: form.description || null,
      includes: includesText,
      restriction: form.restriction || null,
      price: Number(form.price),
      active: form.active,
    };

    let planId: string;

    if (editing) {
      const { error } = await supabase.from("plans").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      planId = editing.id;
    } else {
      const { data, error } = await supabase.from("plans").insert(payload).select("id").single();
      if (error || !data) { toast({ title: "Erro", description: error?.message || "Erro ao criar plano", variant: "destructive" }); return; }
      planId = data.id;
    }

    // Sync professionals: delete existing then re-insert
    await (supabase as any).from("plan_professionals").delete().eq("plan_id", planId);
    if (selectedProfessionals.length > 0) {
      await (supabase as any).from("plan_professionals").insert(
        selectedProfessionals.map((pid) => ({ plan_id: planId, professional_id: pid }))
      );
    }

    toast({ title: "Sincronizando com Stripe..." });
    const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-plan-stripe", {
      body: { planId, name: form.name, price: Number(form.price) },
    });

    if (syncError || syncData?.error) {
      toast({ title: "Aviso", description: `Plano salvo, mas erro ao sincronizar: ${syncData?.error || syncError?.message}`, variant: "destructive" });
    } else {
      toast({ title: editing ? "Plano atualizado!" : "Plano criado!" });
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plano excluído!" });
    fetchData();
  };

  const cancelSubscription = async (id: string) => {
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Assinatura cancelada!" });
    fetchData();
  };

  const subsCountByPlan = (planId: string) =>
    subscriptions.filter((s) => s.plan_id === planId && s.status === "active").length;

  const openLinkDialog = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
    setClients(data || []);
    setSelectedClientId("");
    setSelectedPlanId("");
    setLinkDialogOpen(true);
  };

  const handleLinkClient = async () => {
    if (!selectedClientId || !selectedPlanId) return;
    const { data: existing } = await supabase.from("subscriptions").select("id").eq("client_id", selectedClientId).eq("status", "active").maybeSingle();
    if (existing) {
      toast({ title: "Erro", description: "Este cliente já possui uma assinatura ativa.", variant: "destructive" });
      return;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const { error } = await supabase.from("subscriptions").insert({
      client_id: selectedClientId,
      plan_id: selectedPlanId,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plano vinculado ao cliente!" });
    setLinkDialogOpen(false);
    fetchData();
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl">Planos & Assinaturas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{plans.length} plano{plans.length !== 1 ? "s" : ""} cadastrado{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openLinkDialog}>
            <UserPlus className="mr-2 h-4 w-4" />Vincular Cliente
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />Novo Plano
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum plano cadastrado ainda.</p>
          <p className="text-sm mt-1">Crie o primeiro plano clicando em "Novo Plano".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((p, idx) => {
            const tier = PLAN_TIERS[idx % PLAN_TIERS.length];
            const { Icon } = tier;
            const subCount = subsCountByPlan(p.id);
            const includeLines = p.includes.split("\n").filter(Boolean);

            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 ${tier.border} ${tier.glow} ${!p.active ? "opacity-50" : ""}`}
              >
                {/* Animated grid bg */}
                <div className="absolute inset-0 overflow-hidden opacity-[0.05] dark:opacity-[0.04] pointer-events-none">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                      animation: "gridMove 4s linear infinite",
                    }}
                  />
                </div>

                {/* Top accent bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${tier.topBar}`} />

                {/* Card body */}
                <div className="flex flex-col flex-1 p-6 gap-5">

                  {/* Tier badge + inactive */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${tier.badgeClass}`}>
                      <Icon className={`h-3 w-3 ${tier.iconColor}`} />
                      {tier.badge}
                    </span>
                    {!p.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                  </div>

                  {/* Name + description */}
                  <div>
                    <h3 className="font-serif text-xl font-bold leading-tight">{p.name}</h3>
                    {p.description && (
                      <p className="text-sm text-muted-foreground mt-1 leading-snug">{p.description}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold font-serif tracking-tight">
                      R$ {Number(p.price).toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm text-muted-foreground mb-0.5">/mês</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/40" />

                  {/* Includes */}
                  <div className="space-y-2 flex-1">
                    {includeLines.map((line: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${tier.iconColor}`} />
                        <span className="text-sm text-foreground/80 leading-snug">{line}</span>
                      </div>
                    ))}
                  </div>

                  {/* Restriction */}
                  {p.restriction && (
                    <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border/40 px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground italic leading-snug">{p.restriction}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{subCount} assinante{subCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => openEdit(p)}>
                        <Edit2 className="mr-1 h-3 w-3" />Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive border border-border/40">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active subscriptions */}
      <div>
        <h2 className="font-serif text-lg mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Assinaturas Ativas
          <span className="ml-1 text-sm text-muted-foreground font-normal">
            ({subscriptions.filter((s) => s.status === "active").length})
          </span>
        </h2>
        {subscriptions.filter((s) => s.status === "active").length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma assinatura ativa.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.filter((s) => s.status === "active").map((s) => (
              <div key={s.id} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200">
                <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="px-4 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary uppercase">
                      {((s as any).profiles?.full_name || "C").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{(s as any).profiles?.full_name || "Cliente"}</p>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">{(s as any).plans?.name}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">desde {new Date(s.started_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive border border-border/40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                        <AlertDialogDescription>O cliente perderá acesso ao plano.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelSubscription(s.id)}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            {/* Service selection */}
            <div className="space-y-2">
              <Label>Serviços incluídos <span className="text-muted-foreground text-xs">({selectedServices.length} selecionado{selectedServices.length !== 1 ? "s" : ""})</span></Label>
              <ScrollArea className="h-44 rounded-lg border border-border/60 bg-muted/20 p-3">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {services.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
                        <Checkbox
                          id={`svc-${s.id}`}
                          checked={selectedServices.includes(s.id)}
                          onCheckedChange={(checked) =>
                            setSelectedServices((prev) =>
                              checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                            )
                          }
                        />
                        <label htmlFor={`svc-${s.id}`} className="flex-1 cursor-pointer text-sm leading-snug">
                          {s.name}
                          <span className="ml-2 text-xs text-muted-foreground">R$ {Number(s.price).toFixed(2).replace(".", ",")}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Professionals selection - dropdown */}
            <div className="space-y-2">
              <Label>Profissionais que executam <span className="text-muted-foreground text-xs">({selectedProfessionals.length} selecionado{selectedProfessionals.length !== 1 ? "s" : ""})</span></Label>
              {professionals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum profissional cadastrado.</p>
              ) : (
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <span className="truncate text-left">
                          {selectedProfessionals.length === 0
                            ? "Selecionar profissionais..."
                            : professionals.filter((p) => selectedProfessionals.includes(p.user_id)).map((p) => p.full_name).join(", ")}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-2" align="start">
                      <div className="space-y-1">
                        {professionals.map((p) => (
                          <div
                            key={p.user_id}
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedProfessionals((prev) =>
                                prev.includes(p.user_id) ? prev.filter((id) => id !== p.user_id) : [...prev, p.user_id]
                              )
                            }
                          >
                            <Checkbox
                              checked={selectedProfessionals.includes(p.user_id)}
                              onCheckedChange={(checked) =>
                                setSelectedProfessionals((prev) =>
                                  checked ? [...prev, p.user_id] : prev.filter((id) => id !== p.user_id)
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm">{p.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="space-y-2"><Label>Restrição</Label><Input value={form.restriction} onChange={(e) => setForm({ ...form, restriction: e.target.value })} /></div>
            <div className="space-y-2"><Label>Preço mensal (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
            <Button type="submit" className="w-full" disabled={selectedServices.length === 0}>{editing ? "Salvar alterações" : "Criar Plano"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Client Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Vincular Cliente a Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleLinkClient} disabled={!selectedClientId || !selectedPlanId}>
              <UserPlus className="mr-2 h-4 w-4" />Vincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
