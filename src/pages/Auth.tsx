import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/PasswordInput";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import authBg from "@/assets/auth-bg.jpg";
import logo from "@/assets/logo-dani-alves.jpg";
import { AuthImageOverlay } from "@/components/AuthImageOverlay";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("male");
  const [branchId, setBranchId] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    navigate(roleData ? "/admin" : "/client");
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "Verifique e tente novamente.", variant: "destructive" });
      return;
    }
    if (!acceptTerms) {
      toast({ title: "Aceite os termos", description: "Você precisa aceitar os termos de serviço.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
    } else {
      // Update profile with extra fields
      if (signUpData.user) {
        await supabase.from("profiles").update({ phone, gender } as any).eq("user_id", signUpData.user.id);
      }
      toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail para confirmar a conta." });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada." });
    }
    setLoading(false);
  };

  if (showForgot) {
    return (
      <div className="h-screen flex overflow-hidden">
        <AuthImageOverlay imageSrc={authBg} />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12 overflow-y-auto">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <img src={logo} alt="Dani Alves" className="mx-auto h-16 w-16 rounded-full object-cover border-2 border-primary/20 shadow-lg mb-4" />
              <h1 className="font-serif text-2xl font-bold tracking-tight">Recuperar Senha</h1>
              <p className="text-muted-foreground mt-1">Informe seu e-mail para redefinir</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" placeholder="Digite seu e-mail" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgot(false)}>
                Voltar ao login
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <AuthImageOverlay imageSrc={authBg} />

      <div className="w-full lg:w-1/2 flex justify-center bg-background px-6 py-12 overflow-y-auto h-screen">
        <div className="w-full max-w-md space-y-6 my-auto">
          <div className="text-center">
            <img src={logo} alt="Dani Alves" className="mx-auto h-16 w-16 rounded-full object-cover border-2 border-primary/20 shadow-lg mb-4" />
            <h1 className="font-serif text-2xl font-bold tracking-tight">Dani Alves Studio</h1>
            <p className="text-muted-foreground mt-1">Agende seus serviços com elegância</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg">
              <TabsTrigger value="login" className="rounded-md">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-md">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    placeholder="Digite seu e-mail"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <PasswordInput
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Digite sua senha"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <Button type="button" variant="link" className="w-full text-muted-foreground" onClick={() => setShowForgot(true)}>
                  Esqueceu a senha?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-11"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-city">Cidade</Label>
                    <Input
                      id="signup-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="h-11"
                      placeholder="Sua cidade"
                    />
                </div>
                </div>

                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <RadioGroup value={gender} onValueChange={setGender} className="flex gap-6 pt-1">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id="gender-male" />
                      <Label htmlFor="gender-male" className="font-normal cursor-pointer">Masculino</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id="gender-female" />
                      <Label htmlFor="gender-female" className="font-normal cursor-pointer">Feminino</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    placeholder="Digite seu e-mail"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <PasswordInput
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Crie uma senha (mín. 6 caracteres)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                  <PasswordInput
                    id="signup-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repita sua senha"
                  />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptTerms}
                    onCheckedChange={(v) => {
                      if (v) setShowTermsModal(true);
                      else setAcceptTerms(false);
                    }}
                    className="mt-0.5"
                  />
                  <Label htmlFor="accept-terms" className="font-normal text-sm leading-snug cursor-pointer text-muted-foreground">
                    Li e aceito os{" "}
                    <a href="/termosdeservico" target="_blank" className="text-primary underline underline-offset-2 hover:opacity-80">termos de serviço</a>{" "}
                    e a{" "}
                    <a href="/politicadeprivacidade" target="_blank" className="text-primary underline underline-offset-2 hover:opacity-80">política de privacidade</a>
                  </Label>
                </div>

                {/* Modal de confirmação de termos */}
                <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Confirmar aceitação</DialogTitle>
                      <DialogDescription>
                        Ao aceitar, você confirma que leu e concorda com os nossos{" "}
                        <a href="/termosdeservico" target="_blank" className="text-primary underline underline-offset-2 hover:opacity-80">Termos de Serviço</a>{" "}
                        e a{" "}
                        <a href="/politicadeprivacidade" target="_blank" className="text-primary underline underline-offset-2 hover:opacity-80">Política de Privacidade</a>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => { setAcceptTerms(true); setShowTermsModal(false); }}
                      >
                        Confirmar e aceitar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => { setAcceptTerms(false); setShowTermsModal(false); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Cadastrando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
