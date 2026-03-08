import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Maximize2, Minimize2, RefreshCw, ArrowLeft, Clock, Users, CheckCircle2, Loader2 } from "lucide-react";
import logoDark from "@/assets/logo_dark.png";
import logoLight from "@/assets/logo_light.png";

interface Appointment {
  id: string;
  appointment_time: string;
  client_name: string;
  service_name: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  branch_name: string | null;
}

const STATUS_CONFIG = {
  pending: {
    label: "Aguardando",
    icon: Clock,
    bg: "bg-warning/10 border-warning/30",
    badge: "bg-warning/20 text-warning border border-warning/30",
    headerBg: "bg-warning/15",
    iconColor: "text-warning",
    dot: "bg-warning",
  },
  confirmed: {
    label: "Em Atendimento",
    icon: Users,
    bg: "bg-primary/10 border-primary/30",
    badge: "bg-primary/20 text-primary border border-primary/30",
    headerBg: "bg-primary/15",
    iconColor: "text-primary",
    dot: "bg-primary",
  },
  completed: {
    label: "Concluídos",
    icon: CheckCircle2,
    bg: "bg-success/10 border-success/30",
    badge: "bg-success/20 text-success border border-success/30",
    headerBg: "bg-success/15",
    iconColor: "text-success",
    dot: "bg-success",
  },
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-4xl font-mono font-bold tabular-nums tracking-tight text-foreground">
        {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-sm text-muted-foreground capitalize mt-0.5">
        {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

export default function QueueTV() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAppointments = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("appointments")
      .select(`
        id,
        appointment_time,
        status,
        services!inner(name),
        profiles!appointments_client_profile_fkey(full_name),
        branches(name)
      `)
      .eq("appointment_date", today)
      .neq("status", "cancelled")
      .order("appointment_time", { ascending: true });

    const mapped: Appointment[] = (data || []).map((a: any) => ({
      id: a.id,
      appointment_time: a.appointment_time?.slice(0, 5) ?? "--:--",
      client_name: a.profiles?.full_name ?? "Cliente",
      service_name: a.services?.name ?? "Serviço",
      status: a.status,
      branch_name: a.branches?.name ?? null,
    }));

    setAppointments(mapped);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel("queue-tv-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments]);

  // Apply dark/light mode to this page
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => {
      // restore original theme on unmount
    };
  }, [isDark]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const pending = appointments.filter((a) => a.status === "pending");
  const confirmed = appointments.filter((a) => a.status === "confirmed");
  const completed = appointments.filter((a) => a.status === "completed");
  const columns = [
    { key: "pending" as const, items: pending },
    { key: "confirmed" as const, items: confirmed },
    { key: "completed" as const, items: completed },
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-foreground flex flex-col select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/40 bg-card/60 backdrop-blur shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <img
            src={isDark ? logoLight : logoDark}
            alt="Logo"
            className="h-10 object-contain"
          />
          <div className="w-px h-10 bg-border/40" />
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">TV de Fila</h1>
            <p className="text-sm text-muted-foreground">Atendimentos de hoje</p>
          </div>
        </div>

        {/* Clock + controls */}
        <div className="flex items-center gap-6">
          <LiveClock />
          <div className="flex items-center gap-2">
            {/* Last update */}
            <span className="text-xs text-muted-foreground/60">
              Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button
              onClick={fetchAppointments}
              className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="h-9 px-3 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground text-xs gap-1.5"
            >
              {isDark ? "☀️ Claro" : "🌙 Escuro"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="h-9 px-3 rounded-lg flex items-center gap-1.5 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Painel
            </button>
          </div>
        </div>
      </header>

      {/* ── Columns ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-3 gap-0 divide-x divide-border/40 overflow-hidden">
          {columns.map(({ key, items }) => {
            const cfg = STATUS_CONFIG[key];
            const Icon = cfg.icon;

            return (
              <section key={key} className="flex flex-col overflow-hidden">
                {/* Column header */}
                <div className={`flex items-center justify-between px-6 py-4 ${cfg.headerBg} border-b border-border/40 shrink-0`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${cfg.bg} border`}>
                      <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                    </div>
                    <span className="font-semibold text-lg">{cfg.label}</span>
                  </div>
                  <span className={`text-2xl font-serif font-bold tabular-nums px-3 py-1 rounded-lg ${cfg.badge}`}>
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40 py-16">
                      <Icon className="h-12 w-12" />
                      <p className="text-sm">Nenhum agendamento</p>
                    </div>
                  ) : (
                    items.map((appt, idx) => (
                      <div
                        key={appt.id}
                        className={`rounded-2xl border p-5 flex items-center gap-4 ${cfg.bg} transition-all`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Position number */}
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 font-serif font-bold text-xl ${cfg.badge}`}>
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xl leading-tight truncate">{appt.client_name}</p>
                          <p className="text-base text-muted-foreground truncate mt-0.5">{appt.service_name}</p>
                          {appt.branch_name && (
                            <p className="text-xs text-muted-foreground/60 mt-1">{appt.branch_name}</p>
                          )}
                        </div>

                        {/* Time */}
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-mono font-bold tabular-nums">{appt.appointment_time}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1`}>
                            <div className={`h-2 w-2 rounded-full ${cfg.dot} ${key === "confirmed" ? "animate-pulse" : ""}`} />
                            <span className={`text-xs font-medium ${cfg.iconColor}`}>{cfg.label}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </main>
      )}

      {/* ── Footer ── */}
      <footer className="px-8 py-3 border-t border-border/40 bg-card/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6 text-sm text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Atualização em tempo real
          </span>
          <span>{appointments.length} agendamento{appointments.length !== 1 ? "s" : ""} hoje</span>
        </div>
        <span className="text-xs text-muted-foreground/40">by Dani Alves Beauty</span>
      </footer>
    </div>
  );
}
