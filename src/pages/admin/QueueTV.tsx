import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Maximize2, Minimize2, RefreshCw, ArrowLeft, Clock, Users, CheckCircle2,
  Loader2, Share2, Copy, Check, Trash2, Plus, ExternalLink, Link2, Volume2, VolumeX,
  GitBranch,
} from "lucide-react";
import logoDark from "@/assets/logo_dark.png";
import logoLight from "@/assets/logo_light.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Appointment {
  id: string;
  appointment_time: string;
  client_name: string;
  service_name: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  branch_name: string | null;
}

interface QueueToken {
  id: string;
  token: string;
  label: string;
  active: boolean;
  created_at: string;
  branch_id: string | null;
  branch_name?: string | null;
}

interface Branch {
  id: string;
  name: string;
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

/** Pleasant two-tone chime via Web Audio API — no file needed */
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
    play(880, 0,    0.35, 0.2);   // A5
    play(1046, 0.18, 0.4, 0.18);  // C6
    play(1318, 0.36, 0.5, 0.15);  // E6
  } catch (_) { /* AudioContext blocked — silently skip */ }
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

export default function QueueTV() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [muted, setMuted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which IDs are "new" for animation/flash
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [pendingFlash, setPendingFlash] = useState(false);
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const fetchAppointments = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("appointments")
      .select(`
        id, appointment_time, status,
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

    // Detect new pending appointments
    const currentPendingIds = new Set(
      mapped.filter((a) => a.status === "pending").map((a) => a.id)
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
        // Remove glow after 5 seconds
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

  // ── Token management ──────────────────────────────────────────────────────
  const fetchTokens = useCallback(async () => {
    setTokensLoading(true);
    const { data } = await (supabase as any)
      .from("queue_tv_tokens")
      .select("id, token, label, active, created_at")
      .order("created_at", { ascending: false });
    setTokens(data || []);
    setTokensLoading(false);
  }, []);

  const createToken = async () => {
    if (!user) return;
    const label = newLabel.trim() || "Link público";
    const { error } = await (supabase as any)
      .from("queue_tv_tokens")
      .insert({ label, created_by: user.id });
    if (error) { toast.error("Erro ao criar link"); return; }
    setNewLabel("");
    toast.success("Link gerado com sucesso!");
    fetchTokens();
  };

  const revokeToken = async (id: string) => {
    const { error } = await (supabase as any)
      .from("queue_tv_tokens")
      .update({ active: false })
      .eq("id", id);
    if (error) { toast.error("Erro ao revogar link"); return; }
    toast.success("Link revogado");
    fetchTokens();
  };

  const deleteToken = async (id: string) => {
    const { error } = await (supabase as any)
      .from("queue_tv_tokens")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Link excluído");
    fetchTokens();
  };

  const buildLink = (token: string) => `${window.location.origin}/tv?token=${token}`;

  const copyLink = async (token: QueueToken) => {
    await navigator.clipboard.writeText(buildLink(token.token));
    setCopiedId(token.id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  const pending = appointments.filter((a) => a.status === "pending");
  const confirmed = appointments.filter((a) => a.status === "confirmed");
  const completed = appointments.filter((a) => a.status === "completed");
  const columns = [
    { key: "pending" as const, items: pending },
    { key: "confirmed" as const, items: confirmed },
    { key: "completed" as const, items: completed },
  ];

  return (
    <>
      {/* Global entrance animation style */}
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
        .pending-flash {
          animation: header-flash 0.6s ease-in-out 2;
        }
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
              <p className="text-sm text-muted-foreground">Atendimentos de hoje</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <LiveClock />
            <div className="flex items-center gap-2">
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
                className="h-9 px-3 rounded-lg flex items-center gap-1.5 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground text-xs"
              >
                {isDark ? "☀️ Claro" : "🌙 Escuro"}
              </button>
              <button
                onClick={() => { setShareOpen(true); fetchTokens(); }}
                className="h-9 px-3 rounded-lg flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-medium"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
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
                  {/* Column header — flashes on new pending entry */}
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

                  {/* Cards */}
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
                            className={`rounded-2xl border p-5 flex items-center gap-4 transition-all ${cfg.bg} ${
                              isNew ? "queue-card-new border-warning/60" : ""
                            }`}
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
                              <div className={`flex items-center justify-end gap-1 mt-1`}>
                                <div className={`h-2 w-2 rounded-full ${cfg.dot} ${key === "confirmed" ? "animate-pulse" : ""}`} />
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
              Atualização em tempo real
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

      {/* ── Share Sheet ── */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Links Públicos</SheetTitle>
                <SheetDescription>
                  Compartilhe a TV de Fila sem exigir login de administrador.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Gerar novo link</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do link (ex: Recepção, Filial Norte)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createToken()}
                  className="flex-1 text-sm"
                />
                <Button onClick={createToken} size="sm" className="shrink-0 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/70">
                Cada link acessa a TV de Fila de forma independente e pode ser revogado a qualquer momento.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Links gerados</p>
              {tokensLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Link2 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Nenhum link gerado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-xl border p-4 space-y-3 ${t.active ? "border-border/60 bg-card" : "border-border/30 bg-muted/30 opacity-60"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${t.active ? "bg-success" : "bg-muted-foreground/40"}`} />
                          <p className="font-medium text-sm truncate">{t.label}</p>
                          {!t.active && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">Revogado</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.active && (
                            <>
                              <button
                                onClick={() => window.open(buildLink(t.token), "_blank")}
                                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => copyLink(t)}
                                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => revokeToken(t.id)}
                                className="h-7 px-2 rounded-lg flex items-center gap-1 hover:bg-warning/10 transition-colors text-muted-foreground hover:text-warning text-xs"
                              >
                                Revogar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteToken(t.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {t.active && (
                        <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground font-mono truncate flex-1">
                            {buildLink(t.token)}
                          </p>
                          <button
                            onClick={() => copyLink(t)}
                            className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                          >
                            {copiedId === t.id ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
