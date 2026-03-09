import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Maximize2, Minimize2, RefreshCw, Clock, Users, CheckCircle2,
  Loader2, WifiOff, Volume2, VolumeX,
} from "lucide-react";
import logoHorizontal from "@/assets/logo_horizontal.png";

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
    pulse: false,
  },
  confirmed: {
    label: "Em Atendimento",
    icon: Users,
    bg: "bg-primary/10 border-primary/30",
    badge: "bg-primary/20 text-primary border border-primary/30",
    headerBg: "bg-primary/15",
    iconColor: "text-primary",
    dot: "bg-primary",
    pulse: true,
  },
  completed: {
    label: "Concluídos",
    icon: CheckCircle2,
    bg: "bg-success/10 border-success/30",
    badge: "bg-success/20 text-success border border-success/30",
    headerBg: "bg-success/15",
    iconColor: "text-success",
    dot: "bg-success",
    pulse: false,
  },
};

/** Pleasant two-tone chime via Web Audio API */
function playChime() {
  try {
    const ctx = new AudioContext();
    const play = (freq: number, start: number, dur: number, vol = 0.25) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0, 0.35, 0.2);
    play(1046, 0.18, 0.4, 0.18);
    play(1318, 0.36, 0.5, 0.15);
  } catch (_) { /* silently skip */ }
}

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

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-queue`;
const POLL_INTERVAL_MS = 30_000;

export default function PublicQueueTV() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [label, setLabel] = useState("");
  const [branchName, setBranchName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [muted, setMuted] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [pendingFlash, setPendingFlash] = useState(false);

  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!token) { setError("Token ausente na URL."); setLoading(false); return; }
    try {
      const res = await fetch(`${EDGE_FUNCTION_URL}?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Erro ao carregar dados."); setLoading(false); return; }

      const appts: Appointment[] = json.appointments || [];

      // Detect new pending entries
      const currentPendingIds = new Set(
        appts.filter((a) => a.status === "pending").map((a) => a.id)
      );
      if (!isFirstFetch.current) {
        const freshIds = [...currentPendingIds].filter(
          (id) => !prevPendingIdsRef.current.has(id)
        );
        if (freshIds.length > 0) {
          if (!mutedRef.current) playChime();
          setPendingFlash(true);
          setTimeout(() => setPendingFlash(false), 1200);
          setNewIds((prev) => {
            const next = new Set(prev);
            freshIds.forEach((id) => next.add(id));
            return next;
          });
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              freshIds.forEach((id) => next.delete(id));
              return next;
            });
          }, 5000);
        }
      } else {
        isFirstFetch.current = false;
      }
      prevPendingIdsRef.current = currentPendingIds;

      setAppointments(appts);
      setLabel(json.label || "TV de Fila");
      setBranchName(json.branch_name || null);
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError("Sem conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const root = document.documentElement;
    isDark ? root.classList.add("dark") : root.classList.remove("dark");
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

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <WifiOff className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-xl font-semibold text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground/60">Verifique o link e tente novamente.</p>
        <button
          onClick={fetchData}
          className="mt-4 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes queue-enter {
          0%   { opacity: 0; transform: translateX(-24px) scale(0.97); }
          60%  { opacity: 1; transform: translateX(4px) scale(1.01); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes queue-glow {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--warning) / 0); }
          30%      { box-shadow: 0 0 0 6px hsl(var(--warning) / 0.35); }
          70%      { box-shadow: 0 0 0 3px hsl(var(--warning) / 0.15); }
        }
        @keyframes header-flash {
          0%, 100% { background-color: transparent; }
          25%      { background-color: hsl(var(--warning) / 0.35); }
          75%      { background-color: hsl(var(--warning) / 0.15); }
        }
        .queue-card-new {
          animation: queue-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) both,
                     queue-glow 1.4s ease-in-out 0.4s 3;
        }
        .pending-flash { animation: header-flash 0.6s ease-in-out 2; }
      `}</style>

      <div
        ref={containerRef}
        className="min-h-screen bg-background text-foreground flex flex-col select-none"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-border/40 bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-4">
            <img src={isDark ? logoLight : logoDark} alt="Logo" className="h-10 object-contain" />
            <div className="w-px h-10 bg-border/40" />
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight">TV de Fila</h1>
              <p className="text-sm text-muted-foreground">
                {label || "Atendimentos de hoje"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <LiveClock />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/60 hidden sm:block">
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <button
                onClick={fetchData}
                className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              {/* Mute toggle */}
              <button
                onClick={() => setMuted((m) => !m)}
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                  muted
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
                title={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Branch banner — only shown when filtered to a specific branch */}
        {branchName && (
          <div className="shrink-0 flex items-center justify-center gap-3 px-8 py-2.5 bg-primary/10 border-b border-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary tracking-wide uppercase">
              {branchName}
            </span>
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}

        {/* Columns */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <main className="flex-1 grid grid-cols-3 gap-0 divide-x divide-border/40 overflow-hidden">
            {columns.map(({ key, items }) => {
              const cfg = STATUS_CONFIG[key];
              const Icon = cfg.icon;
              const isFlashing = key === "pending" && pendingFlash;
              return (
                <section key={key} className="flex flex-col overflow-hidden">
                  <div
                    className={`flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0 ${cfg.headerBg} ${isFlashing ? "pending-flash" : ""}`}
                  >
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40 py-16">
                        <Icon className="h-12 w-12" />
                        <p className="text-sm">Nenhum agendamento</p>
                      </div>
                    ) : (
                      items.map((appt, idx) => {
                        const isNew = newIds.has(appt.id);
                        return (
                          <div
                            key={appt.id}
                            className={`rounded-2xl border p-5 flex items-center gap-4 ${cfg.bg} ${isNew ? "queue-card-new border-warning/60" : ""}`}
                          >
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 font-serif font-bold text-xl ${cfg.badge}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-xl leading-tight truncate">{appt.client_name}</p>
                                {isNew && (
                                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 animate-pulse">
                                    Novo
                                  </span>
                                )}
                              </div>
                              <p className="text-base text-muted-foreground truncate mt-0.5">{appt.service_name}</p>
                              {appt.branch_name && (
                                <p className="text-xs text-muted-foreground/60 mt-1">{appt.branch_name}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-mono font-bold tabular-nums">{appt.appointment_time}</p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <div className={`h-2 w-2 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`} />
                                <span className={`text-xs font-medium ${cfg.iconColor}`}>{cfg.label}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </main>
        )}

        {/* Footer */}
        <footer className="px-8 py-3 border-t border-border/40 bg-card/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6 text-sm text-muted-foreground/60">
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Atualização automática a cada 30s
            </span>
            <span>{appointments.length} agendamento{appointments.length !== 1 ? "s" : ""} hoje</span>
            {muted && (
              <span className="flex items-center gap-1 text-destructive/60">
                <VolumeX className="h-3.5 w-3.5" /> Som desativado
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground/40">by Dani Alves Beauty</span>
        </footer>
      </div>
    </>
  );
}
