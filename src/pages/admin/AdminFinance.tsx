import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function AdminFinance() {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "expense" as string, amount: "", description: "" });

  const fetchRecords = async () => {
    const { data } = await supabase.from("financial_records").select("*").order("created_at", { ascending: false }).limit(100);
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const totalIncome = records.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = records.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("financial_records").insert({
      type: form.type as "income" | "expense",
      amount: Number(form.amount),
      description: form.description,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Registro adicionado!" });
    setDialogOpen(false);
    setForm({ type: "expense", amount: "", description: "" });
    fetchRecords();
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Painel Financeiro</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Saída</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <ArrowUpCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Entradas</p>
              <p className="text-xl font-serif font-bold text-green-700">R$ {totalIncome.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <ArrowDownCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Saídas</p>
              <p className="text-xl font-serif font-bold text-red-700">R$ {totalExpense.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gold/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className={`text-xl font-serif font-bold ${totalIncome - totalExpense >= 0 ? "text-green-700" : "text-red-700"}`}>
              R$ {(totalIncome - totalExpense).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {records.map((r) => (
          <Card key={r.id} className="border-gold/10">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {r.type === "income" ? <ArrowUpCircle className="h-4 w-4 text-green-600" /> : <ArrowDownCircle className="h-4 w-4 text-red-600" />}
                <div>
                  <p className="text-sm font-medium">{r.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <p className={`font-medium ${r.type === "income" ? "text-green-700" : "text-red-700"}`}>
                {r.type === "income" ? "+" : "-"} R$ {Number(r.amount).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Nova Saída</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <Button type="submit" className="w-full">Registrar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
