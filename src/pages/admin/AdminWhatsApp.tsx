import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Building2, Save, Phone } from "lucide-react";
import { AccessDenied } from "@/components/admin/AccessDenied";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  whatsapp: string | null;
}

export default function AdminWhatsApp() {
  const perms = useAdminPermissions();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    const { data } = await (supabase.from("branches" as any) as any)
      .select("id, name, address, whatsapp")
      .order("name");
    const rows = (data as Branch[]) || [];
    setBranches(rows);
    const map: Record<string, string> = {};
    rows.forEach((b) => { map[b.id] = b.whatsapp || ""; });
    setNumbers(map);
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleSave = async (branchId: string) => {
    setSaving((prev) => ({ ...prev, [branchId]: true }));
    const raw = numbers[branchId] || "";
    // Sanitize: keep only digits
    const sanitized = raw.replace(/\D/g, "") || null;
    const { error } = await (supabase.from("branches" as any) as any)
      .update({ whatsapp: sanitized })
      .eq("id", branchId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "WhatsApp salvo!", description: `Número atualizado para a filial.` });
      fetchBranches();
    }
    setSaving((prev) => ({ ...prev, [branchId]: false }));
  };

  // CEO only
  if (!perms.canManageSystemSettings) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl tracking-tight">WhatsApp por Filial</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure o número de WhatsApp de cada unidade. Ele será usado nos modais de contato com o cliente.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center space-y-3">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhuma filial cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.map((b) => {
            const current = numbers[b.id] ?? "";
            const saved = b.whatsapp || "";
            const changed = current.replace(/\D/g, "") !== saved.replace(/\D/g, "");
            return (
              <Card key={b.id} className="border-border/60">
                <CardContent className="pt-5 pb-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{b.name}</p>
                      {b.address && (
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{b.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`wa-${b.id}`} className="flex items-center gap-1.5 text-sm">
                      <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                      Número WhatsApp
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`wa-${b.id}`}
                          value={current}
                          onChange={(e) =>
                            setNumbers((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                          placeholder="5581999999999"
                          className="h-10 pl-9"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-10 px-4 gap-1.5"
                        disabled={!changed || saving[b.id]}
                        onClick={() => handleSave(b.id)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving[b.id] ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Formato: código do país + DDD + número (ex: <span className="font-mono">5581999998888</span>). Sem espaços ou símbolos.
                    </p>
                    {b.whatsapp && (
                      <a
                        href={`https://wa.me/${b.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-[#25D366] hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Testar link: wa.me/{b.whatsapp}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
