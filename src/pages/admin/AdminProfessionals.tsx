import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Users, Building2, CalendarDays, Clock, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import type { AdminLevel } from "@/contexts/AuthContext";

const DAYS = [
  { value: 1, label: "Segunda",  short: "Seg" },
  { value: 2, label: "Terça",    short: "Ter" },
  { value: 3, label: "Quarta",   short: "Qua" },
  { value: 4, label: "Quinta",   short: "Qui" },
  { value: 5, label: "Sexta",    short: "Sex" },
  { value: 6, label: "Sábado",   short: "Sáb" },
  { value: 0, label: "Domingo",  short: "Dom" },
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

// State for the weekly schedule dialog — one row per day
interface DayRow {
  enabled: boolean;
  start_time: string;
  end_time: string;
  existing_id?: string; // if already saved in DB
}

const defaultDayRow = (): DayRow => ({ enabled: false, start_time: "08:00", end_time: "17:00" });

function buildWeekState(existingSchedules: Schedule[]): Record<number, DayRow> {
  const state: Record<number, DayRow> = {};
  DAYS.forEach((d) => {
    const found = existingSchedules.find((s) => s.day_of_week === d.value);
    state[d.value] = found
      ? { enabled: found.active, start_time: found.start_time, end_time: found.end_time, existing_id: found.id }
      : defaultDayRow();
  });
  return state;
}

export default function AdminProfessionals() {
  const perms = useAdminPermissions();
  const { adminBranchId } = useAuth();
  const { toast } = useToast();

  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProf, setSelectedProf] = useState<ProfessionalProfile | null>(null);
  const [weekDialog, setWeekDialog] = useState(false);
  const [weekState, setWeekState] = useState<Record<number, DayRow>>({});
  const [saving, setSaving] = useState(false);

  const canManage = perms.canManageBranches;

  const fetchAll = async () => {
    setLoading(true);

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

  const openWeekDialog = (prof: ProfessionalProfile) => {
    setSelectedProf(prof);
    setWeekState(buildWeekState(prof.schedules));
    setWeekDialog(true);
  };

  const setDayField = (day: number, field: keyof DayRow, value: any) => {
    setWeekState((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // Apply same time to all enabled days
  const applyToAll = (start: string, end: string) => {
    setWeekState((prev) => {
      const next = { ...prev };
      DAYS.forEach((d) => {
        if (next[d.value]?.enabled) {
          next[d.value] = { ...next[d.value], start_time: start, end_time: end };
        }
      });
      return next;
    });
  };

  const saveWeek = async () => {
    if (!selectedProf) return;
    setSaving(true);

    const ops: Promise<any>[] = [];

    DAYS.forEach((d) => {
      const row = weekState[d.value];
      if (!row) return;

      if (row.enabled) {
        const payload = {
          professional_id: selectedProf.user_id,
          branch_id: selectedProf.branch_id || null,
          day_of_week: d.value,
          start_time: row.start_time + ":00",
          end_time: row.end_time + ":00",
          active: true,
        };
        if (row.existing_id) {
          ops.push((supabase as any).from("professional_schedules").update(payload).eq("id", row.existing_id));
        } else {
          ops.push((supabase as any).from("professional_schedules").insert(payload));
        }
      } else if (row.existing_id) {
        // Day was disabled or unchecked — delete existing record
        ops.push((supabase as any).from("professional_schedules").delete().eq("id", row.existing_id));
      }
    });

    const results = await Promise.all(ops);
    const errors = results.filter((r) => r.error).map((r) => r.error.message);

    if (errors.length) {
      toast({ title: "Erro ao salvar escala", description: errors[0], variant: "destructive" });
    } else {
      toast({ title: "Escala salva com sucesso! ✅" });
      setWeekDialog(false);
      fetchAll();
    }
    setSaving(false);
  };

  const deleteAllSchedules = async (prof: ProfessionalProfile) => {
    const ids = prof.schedules.map((s) => s.id);
    if (!ids.length) return;
    await (supabase as any).from("professional_schedules").delete().in("id", ids);
    toast({ title: "Escalas removidas." });
    fetchAll();
  };

  if (!perms.canViewBranches) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl">Profissionais</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie a equipe e monte as escalas de trabalho semanais
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
              onEditWeek={() => openWeekDialog(prof)}
              onDeleteAll={() => deleteAllSchedules(prof)}
            />
          ))}
        </div>
      )}

      {/* ── Dialog Escala Semanal ── */}
      <Dialog open={weekDialog} onOpenChange={setWeekDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Escala Semanal</DialogTitle>
            {selectedProf && (
              <p className="text-sm text-muted-foreground">{selectedProf.full_name}</p>
            )}
          </DialogHeader>

          <div className="py-1 space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-2 items-center px-1 pb-1 border-b border-border">
              <div />
              <span className="text-xs font-medium text-muted-foreground">Dia</span>
              <span className="text-xs font-medium text-muted-foreground w-20 text-center">Início</span>
              <span className="text-xs font-medium text-muted-foreground w-20 text-center">Término</span>
              <span className="text-xs font-medium text-muted-foreground w-6" />
            </div>

            {DAYS.map((d) => {
              const row = weekState[d.value] ?? defaultDayRow();
              return (
                <div
                  key={d.value}
                  className={`grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-4 items-center rounded-lg px-1 py-1.5 transition-colors
                    ${row.enabled ? "bg-primary/5" : "opacity-50"}`}
                >
                  {/* Toggle */}
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(v) => setDayField(d.value, "enabled", v)}
                    className="scale-75 origin-left"
                  />

                  {/* Day label */}
                  <span className={`text-sm font-medium pl-2 ${row.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                    {d.label}
                  </span>

                  {/* Start */}
                  <Select
                    value={row.start_time}
                    onValueChange={(v) => setDayField(d.value, "start_time", v)}
                    disabled={!row.enabled}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {/* End */}
                  <Select
                    value={row.end_time}
                    onValueChange={(v) => setDayField(d.value, "end_time", v)}
                    disabled={!row.enabled}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {/* Copy indicator */}
                  <div className="w-6" />
                </div>
              );
            })}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground self-center mr-1">Atalhos:</span>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
              onClick={() => {
                DAYS.slice(0, 5).forEach((d) => setDayField(d.value, "enabled", true));
                DAYS.slice(5).forEach((d) => setDayField(d.value, "enabled", false));
                applyToAll("08:00", "17:00");
              }}>
              Seg–Sex
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
              onClick={() => {
                DAYS.slice(0, 6).forEach((d) => setDayField(d.value, "enabled", true));
                setDayField(0, "enabled", false);
                applyToAll("08:00", "17:00");
              }}>
              Seg–Sáb
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
              onClick={() => DAYS.forEach((d) => setDayField(d.value, "enabled", true))}>
              Todos
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
              onClick={() => DAYS.forEach((d) => setDayField(d.value, "enabled", false))}>
              Nenhum
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setWeekDialog(false)}>Cancelar</Button>
            <Button onClick={saveWeek} disabled={saving}>
              {saving ? "Salvando…" : "Salvar Escala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────── Card do profissional ────────────────── */
interface ProfCardProps {
  prof: ProfessionalProfile;
  canManage: boolean;
  onEditWeek: () => void;
  onDeleteAll: () => void;
}

function ProfessionalCard({ prof, canManage, onEditWeek, onDeleteAll }: ProfCardProps) {
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
      <div className="px-4 pb-2 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Escala
          {activeDays > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
              {activeDays} dia{activeDays > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-primary px-2" onClick={onEditWeek}>
              <Pencil className="h-3 w-3" />
              {sortedSchedules.length === 0 ? "Montar Escala" : "Editar"}
            </Button>
            {sortedSchedules.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar escala?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Remove todos os turnos de <strong>{prof.full_name}</strong>. Não pode ser desfeito.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={onDeleteAll}
                    >
                      Limpar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {/* Schedules chips */}
      <CardContent className="px-4 pb-4 flex-1">
        {sortedSchedules.length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 opacity-30" />
            Nenhuma escala cadastrada
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sortedSchedules.map((sched) => {
              const day = DAYS.find((d) => d.value === sched.day_of_week);
              return (
                <div
                  key={sched.id}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border
                    ${sched.active
                      ? "bg-primary/8 border-primary/20 text-foreground"
                      : "bg-muted/40 border-border text-muted-foreground line-through opacity-60"}`}
                >
                  <span className="font-semibold">{day?.short}</span>
                  <span className="text-muted-foreground">{sched.start_time}–{sched.end_time}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
