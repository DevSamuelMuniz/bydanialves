import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Ban, CheckCircle, Calendar, DollarSign, Edit2, Save, X, MessageCircle, MapPin, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { cn } from "@/lib/utils";
import Avatar3D from "@/components/ui/avatar-3d";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  blocked: boolean;
  block_reason?: string | null;
  created_at: string;
  gender?: string | null;
  branch_id?: string | null;
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
  const { adminBranchId } = useAuth();
  const { adminLevel } = useAdminPermissions();
  const isProfessional = adminLevel === "professional";
  const isRestricted = adminLevel === "attendant" || adminLevel === "professional";
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [emails, setEmails] = useState<Record<string, { email: string }>>({});
  const [branches, setBranches] = useState<Record<string, string>>({}); // id -> name
  const [clientFreqBranch, setClientFreqBranch] = useState<Record<string, string>>({}); // user_id -> branch name
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", gender: "male" });
  const [blockModal, setBlockModal] = useState<{ client: ClientProfile } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [unblockModal, setUnblockModal] = useState<{ client: ClientProfile } | null>(null);

  const fetchClients = async () => {
    let query = supabase.from("profiles").select("*").order("full_name");
    // Atendentes e profissionais veem apenas clientes da sua filial
    if (isRestricted && adminBranchId) {
      query = query.eq("branch_id", adminBranchId);
    }
    const { data } = await query;
    setClients((data as any[]) || []);
    setLoading(false);
  };

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-users");
      if (!error && data) setEmails(data);
    } catch {}
  };

  const fetchBranchData = async () => {
    const { data: branchData } = await supabase.from("branches").select("id, name");
    const map: Record<string, string> = {};
    branchData?.forEach((b) => { map[b.id] = b.name; });
    setBranches(map);

    // Fetch all completed appointments with branch_id to compute most frequented
    const { data: appts } = await supabase
      .from("appointments")
      .select("client_id, branch_id")
      .eq("status", "completed")
      .not("branch_id", "is", null);

    const counts: Record<string, Record<string, number>> = {};
    appts?.forEach((a) => {
      if (!a.branch_id) return;
      if (!counts[a.client_id]) counts[a.client_id] = {};
      counts[a.client_id][a.branch_id] = (counts[a.client_id][a.branch_id] || 0) + 1;
    });

    const freqMap: Record<string, string> = {};
    Object.entries(counts).forEach(([clientId, branchCounts]) => {
      const topBranchId = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topBranchId && map[topBranchId]) freqMap[clientId] = map[topBranchId];
    });
    setClientFreqBranch(freqMap);
  };

  useEffect(() => {
    fetchClients();
    fetchEmails();
    fetchBranchData();
  }, []);

  const openDetail = async (client: ClientProfile) => {
    setSelectedClient(client);
    setEditing(false);
    setEditForm({ full_name: client.full_name, phone: client.phone || "", gender: client.gender || "male" });
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
    if (!client.blocked) {
      // Opening block modal for confirmation + reason
      setBlockReason("");
      setBlockModal({ client });
      return;
    }
    // Open unblock confirmation modal
    setUnblockModal({ client });
  };

  const confirmBlock = async () => {
    if (!blockModal) return;
    const client = blockModal.client;
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: true, block_reason: blockReason || null } as any)
      .eq("id", client.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente bloqueado", description: blockReason || undefined });
      fetchClients();
      if (selectedClient?.id === client.id) setSelectedClient({ ...client, blocked: true, block_reason: blockReason || null });
    }
    setBlockModal(null);
    setBlockReason("");
  };

  const confirmUnblock = async () => {
    if (!unblockModal) return;
    const client = unblockModal.client;
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: false, block_reason: null } as any)
      .eq("id", client.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente desbloqueado" });
      fetchClients();
      if (selectedClient?.id === client.id) setSelectedClient({ ...client, blocked: false, block_reason: null });
    }
    setUnblockModal(null);
  };

  const saveEdit = async () => {
    if (!selectedClient) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editForm.full_name, phone: editForm.phone || null, gender: editForm.gender } as any)
      .eq("id", selectedClient.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      setEditing(false);
      fetchClients();
      setSelectedClient({ ...selectedClient, full_name: editForm.full_name, phone: editForm.phone || null, gender: editForm.gender });
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-serif text-2xl">Gestão de Clientes</h1>
        <Button variant="outline" size="sm" onClick={() => {
          const headers = ["Nome", "Email", "Telefone", "Gênero", "Bloqueado", "Filial Frequente", "Cadastrado em"];
          const rows = filtered.map((c) => [
            c.full_name,
            emails[c.user_id]?.email ?? "",
            c.phone ?? "",
            c.gender === "female" ? "Feminino" : c.gender === "male" ? "Masculino" : "",
            c.blocked ? "Sim" : "Não",
            clientFreqBranch[c.user_id] ?? "",
            new Date(c.created_at).toLocaleDateString("pt-BR"),
          ]);
          downloadCSV(`clientes${search ? "_busca-" + search.replace(/\s+/g, "_") : ""}`, headers, rows);
        }}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <ClientProfileCard
              key={c.id}
              client={c}
              email={emails[c.user_id]?.email}
              freqBranch={clientFreqBranch[c.user_id]}
              isProfessional={isProfessional}
              onClick={() => openDetail(c)}
              onToggleBlock={(e) => { e.stopPropagation(); toggleBlock(c); }}
            />
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
                     <div className="space-y-1">
                       <Label>Gênero</Label>
                       <RadioGroup
                         value={editForm.gender}
                         onValueChange={(v) => setEditForm({ ...editForm, gender: v })}
                         className="flex gap-4"
                       >
                         <div className="flex items-center gap-2">
                           <RadioGroupItem value="male" id="gender-male" />
                           <Label htmlFor="gender-male" className="cursor-pointer">Masculino</Label>
                         </div>
                         <div className="flex items-center gap-2">
                           <RadioGroupItem value="female" id="gender-female" />
                           <Label htmlFor="gender-female" className="cursor-pointer">Feminino</Label>
                         </div>
                       </RadioGroup>
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

                <div className="flex gap-4 flex-wrap">
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
                  {clientFreqBranch[selectedClient.user_id] && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {clientFreqBranch[selectedClient.user_id]}
                    </div>
                  )}
                </div>

                {!isProfessional && (
                  <div className="space-y-2">
                    {selectedClient.blocked && selectedClient.block_reason && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                        <Ban className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-destructive mb-0.5">Motivo do bloqueio</p>
                          <p className="text-xs text-muted-foreground">{selectedClient.block_reason}</p>
                        </div>
                      </div>
                    )}
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
                  </div>
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

      {/* ─── Block Confirmation Modal ─── */}
      <Dialog open={!!blockModal} onOpenChange={(open) => { if (!open) { setBlockModal(null); setBlockReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Bloquear Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Você está prestes a bloquear{" "}
              <span className="font-semibold text-foreground">{blockModal?.client.full_name || "este cliente"}</span>.
              Todos os agendamentos pendentes serão cancelados automaticamente.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="block-reason">Motivo do bloqueio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                id="block-reason"
                placeholder="Descreva o motivo do bloqueio..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setBlockModal(null); setBlockReason(""); }}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmBlock}>
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Confirmar bloqueio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Unblock Confirmation Modal ─── */}
      <Dialog open={!!unblockModal} onOpenChange={(open) => { if (!open) setUnblockModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Desbloquear Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Você está prestes a desbloquear{" "}
              <span className="font-semibold text-foreground">{unblockModal?.client.full_name || "este cliente"}</span>.
            </p>
            {unblockModal?.client.block_reason && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                <Ban className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive mb-0.5">Motivo do bloqueio</p>
                  <p className="text-xs text-muted-foreground">{unblockModal.client.block_reason}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setUnblockModal(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmUnblock}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Confirmar desbloqueio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Animated Profile Card ───────────────────────────────────────────────────

interface ClientProfileCardProps {
  client: ClientProfile;
  email?: string;
  freqBranch?: string;
  isProfessional: boolean;
  onClick: () => void;
  onToggleBlock: (e: React.MouseEvent) => void;
}

function ClientProfileCard({ client, email, freqBranch, isProfessional, onClick, onToggleBlock }: ClientProfileCardProps) {
  const initials = (client.full_name || "?")[0].toUpperCase();

  return (
    <div
      className="relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 cursor-pointer group transition-all duration-300 hover:shadow-elevated hover:border-primary/30 overflow-hidden"
      onClick={onClick}
    >
      {/* Animated grid bg */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.06] dark:opacity-[0.04] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            animation: "gridMove 4s linear infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0,0); }
          100% { transform: translate(32px,32px); }
        }
        @keyframes pulseRing {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(1.5); }
        }
      `}</style>


      {/* Blocked badge top-left */}
      {client.blocked && (
        <div className="absolute top-3 left-3">
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Bloqueado</Badge>
        </div>
      )}

      {/* Avatar 3D */}
      <div className="relative mt-2 transition-transform duration-300 group-hover:scale-105">
        <Avatar3D name={client.full_name || "?"} blocked={client.blocked} gender={client.gender ?? undefined} />
        <div className="absolute inset-0 rounded-full ring-2 ring-primary/0 transition-all duration-300 group-hover:ring-primary/40 group-hover:ring-offset-2" />
      </div>

      {/* Info */}
      <div className="flex flex-col items-center text-center w-full min-w-0 gap-0.5">
        <p className="font-semibold text-sm text-foreground truncate w-full">{client.full_name || "Sem nome"}</p>
        <p className="text-xs text-muted-foreground truncate w-full">{client.phone || "Sem telefone"}</p>
        {email && <p className="text-xs text-muted-foreground truncate w-full">{email}</p>}
        {freqBranch && (
          <div className="flex items-center gap-1 justify-center mt-0.5">
            <MapPin className="h-3 w-3 text-primary shrink-0" />
            <p className="text-xs text-primary font-medium truncate">{freqBranch}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
        <button
          className="flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1 text-xs font-medium text-primary transition-all duration-200 hover:scale-105"
          onClick={onClick}
        >
          <MessageCircle className="h-3 w-3" />
          Ver
        </button>
        {!isProfessional && (
          <button
            className={cn(
              "flex items-center justify-center h-6 w-6 rounded-full border transition-all duration-200 hover:scale-105",
              client.blocked
                ? "bg-success/10 hover:bg-success/20 border-success/20 text-success"
                : "bg-destructive/10 hover:bg-destructive/20 border-destructive/20 text-destructive"
            )}
            onClick={onToggleBlock}
            title={client.blocked ? "Desbloquear" : "Bloquear"}
          >
            {client.blocked
              ? <CheckCircle className="h-3 w-3" />
              : <Ban className="h-3 w-3" />
            }
          </button>
        )}
      </div>

      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-primary/0 transition-all duration-500 group-hover:ring-primary/20 pointer-events-none" />
    </div>
  );
}
