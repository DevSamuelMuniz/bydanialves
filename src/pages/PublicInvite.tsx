import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { translateError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordInput } from "@/components/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, ArrowRight, ArrowLeft, User, Sparkles } from "lucide-react";
import logoBlack from "@/assets/logo-black.png";

type Step = "signup" | "plans";

export default function PublicInvite() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("signup");
  const [loading, setLoading] = useState(false);

  // Signup fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("female");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Plans
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Sign out any existing session so the invite page always shows signup
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        supabase.auth.signOut();
      }
    });
  }, []);

  const loadPlans = async () => {
    setPlansLoading(true);
    const { data } = await supabase.from("plans").select("*").eq("active", true).order("price");
    setPlans(data || []);
    setPlansLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, gender },
      },
    });

    if (error) {
      toast({ title: "Erro ao criar conta", description: translateError(error.message), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update profile with phone and gender
    if (data.user) {
      await supabase.from("profiles").update({
        full_name: fullName,
        phone,
        gender,
      }).eq("user_id", data.user.id);

      setUserId(data.user.id);
      toast({ title: "🎉 Conta criada com sucesso!", description: "Agora escolha seu plano." });
      setStep("plans");
      loadPlans();
    }

    setLoading(false);
  };

  const handleSelectPlan = async (planId: string) => {
    setSubscribing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        setStep("signup");
        setSubscribing(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Erro", description: "Não foi possível iniciar o pagamento.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao processar.", variant: "destructive" });
    }
    setSubscribing(false);
  };

  const handleSkip = () => {
    navigate("/client");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src={logoBlack} alt="By Dani Alves" className="h-16 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            {step === "signup" ? "Crie sua conta para começar" : "Escolha o plano ideal para você"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-12 rounded-full transition-colors ${step === "signup" ? "bg-primary" : "bg-primary/30"}`} />
          <div className={`h-2 w-12 rounded-full transition-colors ${step === "plans" ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === "signup" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5 text-primary" />
                Criar Conta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" required />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id="inv-female" />
                      <Label htmlFor="inv-female" className="font-normal cursor-pointer">Feminino</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id="inv-male" />
                      <Label htmlFor="inv-male" className="font-normal cursor-pointer">Masculino</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar senha *</Label>
                  <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" required />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? "Criando..." : (
                    <>Criar conta e escolher plano <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Já tem uma conta?{" "}
                  <a href="/auth" className="text-primary hover:underline">Entrar</a>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "plans" && (
          <div className="space-y-4">
            {plansLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando planos...</div>
            ) : plans.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum plano disponível no momento.
                  <Button variant="outline" className="mt-4" onClick={handleSkip}>
                    Ir para o painel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {plans.map((plan) => {
                  const escovasMatch = plan.includes?.match(/(\d+)\s*escova/i);
                  const escovas = escovasMatch ? escovasMatch[1] : null;

                  return (
                    <Card key={plan.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Crown className="h-4 w-4 text-primary shrink-0" />
                              <h3 className="font-semibold truncate">{plan.name}</h3>
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{plan.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              {escovas && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  {escovas} escovas/mês
                                </Badge>
                              )}
                              {plan.restriction && (
                                <Badge variant="outline" className="text-xs">{plan.restriction}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold text-primary">
                              R$ {Number(plan.price).toFixed(0)}
                            </p>
                            <p className="text-xs text-muted-foreground">/mês</p>
                            <Button
                              size="sm"
                              className="mt-2 gap-1"
                              onClick={() => handleSelectPlan(plan.id)}
                              disabled={subscribing}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Assinar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
                  Pular por enquanto → Ir para o painel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
