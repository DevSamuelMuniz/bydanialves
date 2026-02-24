import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      .single();
    if (!roleData) {
      await supabase.auth.signOut();
      toast({ title: "Acesso negado", description: "Esta área é restrita a administradores.", variant: "destructive" });
      setLoading(false);
      return;
    }
    navigate("/admin");
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-gold-subtle" />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <Card className="w-full max-w-md border-primary/15 shadow-elevated relative animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-14 w-14 rounded-2xl gradient-gold flex items-center justify-center shadow-gold mb-3">
              <ShieldCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="font-serif text-2xl tracking-tight">Recuperar Senha</CardTitle>
            <CardDescription>Informe seu e-mail para redefinir</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgot(false)}>
                Voltar ao login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-gold-subtle" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />

      <Card className="w-full max-w-md border-primary/15 shadow-elevated relative animate-scale-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl gradient-gold flex items-center justify-center shadow-gold mb-3">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-serif text-2xl tracking-tight">Painel Administrativo</CardTitle>
          <CardDescription className="text-base">Acesso restrito a administradores</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Entrando..." : "Entrar como Administrador"}
            </Button>
            <Button type="button" variant="link" className="w-full text-muted-foreground" onClick={() => setShowForgot(true)}>
              Esqueceu a senha?
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              ← Voltar ao login de cliente
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
