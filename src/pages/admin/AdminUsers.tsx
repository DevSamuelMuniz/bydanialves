import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, Mail, CheckCircle } from "lucide-react";

interface UserInfo {
  user_id: string;
  full_name: string;
  roles: string[];
  email: string;
  email_confirmed: boolean;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    let emailsMap: Record<string, { email: string; email_confirmed_at: string | null }> = {};
    try {
      const { data } = await supabase.functions.invoke("admin-get-users");
      if (data) emailsMap = data;
    } catch {}

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    const rolesMap: Record<string, string[]> = {};
    for (const r of roles) {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role);
    }

    const result: UserInfo[] = profiles.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name || "Sem nome",
      roles: rolesMap[p.user_id] || ["client"],
      email: emailsMap[p.user_id]?.email || "",
      email_confirmed: !!emailsMap[p.user_id]?.email_confirmed_at,
    }));

    setUsers(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário promovido a admin!" });
      fetchAll();
    }
  };

  const removeAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permissão admin removida!" });
      fetchAll();
    }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Gestão de Usuários</h1>
      <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>

      <div className="space-y-2">
        {users.map((u) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <Card key={u.user_id} className="border-border">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{u.full_name}</p>
                    {isAdmin && <Badge className="bg-primary/20 text-primary text-xs">Admin</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {u.email || "Email não disponível"}
                    {u.email_confirmed && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </div>
                </div>
                <div>
                  {isAdmin ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ShieldOff className="mr-1 h-3 w-3" />
                          Remover Admin
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover permissão admin?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {u.full_name} perderá acesso ao painel administrativo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeAdmin(u.user_id)}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Shield className="mr-1 h-3 w-3" />
                          Promover Admin
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Promover a admin?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {u.full_name} terá acesso completo ao painel administrativo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => promoteToAdmin(u.user_id)}>Confirmar</AlertDialogAction>
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
    </div>
  );
}
