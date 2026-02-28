import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Users, UserPlus, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

// Medal colors per plan rank
const PLAN_ACCENTS = [
  { from: "from-[#e8dcc8]", to: "to-[#d4c4a8]", ring: "ring-[#d4c4a8]/40", badge: "bg-[#d4c4a8]/30 text-[#8a7560]" },
  { from: "from-[#e8dcc8]", to: "to-[#d4c4a8]", ring: "ring-[#d4c4a8]/40", badge: "bg-[#d4c4a8]/30 text-[#8a7560]" },
  { from: "from-[#e8dcc8]", to: "to-[#d4c4a8]", ring: "ring-[#d4c4a8]/40", badge: "bg-[#d4c4a8]/30 text-[#8a7560]" },
];


export default function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "", includes: "", restriction: "", price: "", active: true });

  // Link client state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, subsRes] = await Promise.all([
      supabase.from("plans").select("*").order("price"),
      supabase.from("subscriptions").select("*, plans(name), profiles!subscriptions_client_profile_fkey(full_name)").order("created_at", { ascending: false }),
    ]);
    setPlans(plansRes.data || []);
    setSubscriptions((subsRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", includes: "", restriction: "", price: "", active: true });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", includes: p.includes, restriction: p.restriction || "", price: String(p.price), active: p.active });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || null,
      includes: form.includes,
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

    // Sync with Stripe
    toast({ title: "Sincronizando com Stripe..." });
    const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-plan-stripe", {
      body: { planId, name: form.name, price: Number(form.price) },
    });

    if (syncError || syncData?.error) {
      toast({ title: "Aviso", description: `Plano salvo, mas erro ao sincronizar com Stripe: ${syncData?.error || syncError?.message}`, variant: "destructive" });
    } else {
      toast({ title: editing ? "Plano atualizado e sincronizado!" : "Plano criado e sincronizado!" });
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
    // Check if client already has active subscription
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

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-serif text-2xl">Planos & Assinaturas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openLinkDialog}><UserPlus className="mr-2 h-4 w-4" />Vincular Cliente</Button>
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Novo Plano</Button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p, idx) => {
          const accent = PLAN_ACCENTS[idx % PLAN_ACCENTS.length];
          const subCount = subsCountByPlan(p.id);
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl overflow-hidden border border-border/40 flex flex-col transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5 ${!p.active ? "opacity-60" : ""}`}
            >
              {/* Gradient header */}
              <div className={`relative bg-gradient-to-br ${accent.from} ${accent.to} px-6 pt-6 pb-8`}>
                {/* Decorative circle */}
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-card [clip-path:ellipse(55%_100%_at_50%_100%)]" />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-foreground/90 text-background shadow-md">
                    <Sparkles className="h-3 w-3" />
                    Plano
                  </div>
                  {!p.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                </div>

                <h3 className="font-serif text-2xl font-bold text-foreground leading-tight">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-foreground/70 mt-1">{p.description}</p>
                )}

                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-bold font-serif tracking-tight text-foreground">
                    R$ {Number(p.price).toFixed(2)}
                  </span>
                  <span className="text-sm text-foreground/60 mb-1">/mês</span>
                </div>
              </div>

              {/* Body */}
              <div className="bg-card flex flex-col flex-1 px-6 py-5 gap-4">
                {/* Includes */}
                <div className="space-y-2">
                  {p.includes.split("\n").filter(Boolean).map((line: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/80 leading-snug">{line}</span>
                    </div>
                  ))}
                  {!p.includes.includes("\n") && (
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/80 leading-snug">{p.includes}</span>
                    </div>
                  )}
                </div>

                {/* Restriction */}
                {p.restriction && (
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border/40 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground italic leading-snug">{p.restriction}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${accent.ring} bg-muted/40`}>
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

      {/* Active subscriptions */}
      <div>
        <h2 className="font-serif text-lg mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Assinaturas Ativas
        </h2>
        {subscriptions.filter((s) => s.status === "active").length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscriptions.filter((s) => s.status === "active").map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 hover:border-primary/20 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{(s as any).profiles?.full_name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate">{(s as any).plans?.name} · desde {new Date(s.started_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive border border-border/40">Cancelar</Button>
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
            <div className="space-y-2"><Label>O que inclui</Label><Textarea value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Restrição</Label><Input value={form.restriction} onChange={(e) => setForm({ ...form, restriction: e.target.value })} /></div>
            <div className="space-y-2"><Label>Preço mensal (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
            <Button type="submit" className="w-full">{editing ? "Salvar" : "Criar Plano"}</Button>
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
                    <SelectItem key={c.user_id} value={c.user_id}>{c.full_name || "Sem nome"}</SelectItem>
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
              Vincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
