import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ptBR } from "date-fns/locale";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, getDay } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Info, RotateCcw, Save } from "lucide-react";

// By default Tue–Sat (2,3,4,5,6) are work days; 0=Sun, 1=Mon are off
const DEFAULT_WORK_DAYS = new Set([2, 3, 4, 5, 6]);

function dateToStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function getDatesInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(start);
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function AdminWorkCalendar() {
  const { user } = useAuth();
  const perms = useAdminPermissions();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [workDaysMap, setWorkDaysMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthDates = getDatesInMonth(year, month);

  const fetchMonthData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const start = format(startOfMonth(new Date(y, m)), "yyyy-MM-dd");
    const end = format(endOfMonth(new Date(y, m)), "yyyy-MM-dd");
    const { data } = await (supabase as any)
      .from("work_calendar")
      .select("date, enabled")
      .gte("date", start)
      .lte("date", end);

    const map: Record<string, boolean> = {};
    ((data as { date: string; enabled: boolean }[]) || []).forEach((row) => {
      map[row.date] = row.enabled;
    });
    setWorkDaysMap(map);
    setPendingChanges({});
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonthData(year, month);
  }, [year, month, fetchMonthData]);

  // Resolve effective enabled state for a date
  const isEnabled = (date: Date): boolean => {
    const str = dateToStr(date);
    if (str in pendingChanges) return pendingChanges[str];
    if (str in workDaysMap) return workDaysMap[str];
    return DEFAULT_WORK_DAYS.has(getDay(date));
  };

  const toggleDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    const str = dateToStr(date);
    const current = isEnabled(date);
    setPendingChanges((prev) => ({ ...prev, [str]: !current }));
  };

  const saveChanges = async () => {
    if (!user || Object.keys(pendingChanges).length === 0) return;
    setSaving(true);

    const upserts = Object.entries(pendingChanges).map(([date, enabled]) => ({
      date,
      enabled,
      created_by: user.id,
    }));

    const { error } = await (supabase as any)
      .from("work_calendar")
      .upsert(upserts, { onConflict: "date" });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Calendário salvo!", description: "As alterações foram aplicadas com sucesso." });
      setWorkDaysMap((prev) => ({ ...prev, ...pendingChanges }));
      setPendingChanges({});
    }
    setSaving(false);
  };

  const resetMonth = async () => {
    if (!user) return;
    setSaving(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDates = monthDates.filter((d) => d >= today);
    const upserts = futureDates.map((d) => ({
      date: dateToStr(d),
      enabled: DEFAULT_WORK_DAYS.has(getDay(d)),
      created_by: user.id,
    }));

    if (upserts.length > 0) {
      await (supabase as any).from("work_calendar").upsert(upserts, { onConflict: "date" });
    }

    toast({ title: "Mês redefinido", description: "Dias padrão (Terça–Sábado) restaurados." });
    await fetchMonthData(year, month);
    setSaving(false);
  };

  if (!perms.canManageSystemSettings) {
    return <AccessDenied />;
  }

  const hasPending = Object.keys(pendingChanges).length > 0;
  const enabledCount = monthDates.filter((d) => isEnabled(d)).length;
  const disabledCount = monthDates.length - enabledCount;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-serif font-bold tracking-tight">Calendário de Trabalho</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Defina os dias disponíveis para agendamento. Por padrão: Terça a Sábado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetMonth}
            disabled={saving}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Redefinir mês
          </Button>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={saving || !hasPending}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Salvando..." : `Salvar${hasPending ? ` (${Object.keys(pendingChanges).length})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-sans font-medium mb-1">Mês</p>
            <p className="text-lg font-serif font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-sans font-medium mb-1">Dias habilitados</p>
            <p className="text-lg font-serif font-bold text-primary">{enabledCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-sans font-medium mb-1">Dias bloqueados</p>
            <p className="text-lg font-serif font-bold text-destructive">{disabledCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main calendar card */}
      <Card className="border-border/60 shadow-elevated">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-lg capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Clique em um dia para ativar/desativar. Dias verdes = disponíveis para agendamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <WorkCalendarGrid
              year={year}
              month={month}
              monthDates={monthDates}
              isEnabled={isEnabled}
              pendingChanges={pendingChanges}
              onToggle={toggleDay}
            />
          )}
        </CardContent>
      </Card>

      {/* Info box */}
      <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Como funciona</p>
          <p>Os dias marcados como disponíveis aqui determinam quais datas os clientes poderão escolher no fluxo de agendamento. Dias desativados ficam bloqueados no calendário do cliente.</p>
          <p>Dias no passado não podem ser alterados. O padrão é Terça a Sábado habilitados.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Grid component ────────────────────────────────────────────────
interface GridProps {
  year: number;
  month: number;
  monthDates: Date[];
  isEnabled: (d: Date) => boolean;
  pendingChanges: Record<string, boolean>;
  onToggle: (d: Date) => void;
}

function WorkCalendarGrid({ year, month, monthDates, isEnabled, pendingChanges, onToggle }: GridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun ... 6=Sat

  const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {monthDates.map((date) => {
          const str = format(date, "yyyy-MM-dd");
          const enabled = isEnabled(date);
          const isPast = date < today;
          const isToday = isSameDay(date, today);
          const hasPendingFlag = str in pendingChanges;

          let cellClass = "border-border/30 bg-muted/20 opacity-30 cursor-not-allowed";
          if (!isPast) {
            cellClass = enabled
              ? "border-green-500/50 bg-green-500/15 text-green-700 hover:bg-green-500/25 cursor-pointer"
              : "border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 cursor-pointer";
          }

          return (
            <button
              key={str}
              onClick={() => onToggle(date)}
              disabled={isPast}
              className={[
                "relative h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-medium transition-all duration-200 border",
                cellClass,
                isToday ? "ring-2 ring-primary ring-offset-1" : "",
                hasPendingFlag ? "ring-1 ring-warning ring-offset-1" : "",
              ].join(" ")}
            >
              <span className="text-sm leading-none">{date.getDate()}</span>
              {!isPast && (
                <span className={`text-[9px] leading-none font-normal ${enabled ? "text-primary/60" : "text-destructive/50"}`}>
                  {enabled ? "●" : "○"}
                </span>
              )}
              {hasPendingFlag && (
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-warning" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-3 justify-end">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-3 w-3 rounded-sm bg-primary/10 border border-primary/40" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-3 w-3 rounded-sm bg-destructive/5 border border-destructive/30" />
          <span>Bloqueado</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-3 w-3 rounded-sm bg-transparent border border-border" />
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block" />
            Alterado (não salvo)
          </span>
        </div>
      </div>
    </div>
  );
}
