import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Navigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign, Calendar, Hash, ToggleLeft, Copy, Check } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  plan_id: string | null;
};

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percent" as "percent" | "fixed",
  discount_value: "",
  max_uses: "",
  active: true,
  expires_at: "",
  plan_id: "",
};

export default function AdminCoupons() {
  const { adminLevel } = useAdminPermissions();
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchData = async () => {
    setLoading(true);
    const [couponsRes, plansRes] = await Promise.all([
      supabase.from("coupons" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id, name").order("name"),
    ]);
    setCoupons((couponsRes.data as unknown as Coupon[]) || []);
    setPlans(plansRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (adminLevel !== "ceo") return <Navigate to="/admin" replace />;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      active: c.active,
      expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
      plan_id: c.plan_id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      active: form.active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      plan_id: form.plan_id || null,
    };

    if (editing) {
      const { error } = await supabase.from("coupons" as any).update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Cupom atualizado!" });
    } else {
      const { error } = await supabase.from("coupons" as any).insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Cupom criado!" });
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cupom excluído!" });
    fetchData();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from("coupons" as any).update({ active: !c.active }).eq("id", c.id);
    fetchData();
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Cupons de Desconto
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {coupons.length} cupom{coupons.length !== 1 ? "s" : ""} cadastrado{coupons.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />Novo Cupom
        </Button>
      </div>

      {/* Table */}
      {coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum cupom cadastrado.</p>
          <p className="text-sm mt-1">Crie o primeiro cupom clicando em "Novo Cupom".</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Desconto</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Usos</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Validade</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Plano</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {coupons.map((c) => {
                  const planName = plans.find((p) => p.id === c.plan_id)?.name;
                  const expired = c.expires_at && new Date(c.expires_at) < new Date();
                  const exhausted = c.max_uses != null && c.used_count >= c.max_uses;

                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                           <span className="font-mono font-bold text-primary tracking-widest text-sm">{c.code}</span>
                           <button
                             onClick={() => copyCode(c.id, c.code)}
                             className="text-muted-foreground hover:text-primary transition-colors"
                             title="Copiar código"
                           >
                             {copiedId === c.id
                               ? <Check className="h-3.5 w-3.5 text-primary" />
                               : <Copy className="h-3.5 w-3.5" />
                             }
                           </button>
                         </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {c.discount_type === "percent"
                            ? <Percent className="h-3.5 w-3.5 text-primary" />
                            : <DollarSign className="h-3.5 w-3.5 text-primary" />
                          }
                          <span className="font-semibold">
                            {c.discount_type === "percent"
                              ? `${c.discount_value}%`
                              : `R$ ${Number(c.discount_value).toFixed(2).replace(".", ",")}`
                            }
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          <span>{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</span>
                        </div>
                        {exhausted && <Badge variant="secondary" className="text-[10px] mt-1">Esgotado</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {c.expires_at ? (
                          <div className={`flex items-center gap-1 text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                            {expired && <Badge variant="destructive" className="text-[10px] ml-1">Expirado</Badge>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem validade</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {planName
                          ? <Badge variant="outline" className="text-xs">{planName}</Badge>
                          : <span className="text-xs text-muted-foreground">Todos</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className="flex items-center gap-1.5 text-xs cursor-pointer"
                        >
                          <ToggleLeft className={`h-4 w-4 ${c.active ? "text-primary" : "text-muted-foreground"}`} />
                          <Badge variant={c.active ? "default" : "secondary"} className="text-[10px]">
                            {c.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => openEdit(c)}>
                            <Edit2 className="h-3 w-3 mr-1" />Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive border border-border/40">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                                <AlertDialogDescription>O código <strong>{c.code}</strong> será removido permanentemente.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(c.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: BLACKFRIDAY20"
                className="font-mono uppercase tracking-wider"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de desconto *</Label>
                <Select value={form.discount_type} onValueChange={(v: "percent" | "fixed") => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  min={0}
                  max={form.discount_type === "percent" ? 100 : undefined}
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === "percent" ? "10" : "15.00"}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Máximo de usos</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Restringir a plano</Label>
              <Select value={form.plan_id || "all"} onValueChange={(v) => setForm({ ...form, plan_id: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todos os planos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 bg-muted/20">
              <div>
                <p className="text-sm font-medium">Cupom ativo</p>
                <p className="text-xs text-muted-foreground">Clientes poderão aplicar este cupom</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? "Salvar" : "Criar Cupom"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
