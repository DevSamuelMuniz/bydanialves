import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { translateError } from "@/lib/utils";
import { ShieldOff, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";

export default function AdminCreateAccount() {
  const { toast } = useToast();
  const perms = useAdminPermissions();
  const canCreate = perms.adminLevel === "ceo" || perms.adminLevel === "attendant";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("female");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setGender("female");
    setPassword("");
    setConfirmPassword("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "Verifique e tente novamente.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: "WhatsApp obrigatório", description: "Informe o número de WhatsApp.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, full_name: fullName, phone, gender },
      });

      if (error || data?.error) {
        toast({
          title: "Erro ao criar conta",
          description: translateError(data?.error || error?.message || "Erro desconhecido"),
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({ title: "✅ Conta criada com sucesso!", description: `${fullName} já pode fazer login.` });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: translateError(err.message), variant: "destructive" });
    }
    setLoading(false);
  };

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="font-serif text-2xl">Criar Conta</h1>
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-semibold">Conta criada com sucesso!</h2>
            <p className="text-muted-foreground">
              <strong>{fullName}</strong> já pode acessar o sistema com o e-mail <strong>{email}</strong>.
            </p>
            <Button onClick={resetForm} className="mt-4">
              <UserPlus className="mr-2 h-4 w-4" />
              Criar outra conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-serif text-2xl">Criar Conta</h1>
      <p className="text-sm text-muted-foreground">
        Cadastre um novo cliente diretamente, sem necessidade de sair do sistema.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Cadastro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo <span className="text-destructive">*</span></Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp <span className="text-destructive">*</span></Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Gênero</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="g-female" />
                  <Label htmlFor="g-female" className="cursor-pointer">Feminino</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="g-male" />
                  <Label htmlFor="g-male" className="cursor-pointer">Masculino</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="other" id="g-other" />
                  <Label htmlFor="g-other" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Senha <span className="text-destructive">*</span></Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar senha <span className="text-destructive">*</span></Label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar conta
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
