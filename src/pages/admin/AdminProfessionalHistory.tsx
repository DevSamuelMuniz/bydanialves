import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock, DollarSign, Scissors, User, CheckCircle2, XCircle, CalendarDays,
  RefreshCw, UserCheck, Building2, Star, StickyNote,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  completed: { label: "Concluído",   variant: "default",     icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelado",   variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  pending:   { label: "Pendente",    variant: "secondary",   icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: "Confirmado",  variant: "outline",     icon: <CheckCircle2 className="h-3 w-3" /> },
};

export default function AdminProfessionalHistory() {
  const { user } = useAuth();
  const { adminLevel } = useAdminPermissions();

  const isManager = adminLevel === "manager" || adminLevel === "ceo";
  const isProfessional = adminLevel === "professional";

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState<{ user_id: string; full_name: string; avatar_url: string | null }[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [profFilter, setProfFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!isManager) return;
    const load = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, admin_level")
        .eq("role", "admin")
        .eq("admin_level", "professional");
      if (!roles?.length) return;
      const ids = roles.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids)
        .order("full_name");
      setProfessionals(profs || []);
    };
    load();
    const loadBranches = async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("active", true).order("name");
      setBranches(data || []);
    };
    loadBranches();
  }, [isManager]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select(`
        id, status, appointment_date, appointment_time, notes, professional_id,
        services(name, price, duration_minutes),
        profiles!appointments_client_profile_fkey(full_name, phone, avatar_url),
        reviews(rating, comment)
      `)
      .in("status", ["completed", "cancelled"]);

    if (!isManager) {
      query = query.eq("professional_id", user?.id ?? "");
    } else {
      if (profFilter !== "all") query = query.eq("professional_id", profFilter);
      if (branchFilter !== "all") query = query.eq("branch_id", branchFilter);
    }

    if (dateFrom) query = query.gte("appointment_date", dateFrom);
    if (dateTo) query = query.lte("appointment_date", dateTo);

    const { data } = await query
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false })
      .limit(200);

    setAppointments(data || []);
    setLoading(false);
  }, [dateFrom, dateTo, profFilter, branchFilter, isManager, user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Metrics
  const completed = appointments.filter((a) => a.status === "completed");
  const cancelled = appointments.filter((a) => a.status === "cancelled");
  const totalRevenue = completed.reduce((acc, a) => acc + Number(a.services?.price || 0), 0);
  const totalHours = completed.reduce((acc, a) => acc + Number(a.services?.duration_minutes || 60), 0);
  const ratings = completed.flatMap((a) => (a.reviews || []).map((r: any) => r.rating)).filter(Boolean);
  const avgRating = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;

  // Group by date
  const byDate: Record<string, any[]> = {};
  appointments.forEach((a) => {
    const key = a.appointment_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Professional name lookup
  const profMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  professionals.forEach((p) => { profMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Histórico do Profissional</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isProfessional ? "Seu histórico de atendimentos" : "Histórico de atendimentos por profissional"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className={`grid grid-cols-1 gap-3 ${isManager ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
            {isManager && (
              <div>
                <Label className="text-xs mb-1.5 block">Profissional</Label>
                <Select value={profFilter} onValueChange={setProfFilter}>
                  <SelectTrigger className="gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {professionals.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isManager && (
              <div>
                <Label className="text-xs mb-1.5 block">Filial</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as filiais</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs mb-1.5 block">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Concluídos" value={String(completed.length)} color="text-emerald-600" />
          <KpiCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Cancelados" value={String(cancelled.length)} color="text-destructive" />
          <KpiCard icon={<DollarSign className="h-4 w-4 text-primary" />} label="Receita" value={`R$ ${totalRevenue.toFixed(0)}`} color="text-primary" />
          <KpiCard
            icon={<Star className="h-4 w-4 text-amber-500" />}
            label="Avaliação média"
            value={avgRating != null ? `${avgRating.toFixed(1)} ★` : "—"}
            color="text-amber-500"
          />
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum atendimento encontrado no período.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-background px-2">
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byDate[date].map((a) => {
                  const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.completed;
                  const review = (a.reviews || [])[0];
                  const profInfo = isManager ? profMap[a.professional_id] : null;
                  return (
                    <Card key={a.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                      <div className={`h-1 w-full ${a.status === "completed" ? "bg-emerald-400" : "bg-destructive"}`} />
                      <CardContent className="p-3 space-y-2">
                        {/* Client */}
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{a.profiles?.full_name || "Cliente"}</p>
                            {a.profiles?.phone && <p className="text-xs text-muted-foreground">📱 {a.profiles.phone}</p>}
                          </div>
                          <Badge variant={cfg.variant} className="text-xs flex items-center gap-1 shrink-0">
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Scissors className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-sm font-medium truncate">{a.services?.name || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{a.appointment_time?.slice(0, 5)}</span>
                            </div>
                            <span className="text-xs font-medium text-primary">R$ {Number(a.services?.price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        {/* Professional tag (for manager view) */}
                        {isManager && profInfo && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserCheck className="h-3 w-3 shrink-0" />
                            <span className="truncate">{profInfo.full_name}</span>
                          </div>
                        )}
                        {/* Review */}
                        {review && (
                          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 space-y-0.5">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((s) => (
                                <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                              ))}
                            </div>
                            {review.comment && <p className="text-xs text-muted-foreground italic line-clamp-2">{review.comment}</p>}
                          </div>
                        )}
                        {/* Notes */}
                        {a.notes && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{a.notes.replace(/\[Atendido por:.*?\]/g, "").trim()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col gap-1">
        <div className={`flex items-center gap-1.5 ${color}`}>{icon}<span className="text-xs font-medium">{label}</span></div>
        <span className="text-xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
