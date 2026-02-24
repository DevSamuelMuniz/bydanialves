import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil } from "lucide-react";

export default function AdminServices() {
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "60" });

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", price: "", duration_minutes: "60" }); setDialogOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ name: s.name, description: s.description || "", price: String(s.price), duration_minutes: String(s.duration_minutes) }); setDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, description: form.description, price: Number(form.price), duration_minutes: Number(form.duration_minutes) };
    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "Serviço atualizado!" : "Serviço criado!" });
    setDialogOpen(false);
    fetchServices();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("services").update({ active }).eq("id", id);
    fetchServices();
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Gestão de Serviços</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo Serviço</Button>
      </div>

      <div className="space-y-3">
        {services.map((s) => (
          <Card key={s.id} className={`border-gold/10 ${!s.active ? "opacity-50" : ""}`}>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.duration_minutes} min — R$ {Number(s.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={s.active} onCheckedChange={(v) => toggleActive(s.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar" : "Novo"} Serviço</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} required /></div>
            </div>
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
