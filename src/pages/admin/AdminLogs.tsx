import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Activity, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAGE_SIZE = 30;

const actionLabels: Record<string, string> = {
  appointment_created: "Agendamento criado",
  appointment_status_changed: "Status alterado",
  profile_blocked: "Perfil bloqueado",
  profile_unblocked: "Perfil desbloqueado",
  profile_updated: "Perfil atualizado",
  subscription_created: "Assinatura criada",
  subscription_status_changed: "Status de assinatura alterado",
};

const actionColors: Record<string, string> = {
  appointment_created: "bg-primary/10 text-primary border-primary/20",
  appointment_status_changed: "bg-warning/15 text-warning-foreground border-warning/30",
  profile_blocked: "bg-destructive/10 text-destructive border-destructive/20",
  profile_unblocked: "bg-success/15 text-success border-success/20",
  profile_updated: "bg-muted text-muted-foreground border-border",
  subscription_created: "bg-primary/10 text-primary border-primary/20",
  subscription_status_changed: "bg-warning/15 text-warning-foreground border-warning/30",
};

const entityIcons: Record<string, string> = {
  appointments: "📅",
  profiles: "👤",
  subscriptions: "👑",
};

function formatDetails(action: string, details: any): string {
  if (!details) return "";
  if (action === "appointment_created") {
    return `Data: ${details.appointment_date} às ${details.appointment_time?.slice(0, 5)} — Status: ${details.status}`;
  }
  if (action === "appointment_status_changed") {
    return `${details.old_status} → ${details.new_status} | ${details.appointment_date} às ${details.appointment_time?.slice(0, 5)}`;
  }
  if (action === "profile_blocked" || action === "profile_unblocked") {
    return details.blocked ? "Conta bloqueada pelo administrador" : "Conta desbloqueada";
  }
  if (action === "profile_updated") {
    return `Nome: ${details.full_name}${details.phone ? ` | Tel: ${details.phone}` : ""}`;
  }
  if (action === "subscription_created") {
    return `Status: ${details.status}`;
  }
  if (action === "subscription_status_changed") {
    return `${details.old_status} → ${details.new_status}`;
  }
  return JSON.stringify(details);
}

export default function AdminLogs() {
  const perms = useAdminPermissions();
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name");
    const map: Record<string, string> = {};
    for (const p of data || []) map[p.user_id] = p.full_name;
    setProfiles(map);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("activity_logs")
      .select("*, performed_by", { count: "exact" })
      .order("created_at", { ascending: false });

    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (entityFilter !== "all") query = query.eq("entity", entityFilter);
    if (dateFrom) query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) query = query.lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");

    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setLogs(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [actionFilter, entityFilter, dateFrom, dateTo, page]);

  useEffect(() => { fetchProfiles(); }, []);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const resetFilters = () => {
    setActionFilter("all");
    setEntityFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filtered = search
    ? logs.filter((l) => {
        const name = (profiles[l.user_id] || "").toLowerCase();
        return name.includes(search.toLowerCase()) || l.action.includes(search.toLowerCase());
      })
    : logs;

  if (!perms.canViewLogs) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 animate-slide-up">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Log de Atividades</h1>
          <p className="text-sm text-muted-foreground">{totalCount} evento(s) registrado(s)</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative animate-slide-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome do usuário..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <Card className="border-border/60 animate-slide-up">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de ação</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Filtrar por tipo de ação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="appointment_created">Agendamento criado</SelectItem>
                  <SelectItem value="appointment_status_changed">Status alterado</SelectItem>
                  <SelectItem value="profile_blocked">Perfil bloqueado</SelectItem>
                  <SelectItem value="profile_unblocked">Perfil desbloqueado</SelectItem>
                  <SelectItem value="profile_updated">Perfil atualizado</SelectItem>
                  <SelectItem value="subscription_created">Assinatura criada</SelectItem>
                  <SelectItem value="subscription_status_changed">Status de assinatura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Entidade</label>
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Filtrar por entidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="appointments">Agendamentos</SelectItem>
                  <SelectItem value="profiles">Perfis</SelectItem>
                  <SelectItem value="subscriptions">Assinaturas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-sm font-normal">
                    <CalendarDays className="mr-2 h-3 w-3" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-sm font-normal">
                    <CalendarDays className="mr-2 h-3 w-3" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {(actionFilter !== "all" || entityFilter !== "all" || dateFrom || dateTo || search) && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={resetFilters}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Logs list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Nenhuma atividade encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log, i) => (
            <Card
              key={log.id}
              className="border-border/60 hover:border-primary/20 transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${i * 0.02}s` }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Entity icon */}
                    <div className="h-9 w-9 rounded-lg bg-muted/80 flex items-center justify-center text-base shrink-0">
                      {entityIcons[log.entity] || "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Usuário afetado */}
                        <p className="font-medium text-sm truncate">
                          {profiles[log.user_id] || "Usuário desconhecido"}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs border shrink-0 ${actionColors[log.action] || "bg-muted text-muted-foreground border-border"}`}
                        >
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </div>
                      {/* Executor da ação */}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.performed_by
                          ? log.performed_by === log.user_id
                            ? <span>por <span className="font-medium text-foreground/70">{profiles[log.performed_by] || "próprio usuário"}</span></span>
                            : <span>por <span className="font-medium text-primary/80">{profiles[log.performed_by] || "administrador"}</span></span>
                          : <span className="italic opacity-60">executor não registrado</span>}
                      </p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          {formatDetails(log.action, log.details)}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
