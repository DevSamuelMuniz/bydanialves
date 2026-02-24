import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, AlertTriangle, Sparkles, ArrowRightLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ClientPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
    if (!user || actionLoading) return;
    setActionLoading(true);

    // If there's an existing subscription, cancel it first
    if (subscription) {
      const { error: cancelError } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", subscription.id);
      if (cancelError) {
        toast({ title: "Erro ao trocar plano", description: cancelError.message, variant: "destructive" });
        setActionLoading(false);
        return;
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const { error } = await supabase.from("subscriptions").insert({
      client_id: user.id,
      plan_id: planId,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setActionLoading(false);
      return;
    }
    toast({ title: subscription ? "Plano trocado com sucesso! 🎉" : "Plano assinado com sucesso! 🎉" });
    setActionLoading(false);
    fetchData();
  };

  const handleCancel = async () => {
    if (!subscription || actionLoading) return;
    setActionLoading(true);
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", subscription.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setActionLoading(false);
      return;
    }
    toast({ title: "Assinatura cancelada." });
    setActionLoading(false);
    fetchData();
  };

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <Skeleton className="h-12 w-64 rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="animate-slide-up">
        <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2 tracking-tight">
          <Crown className="h-6 w-6 text-primary" /> Meu Plano
        </h1>
        <p className="text-muted-foreground mt-1.5">Escolha o plano ideal para você</p>
      </div>

      {/* Current subscription */}
      {subscription && (
        <Card className="border-primary/20 gradient-gold-subtle overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-gold flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xl font-serif font-bold gradient-gold-text">{subscription.plans?.name}</p>
            <p className="text-sm text-muted-foreground">{subscription.plans?.includes}</p>
            <p className="text-sm text-muted-foreground">
              Desde {new Date(subscription.started_at).toLocaleDateString("pt-BR")}
              {subscription.expires_at && ` — expira em ${new Date(subscription.expires_at).toLocaleDateString("pt-BR")}`}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2" disabled={actionLoading}>
                  Cancelar assinatura
                </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p, i) => {
          const isCurrentPlan = subscription?.plan_id === p.id;
          const isMidPlan = plans.length >= 3 && i === 1;
          const includesList = p.includes ? p.includes.split(/[,;•\n]+/).map((s: string) => s.trim()).filter(Boolean) : [];

          return (
            <Card
              key={p.id}
              className={`relative animate-slide-up overflow-hidden transition-all duration-300 flex flex-col
                ${isCurrentPlan
                  ? "ring-2 ring-primary shadow-gold border-primary/30"
                  : isMidPlan
                    ? "border-primary/25 shadow-elevated scale-[1.03] md:scale-105 z-10"
                    : "border-border/50 hover:border-primary/20 hover:shadow-elevated"
                }`}
              style={{ animationDelay: `${0.15 + i * 0.05}s` }}
            >
              {/* Top accent bar */}
              <div className={`h-1.5 w-full ${isCurrentPlan || isMidPlan ? "gradient-gold" : "bg-border/60"}`} />

              {isCurrentPlan && (
                <Badge className="absolute top-4 right-4 gradient-gold text-primary-foreground border-0 shadow-sm text-xs">
                  ✓ Atual
                </Badge>
              )}
              {!isCurrentPlan && isMidPlan && !subscription && (
                <Badge className="absolute top-4 right-4 bg-primary/10 text-primary border border-primary/20 text-xs">
                  ★ Popular
                </Badge>
              )}

              <CardHeader className="pb-1 pt-5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Crown className={`h-5 w-5 ${isCurrentPlan || isMidPlan ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <CardTitle className="font-serif text-xl tracking-tight">{p.name}</CardTitle>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
              </CardHeader>

              <CardContent className="space-y-5 flex-1 flex flex-col">
                {/* Price */}
                <div className="pt-1">
                  <p className="text-3xl font-serif font-bold tracking-tight">
                    <span className="gradient-gold-text">R$ {Number(p.price).toFixed(2)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">/mês</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-border/60" />

                {/* Features list */}
                <ul className="space-y-2.5 flex-1">
                  {includesList.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {p.restriction && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {p.restriction}
                  </p>
                )}

                {/* Action */}
                <div className="pt-2">
                  {isCurrentPlan ? (
                    <Button className="w-full" disabled>
                      <Check className="mr-2 h-4 w-4" /> Plano atual
                    </Button>
                  ) : subscription ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full" disabled={actionLoading}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" /> Trocar para este
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Trocar de plano?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Seu plano atual ({subscription.plans?.name}) será cancelado e você passará para o plano {p.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSubscribe(p.id)}>Confirmar troca</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button className={`w-full ${isMidPlan ? "" : "variant-outline"}`} variant={isMidPlan ? "default" : "outline"} onClick={() => handleSubscribe(p.id)} disabled={actionLoading}>
                      {actionLoading ? "Processando..." : "Assinar agora"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!subscription && plans.length === 0 && (
        <Card className="border-dashed border-primary/15">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            Nenhum plano disponível no momento.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
