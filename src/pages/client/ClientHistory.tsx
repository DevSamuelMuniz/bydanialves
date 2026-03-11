import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Clock, Filter, MapPin, Scissors, CalendarDays, BanknoteIcon,
  StickyNote, Timer, Star, RotateCcw, UserCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusBarColors: Record<string, string> = {
  pending: "bg-warning",
  confirmed: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-destructive",
};

const statusBadgeColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="transition-transform hover:scale-110"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              star <= (hovered || value)
                ? "fill-primary text-primary"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function parseEscovasFromIncludes(includes: string): number {
  const match = includes.match(/(\d+)\s*escova/i);
  return match ? parseInt(match[1], 10) : 0;
}

/** Group key: same date + time + professional + branch = same booking session */
function groupKey(appt: any): string {
  return [
    appt.appointment_date,
    appt.appointment_time,
    appt.professional_id ?? "none",
    appt.branch_id ?? "none",
  ].join("|");
}

interface BookingGroup {
  key: string;
  appointments: any[];
  /** First appointment drives the card-level metadata */
  status: string;
  appointment_date: string;
  appointment_time: string;
  branch: any;
  professional: any;
  notes: string | null;
  totalDuration: number;
  totalPrice: number;
  hasFree: boolean;
  /** IDs of appointments that can be reviewed */
  reviewableIds: string[];
  /** IDs already reviewed */
  reviewedIdsInGroup: string[];
}

