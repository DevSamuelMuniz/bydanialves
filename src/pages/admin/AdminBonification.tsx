import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ChevronDown, ChevronUp, Clock, Users } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminBonification() {
  const perms = useAdminPermissions();

  const [planProfessionals, setPlanProfessionals] = useState<any[]>([]);
  const [bonusHours, setBonusHours] = useState<Record<string, string>>({});
  const [bonusExpanded, setBonusExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("plan_professionals")
      .select("id, plan_id, professional_id, plans(name, price), profiles(full_name, avatar_url)")
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const map: Record<string, {
          professional_id: string;
          full_name: string;
          avatar_url: string | null;
          plans: { plan_id: string; plan_name: string; plan_price: number }[];
        }> = {};
        for (const row of data) {
          const pid = row.professional_id;
          const plan = row.plans as any;
          const profile = row.profiles as any;
          if (!map[pid]) {
            map[pid] = {
              professional_id: pid,
              full_name: profile?.full_name ?? "Profissional",
              avatar_url: profile?.avatar_url ?? null,
              plans: [],
            };
          }
          map[pid].plans.push({
            plan_id: row.plan_id,
            plan_name: plan?.name ?? "Plano",
            plan_price: Number(plan?.price ?? 0),
          });
        }
        setPlanProfessionals(Object.values(map));
        setLoading(false);
      });
  }, []);

  if (!perms.canViewBonification) return <AccessDenied />;

  const totalBonusPool = planProfessionals.reduce((acc, prof) =>
    acc + prof.plans.reduce((s: number, p: any) => s + p.plan_price * 0.1, 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Bonificação
        </h1>
        <p className="text-sm text-muted-foreground">
          10% do valor de cada plano por profissional vinculado
        </p>
      </div>

      {/* Pool total */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fundo Total de Bonificação</p>
                <p className="text-3xl font-serif font-bold text-primary">{fmt(totalBonusPool)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculado sobre os planos ativos vinculados
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 justify-end">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {planProfessionals.length} profissional(is)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {planProfessionals.reduce((a, p) => a + p.plans.length, 0)} vínculo(s) com planos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profissionais */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : planProfessionals.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum profissional vinculado a planos.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vincule profissionais aos planos para calcular bonificações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {planProfessionals.map((prof) => {
            const bonusPerPlan = prof.plans.map((p: any) => ({
              ...p,
              bonus: p.plan_price * 0.1,
            }));
            const totalBonus = bonusPerPlan.reduce((s: number, p: any) => s + p.bonus, 0);
            const hours = Number(bonusHours[prof.professional_id] || 0);
            const expanded = bonusExpanded[prof.professional_id] ?? false;

            return (
              <Card key={prof.professional_id} className="border-border">
                <CardContent className="pt-4 pb-4 space-y-3">
                  {/* Cabeçalho do profissional */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden shrink-0">
                        {prof.avatar_url
                          ? <img src={prof.avatar_url} alt={prof.full_name} className="h-full w-full object-cover" />
                          : prof.full_name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <p className="font-medium">{prof.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {prof.plans.length} plano(s) vinculado(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Bonificação disponível</p>
                        <p className="text-lg font-serif font-bold text-primary">{fmt(totalBonus)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setBonusExpanded((prev) => ({
                          ...prev,
                          [prof.professional_id]: !prev[prof.professional_id],
                        }))}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Detalhamento dos planos */}
                  {expanded && (
                    <div className="space-y-2 pl-13">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-1">
                        Planos vinculados
                      </p>
                      {bonusPerPlan.map((p: any) => (
                        <div
                          key={p.plan_id}
                          className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2.5"
                        >
                          <div>
                            <p className="text-sm font-medium">{p.plan_name}</p>
                            <p className="text-xs text-muted-foreground">Valor do plano: {fmt(p.plan_price)}</p>
                          </div>
                          <Badge variant="outline" className="text-primary border-primary/30 font-semibold">
                            10% = {fmt(p.bonus)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Horas + Bonificação calculada */}
                  <div className="flex items-end gap-3 pt-2 border-t border-border">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Horas trabalhadas (manual)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Ex: 40"
                        value={bonusHours[prof.professional_id] || ""}
                        onChange={(e) =>
                          setBonusHours((prev) => ({
                            ...prev,
                            [prof.professional_id]: e.target.value,
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="shrink-0 rounded-lg border border-border bg-muted/30 px-4 py-2.5 min-w-[150px]">
                      <p className="text-xs text-muted-foreground">Bonificação a pagar</p>
                      <p className={`text-sm font-bold mt-0.5 ${hours > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {hours > 0 ? fmt(totalBonus) : "—"}
                      </p>
                      {hours > 0 && (
                        <p className="text-xs text-muted-foreground">{hours}h registrada(s)</p>
                      )}
                    </div>
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
