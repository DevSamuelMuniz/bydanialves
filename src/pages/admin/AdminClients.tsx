import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Ban, CheckCircle, Calendar, DollarSign, Edit2, Save, X } from "lucide-react";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";

interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  blocked: boolean;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string; price: number } | null;
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function AdminClients() {
  const { toast } = useToast();
  const { adminLevel } = useAdminPermissions();
  const isProfessional = adminLevel === "professional";
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [emails, setEmails] = useState<Record<string, { email: string }>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });

  const fetchClients = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setClients((data as any[]) || []);
    setLoading(false);
  };

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-users");
      if (!error && data) setEmails(data);
    } catch {}
  };

  useEffect(() => {
    fetchClients();
    fetchEmails();
  }, []);

  const openDetail = async (client: ClientProfile) => {
    setSelectedClient(client);
    setEditing(false);
    setEditForm({ full_name: client.full_name, phone: client.phone || "" });
    setLoadingDetail(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, services(name, price)")
      .eq("client_id", client.user_id)
      .order("appointment_date", { ascending: false })
      .limit(50);
    setClientAppointments((data as any[]) || []);
    setLoadingDetail(false);
  };

  const toggleBlock = async (client: ClientProfile) => {
    const newBlocked = !client.blocked;
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: newBlocked } as any)
      .eq("id", client.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newBlocked ? "Cliente bloqueado" : "Cliente desbloqueado" });
      fetchClients();
      if (selectedClient?.id === client.id) {
        setSelectedClient({ ...client, blocked: newBlocked });
      }
    }
  };

  const saveEdit = async () => {
    if (!selectedClient) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editForm.full_name, phone: editForm.phone || null })
      .eq("id", selectedClient.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      setEditing(false);
      fetchClients();
      setSelectedClient({ ...selectedClient, full_name: editForm.full_name, phone: editForm.phone || null });
    }
  };

  const filtered = clients.filter((c) => {
    const email = emails[c.user_id]?.email || "";
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(search) ||
      email.toLowerCase().includes(q)
    );
  });

  const totalSpent = clientAppointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.services?.price || 0), 0);

  if (loading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Gestão de Clientes</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="border-border hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => openDetail(c)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.full_name || "Sem nome"}</p>
                    {c.blocked && (
                      <Badge variant="destructive" className="text-xs">
                        Bloqueado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.phone || "Sem telefone"}</p>
                  {emails[c.user_id] && (
                    <p className="text-sm text-muted-foreground">{emails[c.user_id].email}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBlock(c);
                  }}
                  title={c.blocked ? "Desbloquear" : "Bloquear"}
                >
                  {c.blocked ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Ban className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
               {/* Info */}
               <div className="space-y-3">
                 {editing && !isProfessional ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Nome</Label>
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Telefone</Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="mr-1 h-3 w-3" />
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        <X className="mr-1 h-3 w-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-lg">{selectedClient.full_name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.phone || "Sem telefone"}</p>
                      {emails[selectedClient.user_id] && (
                        <p className="text-sm text-muted-foreground">{emails[selectedClient.user_id].email}</p>
                      )}
                    </div>
                    {!isProfessional && (
                      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {clientAppointments.length} agendamentos
                  </div>
                  {!isProfessional && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      R$ {totalSpent.toFixed(2)} gastos
                    </div>
                  )}
                </div>

                {!isProfessional && (
                  <Button
                    variant={selectedClient.blocked ? "default" : "destructive"}
                    size="sm"
                    onClick={() => toggleBlock(selectedClient)}
                  >
                    {selectedClient.blocked ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Desbloquear
                      </>
                    ) : (
                      <>
                        <Ban className="mr-1 h-3 w-3" />
                        Bloquear Cliente
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* History */}
              <div>
                <h3 className="font-serif text-sm font-medium mb-2">Histórico de Agendamentos</h3>
                {loadingDetail ? (
                  <Skeleton className="h-20 w-full" />
                ) : clientAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {clientAppointments.map((a) => (
                      <Card key={a.id} className="border-border/60">
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{a.services?.name || "Serviço"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.appointment_date).toLocaleDateString("pt-BR")} às{" "}
                              {a.appointment_time?.slice(0, 5)}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant="outline" className="text-xs block">
                              {statusLabels[a.status] || a.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
