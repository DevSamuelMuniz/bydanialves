import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Schedule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  branch_id: string | null;
};

type Branch = { id: string; name: string };

function formatTime(t: string) {
  return t.slice(0, 5);
}

export default function AdminMySchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: scheds }, { data: brs }] = await Promise.all([
        supabase
          .from("professional_schedules")
          .select("id, day_of_week, start_time, end_time, active, branch_id")
          .eq("professional_id", user.id)
          .order("day_of_week"),
        supabase.from("branches").select("id, name"),
      ]);
      setSchedules(scheds ?? []);
      const map: Record<string, string> = {};
      (brs ?? []).forEach((b: Branch) => { map[b.id] = b.name; });
      setBranches(map);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const todayDow = new Date().getDay();
  const activeDays = schedules.filter((s) => s.active).map((s) => s.day_of_week);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
          <CalendarDays className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold">Minha Escala</h1>
          <p className="text-sm text-muted-foreground">Seus dias e horários de trabalho cadastrados</p>
        </div>
      </div>

      {/* Week summary chips */}
      <div className="flex gap-2 flex-wrap">
        {DAY_SHORT.map((label, dow) => {
          const isActive = activeDays.includes(dow);
          const isToday = dow === todayDow;
          return (
            <span
              key={dow}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
                ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                ${isActive
                  ? "gradient-gold text-primary-foreground border-transparent shadow-gold"
                  : "bg-muted text-muted-foreground border-border"}`}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Schedule cards */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma escala cadastrada</p>
            <p className="text-sm mt-1">Entre em contato com seu gerente para configurar seus horários.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schedules.map((s) => {
            const isToday = s.day_of_week === todayDow;
            return (
              <Card
                key={s.id}
                className={`border transition-all duration-200 ${isToday ? "border-primary/40 shadow-gold" : "border-border/60"} ${!s.active ? "opacity-50" : ""}`}
              >
                <CardContent className="flex items-center justify-between gap-4 py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0
                      ${isToday ? "gradient-gold text-primary-foreground shadow-gold" : "bg-muted"}`}>
                      <span className="text-xs font-medium uppercase tracking-wide leading-none">
                        {DAY_SHORT[s.day_of_week]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{DAY_NAMES[s.day_of_week]}</p>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                        {s.branch_id && branches[s.branch_id] && (
                          <>
                            <span className="opacity-40">•</span>
                            <span>{branches[s.branch_id]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <Badge className="gradient-gold border-0 text-primary-foreground text-[10px] px-2">
                        Hoje
                      </Badge>
                    )}
                    <Badge variant={s.active ? "outline" : "secondary"} className="text-[10px]">
                      {s.active ? "Ativo" : "Inativo"}
                    </Badge>
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
