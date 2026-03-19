import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import { AdminLevel } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, Mail, CheckCircle, UserCog, Building2 } from "lucide-react";

interface UserInfo {
  user_id: string;
  full_name: string;
  roles: string[];
  admin_level: AdminLevel;
  branch_id: string | null;
  branch_name: string | null;
  email: string;
  email_confirmed: boolean;
}

const LEVEL_OPTIONS: { value: NonNullable<AdminLevel>; label: string }[] = [
  { value: "attendant", label: "Atendente" },
  { value: "professional", label: "Cabeleireiro(a)" },
  { value: "manager", label: "Gerente" },
  { value: "ceo", label: "CEO" },
];

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const perms = useAdminPermissions();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingLevel, setChangingLevel] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [assigningBranch, setAssigningBranch] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, branchesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name"),
      (supabase.from("user_roles") as any).select("user_id, role, admin_level, branch_id"),
      (supabase.from("branches" as any) as any).select("id, name").eq("active", true).order("name"),
    ]);

    let emailsMap: Record<string, { email: string; email_confirmed_at: string | null }> = {};
    try {
      const { data } = await supabase.functions.invoke("admin-get-users");
      if (data) emailsMap = data;
    } catch {}

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const branchList = branchesRes.data || [];
    setBranches(branchList as { id: string; name: string }[]);
    const branchMap: Record<string, string> = {};
    for (const b of branchList as any[]) branchMap[b.id] = b.name;

    const rolesMap: Record<string, { roles: string[]; admin_level: AdminLevel; branch_id: string | null }> = {};
    for (const r of roles) {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = { roles: [], admin_level: null, branch_id: null };
      rolesMap[r.user_id].roles.push(r.role);
      if (r.role === "admin") {
        rolesMap[r.user_id].admin_level = (r.admin_level as AdminLevel) ?? "ceo";
        rolesMap[r.user_id].branch_id = r.branch_id ?? null;
      }
    }

    const result: UserInfo[] = profiles.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name || "Sem nome",
      roles: rolesMap[p.user_id]?.roles || ["client"],
      admin_level: rolesMap[p.user_id]?.admin_level ?? null,
      branch_id: rolesMap[p.user_id]?.branch_id ?? null,
      branch_name: rolesMap[p.user_id]?.branch_id ? (branchMap[rolesMap[p.user_id].branch_id!] ?? null) : null,
      email: emailsMap[p.user_id]?.email || "",
      email_confirmed: !!emailsMap[p.user_id]?.email_confirmed_at,
    }));

    setUsers(result);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin", admin_level: "attendant" } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário adicionado como Atendente!" });
      fetchAll();
    }
  };

  const removeAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acesso admin removido!" });
      fetchAll();
    }
  };

  const changeLevel = async (userId: string, level: NonNullable<AdminLevel>) => {
    setChangingLevel(userId);
    const { error } = await (supabase.from("user_roles") as any)
      .update({ admin_level: level })
      .eq("user_id", userId)
      .eq("role", "admin");
    setChangingLevel(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Nível atualizado para ${ADMIN_LEVEL_LABELS[level]}!` });
      fetchAll();
    }
  };

  const assignBranch = async (userId: string, branchId: string) => {
    setAssigningBranch(userId);
    const { error } = await (supabase.from("user_roles") as any)
      .update({ branch_id: branchId === "none" ? null : branchId })
      .eq("user_id", userId)
      .eq("role", "admin");
    setAssigningBranch(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Filial atualizada!" });
      fetchAll();
    }
  };

  if (!perms.canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  const adminUsers = users.filter((u) => u.roles.includes("admin"));
  const clientUsers = users.filter((u) => !u.roles.includes("admin"));

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Gestão de Usuários</h1>
      <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>

      {/* Admins */}
      {adminUsers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Equipe Interna ({adminUsers.length})</h2>
          {adminUsers.map((u) => {
            const lvl = u.admin_level;
            const isSelf = u.user_id === currentUser?.id;
            return (
              <Card key={u.user_id} className="border-primary/20">
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{u.full_name}</p>
                      {isSelf && <Badge variant="outline" className="text-xs">Você</Badge>}
                      {lvl && (
                        <Badge variant="outline" className={`text-xs ${ADMIN_LEVEL_COLORS[lvl]}`}>
                          {ADMIN_LEVEL_LABELS[lvl]}
                        </Badge>
                      )}
                      {u.branch_name && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Building2 className="h-2.5 w-2.5" />
                          {u.branch_name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {u.email || "Email não disponível"}
                      {u.email_confirmed && <CheckCircle className="h-3 w-3 text-green-600" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Branch assignment */}
                    {!isSelf && branches.length > 0 && (
                      <Select
                        value={u.branch_id ?? "none"}
                        onValueChange={(v) => assignBranch(u.user_id, v)}
                        disabled={assigningBranch === u.user_id}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <Building2 className="h-3 w-3 mr-1.5 shrink-0" />
                          <SelectValue placeholder="Filial" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">Todas (global)</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Change level */}
                    {!isSelf && (
                      <Select
                        value={lvl ?? "ceo"}
                        onValueChange={(v) => changeLevel(u.user_id, v as NonNullable<AdminLevel>)}
                        disabled={changingLevel === u.user_id}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <UserCog className="h-3 w-3 mr-1.5" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Remove admin */}
                    {!isSelf && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover acesso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {u.full_name} perderá o acesso ao painel administrativo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeAdmin(u.user_id)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Clients */}
      {clientUsers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Clientes ({clientUsers.length})</h2>
          {clientUsers.map((u) => (
            <Card key={u.user_id} className="border-border">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{u.full_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {u.email || "Email não disponível"}
                    {u.email_confirmed && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Shield className="mr-1 h-3 w-3" />
                      Dar acesso interno
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Adicionar à equipe interna?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {u.full_name} receberá acesso ao painel como Atendente. Você pode ajustar o nível depois.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => promoteToAdmin(u.user_id)}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
