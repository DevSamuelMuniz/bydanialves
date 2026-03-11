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
import { Clock, Filter, MapPin, Scissors, CalendarDays, BanknoteIcon, StickyNote, Timer, Star, RotateCcw, UserCircle2 } from "lucide-react";
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

export default function ClientHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

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
      .select("*, services(name, price, description, duration_minutes), branches(name, address), professional:profiles!appointments_professional_id_fkey(full_name, avatar_url)")
      .eq("client_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }

    const { data } = await query;
    setAppointments(data || []);
    setLoading(false);
  }, [user, statusFilter]);

  // Fetch already-reviewed appointment IDs
  const fetchReviewed = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("reviews")
      .select("appointment_id")
      .eq("client_id", user.id);
    setReviewedIds(new Set((data || []).map((r: any) => r.appointment_id)));
  }, [user]);

  useEffect(() => {
    fetchAppointments();
    fetchReviewed();
  }, [fetchAppointments, fetchReviewed]);

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
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {appointments.map((appt) => {
            const dateFormatted = new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const timeFormatted = appt.appointment_time?.slice(0, 5);
            const price = Number(appt.services?.price ?? 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });
            const duration = appt.services?.duration_minutes;
            const branchName = appt.branches?.name;
            const branchAddress = appt.branches?.address;
            const professionalName = (appt.profiles as any)?.full_name;
            const professionalAvatar = (appt.profiles as any)?.avatar_url;
            const serviceDescription = appt.services?.description;
            const canReview = appt.status === "completed" && !reviewedIds.has(appt.id);
            const hasReview = appt.status === "completed" && reviewedIds.has(appt.id);
            const canReschedule = appt.status === "completed" || appt.status === "cancelled";

            return (
              <div
                key={appt.id}
                className="relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-elegant hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Status top bar */}
                <div className={`h-1 w-full ${statusBarColors[appt.status]}`} />

                {/* Card body */}
                <div className="flex flex-col gap-3 p-4 flex-1">

                  {/* Service name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-semibold text-sm leading-tight line-clamp-2">
                        {appt.services?.name ?? "Serviço"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-xs shrink-0 ${statusBadgeColors[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </Badge>
                  </div>

                  <div className="border-t border-border/40" />

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{dateFormatted}</span>
                  </div>

                  {/* Time + duration */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-foreground">{timeFormatted}</span>
                    </div>
                    {duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        {duration} min
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
                      {professionalAvatar ? (
                        <img
                          src={professionalAvatar}
                          alt={professionalName}
                          className="h-5 w-5 rounded-full object-cover shrink-0 border border-border/40"
                        />
                      ) : (
                        <UserCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="text-muted-foreground text-xs truncate">{professionalName}</span>
                    </div>
                  )}

                  {/* Service description */}
                  {serviceDescription && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{serviceDescription}</p>
                  )}

                  <div className="border-t border-border/40 mt-auto" />

                  {/* Price + notes */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BanknoteIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-serif font-semibold text-foreground text-sm">{price}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {appt.notes && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2">
                      <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{appt.notes}</span>
                    </div>
                  )}
                  {canReview && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs mt-1"
                      onClick={() => openReview(appt)}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Avaliar atendimento
                    </Button>
                  )}
                  {hasReview && (
                    <div className="flex items-center justify-center gap-1 text-xs text-success mt-1">
                      <Star className="h-3 w-3 fill-success" />
                      Avaliação enviada
                    </div>
                  )}

                  {/* Reagendar button */}
                  {canReschedule && appt.service_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-xs"
                      onClick={() => navigate(`/client/booking?serviceId=${appt.service_id}`)}
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
