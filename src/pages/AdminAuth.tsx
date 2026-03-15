import { useState } from "react";
import { translateError } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import authBg from "@/assets/auth-bg.jpg";
import logoHorizontal from "@/assets/logo_horizontal.png";
import { AuthImageOverlay } from "@/components/AuthImageOverlay";

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
      toast({ title: "Erro ao entrar", description: translateError(error.message), variant: "destructive" });
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
      <div className="min-h-screen flex">
        <AuthImageOverlay imageSrc={authBg} />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl gradient-gold flex items-center justify-center shadow-gold mb-4">
                <ShieldCheck className="h-7 w-7 text-primary-foreground" />
              </div>
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
    <div className="min-h-screen flex">
      <AuthImageOverlay imageSrc={authBg} />
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <img src={logoHorizontal} alt="Dani Alves Beauty Express" className="mx-auto h-auto w-52 mb-4" />
            <h1 className="font-serif text-2xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-muted-foreground mt-1">Acesso restrito a administradores</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" placeholder="Digite seu e-mail" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <PasswordInput id="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Digite sua senha" />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Entrando..." : "Entrar como Administrador"}
            </Button>
            <Button type="button" variant="link" className="w-full text-muted-foreground" onClick={() => setShowForgot(true)}>
              Esqueceu a senha?
            </Button>
          </form>
          <div className="text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              ← Voltar ao login de cliente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
