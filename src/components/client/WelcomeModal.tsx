import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Sparkles, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WelcomeModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"question" | "branch">("question");
  const [branches, setBranches] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, created_at")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Show modal only if branch_id is null (never set) and account is fresh (< 5 min old)
      const createdAt = new Date(profile.created_at).getTime();
      const isNew = Date.now() - createdAt < 5 * 60 * 1000;
      if (profile.branch_id === null && isNew) {
        setOpen(true);
        const { data: branchData } = await supabase
          .from("branches")
          .select("id, name, address")
          .eq("active", true)
          .order("name");
        setBranches(branchData || []);
      }
    };
    check();
  }, [user]);

  const handleNotClient = async () => {
    // Mark as "seen" by setting a sentinel so modal doesn't reappear
    await supabase.from("profiles").update({ branch_id: null } as any).eq("user_id", user!.id);
    // We use bio field trick: store a flag — actually just close without touching
    setOpen(false);
    toast({ title: "Bem-vindo(a)! 🎉", description: "Você pode agendar seu primeiro serviço quando quiser." });
  };

  const handleSaveBranch = async () => {
    if (!selectedBranch) return;
    setSaving(true);
    await supabase.from("profiles").update({ branch_id: selectedBranch } as any).eq("user_id", user!.id);
    setSaving(false);
    setOpen(false);
    toast({ title: "Tudo certo! 💇", description: "Sua filial preferida foi salva no seu perfil." });
  };

  const handleIsClient = () => setStep("branch");

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === "question" ? (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Seja bem-vindo(a)! 🎉</DialogTitle>
              <DialogDescription className="text-center">
                Você já é cliente do Dani Alves Studio?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <Button className="w-full gap-2" onClick={handleIsClient}>
                <UserCheck className="h-4 w-4" />
                Sim, já sou cliente
              </Button>
              <Button variant="outline" className="w-full" onClick={handleNotClient}>
                Não, é meu primeiro acesso
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Qual filial você frequenta?</DialogTitle>
              <DialogDescription className="text-center">
                Selecione a unidade que você costuma visitar para personalizarmos sua experiência.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione a filial..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{b.name}</span>
                        {b.address && <span className="text-xs text-muted-foreground">{b.address}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" disabled={!selectedBranch || saving} onClick={handleSaveBranch}>
                {saving ? "Salvando..." : "Confirmar filial"}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={() => setOpen(false)}>
                Pular por agora
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
