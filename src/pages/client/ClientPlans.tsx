import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, AlertTriangle, Sparkles, ArrowRightLeft, CreditCard, Settings } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSearchParams } from "react-router-dom";

export default function ClientPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [stripeSubscription, setStripeSubscription] = useState<{ subscribed: boolean; plan_id: string | null; subscription_end: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const fetchPlans = async () => {
    const { data } = await supabase.from("plans").select("*").eq("active", true).order("price");
    setPlans(data || []);
  };

  const checkStripeSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setStripeSubscription(data);
      if (data?.subscribed && data?.plan_id) {
        // Refresh local subscription from DB (synced by edge function)
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*, plans(*)")
          .eq("client_id", user!.id)
          .eq("status", "active")
          .maybeSingle();
        setSubscription(subData);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    await fetchPlans();
    await checkStripeSubscription();
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Handle success/cancel from Stripe checkout
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Assinatura realizada com sucesso! 🎉", description: "Seu plano foi ativado." });
      checkStripeSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Checkout cancelado", description: "Você pode tentar novamente quando quiser.", variant: "destructive" });
    }
  }, [searchParams]);

  const handleCheckout = async (planId: string) => {
    if (!user || actionLoading) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
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
              {stripeSubscription?.subscription_end && (
                <>Válido até {new Date(stripeSubscription.subscription_end).toLocaleDateString("pt-BR")}</>
              )}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={actionLoading}>
                <Settings className="mr-1.5 h-4 w-4" /> Gerenciar assinatura
              </Button>
              <Button variant="ghost" size="sm" onClick={checkStripeSubscription} disabled={actionLoading}>
                Atualizar status
              </Button>
            </div>
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
                  ) : (
                    <Button
                      className={`w-full`}
                      variant={isMidPlan ? "default" : "outline"}
                      onClick={() => handleCheckout(p.id)}
                      disabled={actionLoading}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {actionLoading ? "Processando..." : subscription ? "Trocar plano" : "Assinar agora"}
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
