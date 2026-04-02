import { useState, useEffect } from "react";
import { translateError } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/PasswordInput";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
        setChecking(false);
      } else if (event === "SIGNED_IN" && session) {
        // Also accept SIGNED_IN if we have a session (some flows emit this instead)
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Fallback: check if there's already a session after a short delay
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "Verifique e tente novamente.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro", description: translateError(error.message), variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada!", description: "Você será redirecionado." });

      // Redirect based on role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setTimeout(() => navigate(roleData ? "/admin" : "/client"), 1500);
      } else {
        setTimeout(() => navigate("/auth"), 1500);
      }
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl">Link inválido ou expirado</CardTitle>
            <CardDescription>
              O link de recuperação de senha é inválido ou já foi utilizado. Solicite um novo link na tela de login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-gold/20">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl gradient-gold flex items-center justify-center shadow-gold mb-4">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-serif text-2xl">Nova Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repita a nova senha"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
