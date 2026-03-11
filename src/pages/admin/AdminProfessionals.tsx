import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users, Building2, CalendarDays, Clock, Plus, Pencil, Trash2, UserCheck
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import type { AdminLevel } from "@/contexts/AuthContext";

const DAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const HOURS = Array.from({ length: 10 }, (_, i) => {
  const h = i + 8;
  return `${String(h).padStart(2, "0")}:00`;
});

interface Branch { id: string; name: string; }
interface ProfessionalProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  admin_level: AdminLevel;
  branch_id: string | null;
  branch_name: string | null;
  schedules: Schedule[];
}
interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

export default function AdminProfessionals() {
  const perms = useAdminPermissions();
  const { adminBranchId } = useAuth();
  const { toast } = useToast();

  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProf, setSelectedProf] = useState<ProfessionalProfile | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Partial<Schedule> & { professional_id?: string; branch_id?: string }>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  const canManage = perms.canManageBranches; // gerente/ceo

  const fetchAll = async () => {
    setLoading(true);

    // Busca roles de professional e attendant
    let rolesQuery = (supabase as any)
      .from("user_roles")
      .select("user_id, admin_level, branch_id")
      .eq("role", "admin")
      .in("admin_level", ["professional", "attendant"]);

    if (adminBranchId) rolesQuery = rolesQuery.eq("branch_id", adminBranchId);

    const { data: roles } = await rolesQuery;
    if (!roles || roles.length === 0) { setProfessionals([]); setLoading(false); return; }

    const userIds = roles.map((r: any) => r.user_id);

    const [{ data: profiles }, { data: branchData }, { data: schedulesData }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url, bio").in("user_id", userIds),
      supabase.from("branches" as any).select("id, name").eq("active", true),
      (supabase as any).from("professional_schedules").select("*").in("professional_id", userIds),
    ]);

    setBranches((branchData as unknown as Branch[]) || []);

    const branchMap: Record<string, string> = {};
    ((branchData as unknown as Branch[]) || []).forEach((b) => { branchMap[b.id] = b.name; });

    const result: ProfessionalProfile[] = (roles as any[]).map((role) => {
      const profile = ((profiles as any[]) || []).find((p) => p.user_id === role.user_id);
      const mySchedules = ((schedulesData as any[]) || []).filter((s) => s.professional_id === role.user_id);
      return {
        user_id: role.user_id,
        full_name: profile?.full_name || "Sem nome",
        avatar_url: profile?.avatar_url || null,
        bio: profile?.bio || null,
        admin_level: role.admin_level as AdminLevel,
        branch_id: role.branch_id,
        branch_name: role.branch_id ? (branchMap[role.branch_id] || null) : null,
        schedules: mySchedules.map((s: any) => ({
          id: s.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
          active: s.active,
        })),
      };
    });

    setProfessionals(result);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openAddSchedule = (prof: ProfessionalProfile) => {
    setSelectedProf(prof);
    // Find first day not already scheduled
    const usedDays = new Set(prof.schedules.map((s) => s.day_of_week));
    const firstFreeDay = DAYS.find((d) => !usedDays.has(d.value))?.value ?? 1;
    setEditSchedule({
      professional_id: prof.user_id,
      branch_id: prof.branch_id || undefined,
      day_of_week: firstFreeDay,
      start_time: "08:00",
      end_time: "17:00",
      active: true,
    });
    setScheduleDialogOpen(true);
  };

  const openEditSchedule = (prof: ProfessionalProfile, sched: Schedule) => {
    setSelectedProf(prof);
    setEditSchedule({
      ...sched,
      professional_id: prof.user_id,
      branch_id: prof.branch_id || undefined,
    });
    setScheduleDialogOpen(true);
  };

  const saveSchedule = async () => {
    if (!editSchedule.professional_id || editSchedule.day_of_week === undefined) return;
    setSavingSchedule(true);

    const payload = {
      professional_id: editSchedule.professional_id,
      branch_id: editSchedule.branch_id || null,
      day_of_week: editSchedule.day_of_week,
      start_time: editSchedule.start_time + ":00",
      end_time: editSchedule.end_time + ":00",
      active: editSchedule.active ?? true,
    };

    let error: any;
    if (editSchedule.id) {
      ({ error } = await (supabase as any).from("professional_schedules").update(payload).eq("id", editSchedule.id));
    } else {
      ({ error } = await (supabase as any).from("professional_schedules").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar escala", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editSchedule.id ? "Escala atualizada!" : "Escala adicionada!" });
      setScheduleDialogOpen(false);
      fetchAll();
    }
    setSavingSchedule(false);
  };

  const deleteSchedule = async (schedId: string) => {
    const { error } = await (supabase as any).from("professional_schedules").delete().eq("id", schedId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Escala removida." }); fetchAll(); }
  };

  const toggleScheduleActive = async (sched: Schedule) => {
    await (supabase as any).from("professional_schedules").update({ active: !sched.active }).eq("id", sched.id);
    fetchAll();
  };

  if (!perms.canViewBranches) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl">Profissionais</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie a equipe e monte as escalas de trabalho de cada profissional
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : professionals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <Users className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium">Nenhum profissional cadastrado</p>
            <p className="text-sm">Acesse <strong>Usuários</strong> para promover um usuário a Profissional ou Atendente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {professionals.map((prof) => (
            <ProfessionalCard
              key={prof.user_id}
              prof={prof}
              canManage={canManage}
              onAddSchedule={() => openAddSchedule(prof)}
              onEditSchedule={(s) => openEditSchedule(prof, s)}
              onDeleteSchedule={deleteSchedule}
              onToggleSchedule={toggleScheduleActive}
            />
          ))}
        </div>
      )}

      {/* Dialog Escala */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editSchedule.id ? "Editar Escala" : "Adicionar Escala"}
            </DialogTitle>
            {selectedProf && (
              <p className="text-sm text-muted-foreground">{selectedProf.full_name}</p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Dia da semana</Label>
              <Select
                value={String(editSchedule.day_of_week ?? 1)}
                onValueChange={(v) => setEditSchedule((prev) => ({ ...prev, day_of_week: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Select
                  value={editSchedule.start_time || "08:00"}
                  onValueChange={(v) => setEditSchedule((prev) => ({ ...prev, start_time: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Término</Label>
                <Select
                  value={editSchedule.end_time || "17:00"}
                  onValueChange={(v) => setEditSchedule((prev) => ({ ...prev, end_time: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="sched-active"
                checked={editSchedule.active ?? true}
                onCheckedChange={(v) => setEditSchedule((prev) => ({ ...prev, active: v }))}
              />
              <Label htmlFor="sched-active">Escala ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveSchedule} disabled={savingSchedule}>
              {savingSchedule ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────── Sub-componente card ────────────────── */
interface ProfCardProps {
  prof: ProfessionalProfile;
  canManage: boolean;
  onAddSchedule: () => void;
  onEditSchedule: (s: Schedule) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleSchedule: (s: Schedule) => void;
}

function ProfessionalCard({ prof, canManage, onAddSchedule, onEditSchedule, onDeleteSchedule, onToggleSchedule }: ProfCardProps) {
  const levelLabel = prof.admin_level ? ADMIN_LEVEL_LABELS[prof.admin_level] : null;
  const levelColor = prof.admin_level ? ADMIN_LEVEL_COLORS[prof.admin_level] : "";
  const initials = prof.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const sortedSchedules = [...prof.schedules].sort((a, b) => {
    const ai = DAYS.findIndex((d) => d.value === a.day_of_week);
    const bi = DAYS.findIndex((d) => d.value === b.day_of_week);
    return ai - bi;
  });

  const activeDays = sortedSchedules.filter((s) => s.active).length;

  return (
    <Card className="overflow-hidden border-border flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
          {prof.avatar_url
            ? <img src={prof.avatar_url} alt={prof.full_name} className="h-full w-full object-cover" />
            : initials
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{prof.full_name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {levelLabel && (
              <Badge variant="outline" className={`text-xs ${levelColor}`}>{levelLabel}</Badge>
            )}
            {prof.branch_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {prof.branch_name}
              </span>
            )}
          </div>
          {prof.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{prof.bio}</p>}
        </div>
      </div>

      {/* Escala header */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Escala de Trabalho
          {activeDays > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
              {activeDays} dia{activeDays > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {canManage && (
          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-primary" onClick={onAddSchedule}>
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        )}
      </div>

      {/* Schedules list */}
      <CardContent className="px-4 pb-4 flex-1">
        {sortedSchedules.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 opacity-30" />
            Nenhuma escala cadastrada
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedSchedules.map((sched) => {
              const dayLabel = DAYS.find((d) => d.value === sched.day_of_week)?.label || "—";
              return (
                <div
                  key={sched.id}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border transition-colors
                    ${sched.active ? "bg-primary/5 border-primary/15" : "bg-muted/40 border-border opacity-60"}`}
                >
                  <div className="w-16 font-medium text-foreground shrink-0">{dayLabel}</div>
                  <div className="flex items-center gap-1 text-muted-foreground flex-1">
                    <Clock className="h-3 w-3" />
                    {sched.start_time} – {sched.end_time}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={sched.active}
                        onCheckedChange={() => onToggleSchedule(sched)}
                        className="scale-75"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => onEditSchedule(sched)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover escala?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove o turno de <strong>{dayLabel}</strong> ({sched.start_time}–{sched.end_time}).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onDeleteSchedule(sched.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