export default function ClientHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [escovasDisponiveis, setEscovasDisponiveis] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAppt, setReviewAppt] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select(
        "*, services(name, price, description, duration_minutes, is_system), branches(name, address), professional:profiles!appointments_professional_id_fkey(full_name)"
      )
      .eq("client_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }

    const { data } = await query;
    setRawAppointments(data || []);
    setLoading(false);
  }, [user, statusFilter]);

  const fetchReviewed = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("reviews")
      .select("appointment_id")
      .eq("client_id", user.id);
    setReviewedIds(new Set((data || []).map((r: any) => r.appointment_id)));
  }, [user]);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("client_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (sub && (sub as any).plans) {
      const totalEscovas = parseEscovasFromIncludes((sub as any).plans.includes);
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;
      const { data: appts } = await supabase
        .from("appointments")
        .select("*, services(is_system)")
        .eq("client_id", user.id)
        .gte("appointment_date", startOfMonth)
        .lte("appointment_date", endStr)
        .neq("status", "cancelled");
      const escovasUsadas = (appts || []).filter((a: any) => a.services?.is_system === true).length;
      setEscovasDisponiveis(Math.max(0, totalEscovas - escovasUsadas));
    } else {
      setEscovasDisponiveis(0);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
    fetchReviewed();
    fetchSubscription();
  }, [fetchAppointments, fetchReviewed, fetchSubscription]);

  // Group raw appointments into booking sessions
  const groups: BookingGroup[] = (() => {
    const map = new Map<string, any[]>();
    rawAppointments.forEach((a) => {
      const k = groupKey(a);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    });

    return Array.from(map.entries()).map(([key, appts]) => {
      const first = appts[0];
      const totalDuration = appts.reduce((s, a) => s + (a.services?.duration_minutes ?? 0), 0);
      const totalPrice = appts.reduce((s, a) => {
        const isFree = a.services?.is_system && escovasDisponiveis > 0;
        return s + (isFree ? 0 : Number(a.services?.price ?? 0));
      }, 0);
      const hasFree = appts.some((a) => a.services?.is_system && escovasDisponiveis > 0);
      const reviewableIds = appts
        .filter((a) => a.status === "completed" && !reviewedIds.has(a.id))
        .map((a) => a.id);
      const reviewedIdsInGroup = appts
        .filter((a) => a.status === "completed" && reviewedIds.has(a.id))
        .map((a) => a.id);

      return {
        key,
        appointments: appts,
        status: first.status,
        appointment_date: first.appointment_date,
        appointment_time: first.appointment_time,
        branch: first.branches,
        professional: first.professional,
        notes: first.notes,
        totalDuration,
        totalPrice,
        hasFree,
        reviewableIds,
        reviewedIdsInGroup,
      } as BookingGroup;
    });
  })();

  const toggleExpand = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openReview = (appt: any) => {
    setReviewAppt(appt);
    setReviewRating(0);
    setReviewComment("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!user || !reviewAppt || reviewRating === 0) {
      toast.error("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("reviews").insert({
      appointment_id: reviewAppt.id,
      client_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar avaliação.");
    } else {
      toast.success("Avaliação enviada! Obrigada 💖");
      setReviewedIds((prev) => new Set([...prev, reviewAppt.id]));
      setReviewOpen(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="font-serif text-2xl">Histórico</h1>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map((group) => {
            const dateFormatted = new Date(group.appointment_date + "T00:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const timeFormatted = group.appointment_time?.slice(0, 5);
            const branchName = group.branch?.name;
            const branchAddress = group.branch?.address;
            const professionalName = (group.professional as any)?.full_name;
            const isExpanded = expandedGroups.has(group.key);
            const multiService = group.appointments.length > 1;
            const canReschedule = group.status === "completed" || group.status === "cancelled";

            // Label for services header
            const servicesLabel = multiService
              ? `${group.appointments.length} serviços`
              : group.appointments[0]?.services?.name ?? "Serviço";

            return (
              <div
                key={group.key}
                className="relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-elegant hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Status top bar */}
                <div className={`h-1 w-full ${statusBarColors[group.status]}`} />

                {/* Card body */}
                <div className="flex flex-col gap-3 p-4 flex-1">

                  {/* Service name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{servicesLabel}</p>
                    </div>
                    <Badge variant="secondary" className={`text-xs shrink-0 ${statusBadgeColors[group.status]}`}>
                      {statusLabels[group.status]}
                    </Badge>
                  </div>

                  {/* Services dropdown */}
                  {multiService && (
                    <div>
                      <button
                        onClick={() => toggleExpand(group.key)}
                        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/40 hover:bg-muted/70 rounded-lg px-3 py-2"
                      >
                        <span>Ver serviços</span>
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />
                        }
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 space-y-1.5 border border-border/50 rounded-lg p-2.5 bg-muted/20">
                          {group.appointments.map((appt) => {
                            const isFree = appt.services?.is_system && escovasDisponiveis > 0;
                            return (
                              <div key={appt.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Scissors className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs text-foreground truncate">{appt.services?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-muted-foreground">{appt.services?.duration_minutes}min</span>
                                  {isFree ? (
                                    <span className="text-xs font-semibold text-primary">Grátis</span>
                                  ) : (
                                    <span className="text-xs font-semibold">
                                      R$ {Number(appt.services?.price ?? 0).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-border/40" />

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{dateFormatted}</span>
                  </div>

                  {/* Time + total duration */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-foreground">{timeFormatted}</span>
                    </div>
                    {group.totalDuration > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        {group.totalDuration} min
                      </div>
                    )}
                  </div>

                  {/* Branch */}
                  {branchName && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground leading-tight truncate">{branchName}</p>
                        {branchAddress && (
                          <p className="text-xs text-muted-foreground leading-tight line-clamp-1">{branchAddress}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Professional */}
                  {professionalName && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground text-xs truncate">{professionalName}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {group.notes && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2">
                      <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{group.notes}</span>
                    </div>
                  )}

                  <div className="border-t border-border/40 mt-auto" />

                  {/* Total price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BanknoteIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-serif font-semibold text-foreground text-sm">
                        {group.totalPrice === 0 && group.hasFree
                          ? <span className="text-primary">Grátis</span>
                          : `R$ ${group.totalPrice.toFixed(2)}`
                        }
                      </span>
                    </div>
                    {group.hasFree && group.totalPrice > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        Incluso no plano
                      </Badge>
                    )}
                  </div>

                  {/* Review buttons — one per reviewable appointment in group */}
                  {group.reviewableIds.length > 0 && (
                    <div className="space-y-1.5">
                      {group.appointments
                        .filter((a) => a.status === "completed" && !reviewedIds.has(a.id))
                        .map((a) => (
                          <Button
                            key={a.id}
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs"
                            onClick={() => openReview(a)}
                          >
                            <Star className="h-3.5 w-3.5" />
                            Avaliar: {a.services?.name}
                          </Button>
                        ))}
                    </div>
                  )}
                  {group.reviewedIdsInGroup.length > 0 && group.reviewableIds.length === 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs text-success">
                      <Star className="h-3 w-3 fill-success" />
                      Avaliação enviada
                    </div>
                  )}

                  {/* Reagendar */}
                  {canReschedule && group.appointments[0]?.service_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-xs"
                      onClick={() => navigate(`/client/booking?serviceId=${group.appointments[0].service_id}`)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reagendar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Avaliar atendimento</DialogTitle>
            <DialogDescription>
              Como foi seu atendimento de <strong>{reviewAppt?.services?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Selecione uma nota</p>
              <StarRating value={reviewRating} onChange={setReviewRating} />
              {reviewRating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {["", "Péssimo 😞", "Ruim 😐", "Regular 🙂", "Bom 😊", "Excelente 🤩"][reviewRating]}
                </p>
              )}
            </div>

            <Textarea
              placeholder="Deixe um comentário (opcional)..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitReview} disabled={submitting || reviewRating === 0}>
              {submitting ? "Enviando..." : "Enviar avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
