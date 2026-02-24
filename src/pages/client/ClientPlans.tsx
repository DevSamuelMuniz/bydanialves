import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ClientPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [plansRes, subRes] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("price"),
      supabase.from("subscriptions").select("*, plans(*)").eq("client_id", user.id).eq("status", "active").maybeSingle(),
    ]);
    setPlans(plansRes.data || []);
    setSubscription(subRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const { error } = await supabase.from("subscriptions").insert({
      client_id: user.id,
      plan_id: planId,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plano assinado com sucesso! 🎉" });
    fetchData();
  };

  const handleCancel = async () => {
    if (!subscription) return;
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", subscription.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Assinatura cancelada." });
    fetchData();
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" /> Meu Plano
        </h1>
        <p className="text-muted-foreground mt-1">Escolha o plano ideal para você</p>
      </div>

      {/* Current subscription */}
      {subscription && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" /> Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xl font-serif font-bold text-primary">{subscription.plans?.name}</p>
            <p className="text-sm">{subscription.plans?.includes}</p>
            <p className="text-sm text-muted-foreground">
              Desde {new Date(subscription.started_at).toLocaleDateString("pt-BR")}
              {subscription.expires_at && ` — expira em ${new Date(subscription.expires_at).toLocaleDateString("pt-BR")}`}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2">Cancelar assinatura</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                  <AlertDialogDescription>Você perderá acesso aos benefícios do plano.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Confirmar cancelamento</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Available plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrentPlan = subscription?.plan_id === p.id;
          return (
            <Card key={p.id} className={`border-border relative ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}>
              {isCurrentPlan && (
                <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">Atual</Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-lg">{p.name}</CardTitle>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-serif font-bold text-primary">
                  R$ {Number(p.price).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
                <p className="text-sm">{p.includes}</p>
                {p.restriction && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {p.restriction}
                  </p>
                )}
                <Button
                  className="w-full mt-2"
                  disabled={!!subscription}
                  onClick={() => handleSubscribe(p.id)}
                >
                  {isCurrentPlan ? "Plano atual" : subscription ? "Cancele o atual primeiro" : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
