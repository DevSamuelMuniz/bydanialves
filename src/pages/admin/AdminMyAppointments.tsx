import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Clock, DollarSign, User, Scissors, CheckCircle2, XCircle,
  CalendarIcon, RotateCcw, Plus, Search, CalendarDays, ListChecks,
  ChevronDown, ChevronUp, PlayCircle, LockKeyhole, UnlockKeyhole, CalendarOff,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Constants ───────────────────────────────────────────────────────────────

function generateSlots(start = 8, end = 17): string[] {
  const slots: string[] = [];
  for (let h = start; h <= end; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

const ALL_SLOTS = generateSlots();

const PAYMENT_OPTIONS = [
  { value: "cash",        label: "💵 Dinheiro" },
  { value: "pix",         label: "📱 PIX" },
  { value: "credit_card", label: "💳 Cartão de Crédito" },
  { value: "debit_card",  label: "💳 Cartão de Débito" },
  { value: "other",       label: "Outro" },
];

const STATUS_STYLE: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending:   { label: "Pendente",   bg: "bg-amber-400/20",  border: "border-l-amber-400",  text: "text-amber-700 dark:text-amber-300" },
  confirmed: { label: "Confirmado", bg: "bg-primary/15",    border: "border-l-primary",    text: "text-primary" },
  completed: { label: "Concluído",  bg: "bg-green-500/15",  border: "border-l-green-500",  text: "text-green-700 dark:text-green-400" },
  cancelled: { label: "Cancelado",  bg: "bg-destructive/10",border: "border-l-destructive",text: "text-destructive" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminMyAppointments() {
  const { user, adminLevel, adminBranchId } = useAuth();
  const { toast } = useToast();
  const isAttendant = adminLevel === "attendant";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Professionals list (for attendant grid view)
  const [professionals, setProfessionals] = useState<{ user_id: string; full_name: string; avatar_url: string | null }[]>([]);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // History toggle (non-attendant view)
  const [historyOpen, setHistoryOpen] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [onlyCancelled, setOnlyCancelled] = useState(false);
  const [hasInitializedCancelled, setHasInitializedCancelled] = useState(false);

  // Initialize showCancelled for non-attendants
  useEffect(() => {
    if (adminLevel && !hasInitializedCancelled) {
      if (adminLevel !== "attendant") {
        setShowCancelled(true);
      }
      setHasInitializedCancelled(true);
    }
  }, [adminLevel, hasInitializedCancelled]);

  // Complete modal
  const [completeTarget, setCompleteTarget] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [completing, setCompleting] = useState(false);

  // Manual booking dialog
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    client_id: "", service_id: "", branch_id: "", date: undefined as Date | undefined, time: "", notes: "", professional_id: "",
  });
  const [allClients, setAllClients] = useState<{ user_id: string; full_name: string; phone: string | null }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; price: number; duration_minutes: number }[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  // Appointment detail popover
  const [detailAppt, setDetailAppt] = useState<any | null>(null);

  // Block day/slot modal
  const [blockTarget, setBlockTarget] = useState<{ user_id: string; full_name: string; avatar_url: string | null } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blockMode, setBlockMode] = useState<"day" | "slots">("day");
  const [selectedBlockSlots, setSelectedBlockSlots] = useState<string[]>([]);
  const [dayBlocks, setDayBlocks] = useState<Record<string, { isFullDay: boolean; blockedSlots: string[] }>>({}); // professional_id -> block info

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchDayBlocks = useCallback(async (dateStr: string) => {
    const { data } = await (supabase as any)
      .from("professional_day_blocks")
      .select("professional_id, reason")
      .eq("blocked_date", dateStr);
    const map: Record<string, { isFullDay: boolean; blockedSlots: string[] }> = {};
    (data || []).forEach((b: any) => {
      const pid = b.professional_id;
      if (!map[pid]) map[pid] = { isFullDay: false, blockedSlots: [] };
      const reason: string = b.reason || "";
      
      if (reason.startsWith("SLOTS:")) {
        // New format: SLOTS:HH:MM,HH:MM|reason
        const slotsPart = reason.split("|")[0].replace("SLOTS:", "");
        const times = slotsPart.split(",").filter(Boolean);
        map[pid].blockedSlots.push(...times);
      } else if (reason.startsWith("SLOT:")) {
        // Old/Fallback format
        const slotTime = reason.split("|")[0].replace("SLOT:", "");
        map[pid].blockedSlots.push(slotTime);
      } else {
        map[pid].isFullDay = true;
      }
    });
    setDayBlocks(map);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Attendant: fetch ALL appointments for that day/branch + all professionals
    if (isAttendant) {
      let q = (supabase as any)
        .from("appointments")
        .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone, avatar_url)")
        .eq("appointment_date", dateStr)
        .order("appointment_time", { ascending: true });
      if (adminBranchId) q = q.eq("branch_id", adminBranchId);

      // Fetch only professionals (admin_level = "professional") scoped to attendant's branch
      let rolesQ = supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .eq("admin_level", "professional");
      if (adminBranchId) rolesQ = (rolesQ as any).eq("branch_id", adminBranchId);

      const [apptResult, rolesResult] = await Promise.all([q, rolesQ]);
      setAppointments(apptResult.data || []);

      const profIds = (rolesResult.data ?? []).map((r: any) => r.user_id);
      if (profIds.length > 0) {
        const { data: profProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", profIds)
          .order("full_name");
        setProfessionals(profProfiles || []);
      } else {
        setProfessionals([]);
      }

      await fetchDayBlocks(dateStr);
    } else {
      // Professional: only own appointments
      let q = (supabase as any)
        .from("appointments")
        .select("*, services(name, price, duration_minutes), profiles!appointments_client_profile_fkey(full_name, phone, avatar_url)")
        .eq("professional_id", user.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
      if (adminBranchId) q = q.eq("branch_id", adminBranchId);
      const { data: appts } = await q;
      setAppointments(appts || []);
    }

    setLoading(false);
  }, [user, selectedDate, isAttendant, adminBranchId, fetchDayBlocks]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("my-appointments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "professional_day_blocks" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // ─── Booking helpers ─────────────────────────────────────────────────────────

  const loadBookingData = async () => {
    if (allClients.length === 0) {
      const { data: clients } = await supabase.from("profiles").select("user_id, full_name, phone").order("full_name");
      setAllClients(clients || []);
    }
    if (services.length === 0) {
      const { data: svcs } = await supabase.from("services").select("id, name, price, duration_minutes").eq("active", true).order("name");
      setServices(svcs || []);
    }
  };

  const openBookingDialog = async (prefillProfId?: string) => {
    setBookingForm({
      client_id: "", service_id: "", branch_id: adminBranchId ?? "",
      date: selectedDate, time: "", notes: "",
      professional_id: prefillProfId ?? "",
    });
    setClientSearch("");
    setBookingOpen(true);
    await loadBookingData();
  };

  const handleManualBooking = async () => {
    const { client_id, service_id, branch_id, date, time, professional_id } = bookingForm;
    if (!client_id || !service_id || !date || !time) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setBookingLoading(true);
    const { error } = await supabase.from("appointments").insert({
      client_id,
      service_id,
      professional_id: professional_id || null,
      branch_id: branch_id || null,
      appointment_date: format(date, "yyyy-MM-dd"),
      appointment_time: time + ":00",
      status: "confirmed",
      notes: bookingForm.notes || null,
    } as any);
    setBookingLoading(false);
    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Agendamento criado!", description: "Serviço agendado manualmente com sucesso." });
      setBookingOpen(false);
      fetchData();
    }
  };

  const filteredClients = allClients.filter((c) =>
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(clientSearch))
  );

  // ─── Complete modal ──────────────────────────────────────────────────────────

  const openCompleteModal = (appt: any) => {
    setCompleteTarget(appt);
    setPaymentMethod("cash");
    setDetailAppt(null);
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    setCompleting(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", completeTarget.id);
    if (error) {
      toast({ title: "Erro ao concluir", description: error.message, variant: "destructive" });
      setCompleting(false);
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    await supabase
      .from("financial_records")
      .update({ payment_method: paymentMethod })
      .eq("appointment_id", completeTarget.id);
    const label = PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
    toast({ title: "✅ Atendimento concluído!", description: `Pagamento: ${label}` });
    setCompleteTarget(null);
    setCompleting(false);
    fetchData();
  };

  const markCancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Atendimento cancelado." }); fetchData(); }
  };
  // ─── Block/Unblock helpers ───────────────────────────────────────────────────

  const handleBlockDay = async () => {
    if (!blockTarget || !user) return;
    setBlocking(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (blockMode === "day") {
      // Full day block — single row
      const { error } = await (supabase as any)
        .from("professional_day_blocks")
        .insert({
          professional_id: blockTarget.user_id,
          blocked_date: dateStr,
          blocked_by: user.id,
          reason: blockReason || null,
        });
      setBlocking(false);
      if (error) {
        toast({ title: "Erro ao bloquear agenda", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "🔒 Agenda bloqueada!", description: `${blockTarget.full_name} não receberá novos agendamentos hoje.` });
        setBlockTarget(null);
        setBlockReason("");
        setBlockMode("day");
        setSelectedBlockSlots([]);
        fetchData();
      }
    } else {
      // Slot-level blocks — single row for all slots to avoid unique constraint error
      if (selectedBlockSlots.length === 0) {
        toast({ title: "Selecione ao menos um horário", variant: "destructive" });
        setBlocking(true); // reset state
        setBlocking(false);
        return;
      }
      
      const slotsString = selectedBlockSlots.sort().join(",");
      const { error } = await (supabase as any)
        .from("professional_day_blocks")
        .insert({
          professional_id: blockTarget.user_id,
          blocked_date: dateStr,
          blocked_by: user.id,
          reason: `SLOTS:${slotsString}${blockReason ? "|" + blockReason : ""}`,
        });
        
      setBlocking(false);
      if (error) {
        toast({ title: "Erro ao bloquear horários", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "🔒 Horários bloqueados!", description: `${selectedBlockSlots.length} horário(s) bloqueado(s) para ${blockTarget.full_name}.` });
        setBlockTarget(null);
        setBlockReason("");
        setBlockMode("day");
        setSelectedBlockSlots([]);
        fetchData();
      }
    }
  };

  const handleUnblockDay = async (professionalId: string, profName: string) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { error } = await (supabase as any)
      .from("professional_day_blocks")
      .delete()
      .eq("professional_id", professionalId)
      .eq("blocked_date", dateStr);
    if (error) {
      toast({ title: "Erro ao desbloquear", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🔓 Agenda desbloqueada!", description: `${profName} voltará a receber agendamentos.` });
      fetchData();
    }
  };

  // ─── Computed ───────────────────────────────────────────────────────────────

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  // For attendant: build map [slot][professional_id] => appointment[]
  const slotMap = useMemo(() => {
    const m: Record<string, Record<string, any[]>> = {};
    ALL_SLOTS.forEach((slot) => { m[slot] = {}; });
    appointments.forEach((a) => {
      if (onlyCancelled) {
        if (a.status !== "cancelled") return;
      } else if (a.status === "cancelled" && !showCancelled) {
        return;
      }
      const slot = a.appointment_time?.slice(0, 5);
      if (!slot || !m[slot]) return;
      const pid = a.professional_id ?? "__none__";
      if (!m[slot][pid]) m[slot][pid] = [];
      m[slot][pid].push(a);
    });
    return m;
  }, [appointments, showCancelled, onlyCancelled]);

  // For professional view (non-attendant)
  const confirmed = useMemo(() =>
    appointments.filter((a) => ["pending", "confirmed"].includes(a.status) &&
      format(new Date(a.appointment_date + "T00:00:00"), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")),
  [appointments, selectedDate]);

  const history = useMemo(() =>
    appointments.filter((a) => {
      const matchDate = format(new Date(a.appointment_date + "T00:00:00"), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
      if (!matchDate) return false;
      if (onlyCancelled) return a.status === "cancelled";
      return (a.status === "completed" || (a.status === "cancelled" && showCancelled));
    }),
  [appointments, selectedDate, showCancelled, onlyCancelled]);

  // Professionals that actually have at least one appointment OR all if small list
  const visibleProfessionals = useMemo(() => {
    if (professionals.length === 0) return [];
    return professionals;
  }, [professionals]);

  // ─── Sub-components ──────────────────────────────────────────────────────────

  // Tiny appointment chip inside the grid cell
  const ApptChip = ({ a }: { a: any }) => {
    const st = STATUS_STYLE[a.status] || STATUS_STYLE.pending;
    return (
      <button
        className={cn(
          "w-full text-left rounded-md border-l-2 px-2 py-1.5 text-xs transition-all hover:opacity-90 hover:scale-[1.01]",
          st.bg, st.border
        )}
        onClick={() => setDetailAppt(a)}
      >
        <p className={cn("font-semibold truncate leading-tight", st.text)}>
          {a.profiles?.full_name || "Cliente"}
        </p>
        <p className="text-muted-foreground truncate">{a.services?.name || "—"}</p>
      </button>
    );
  };

  // Professional column header
  const ProfHeader = ({ prof }: { prof: { user_id: string; full_name: string; avatar_url: string | null } }) => {
    const initials = prof.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    const apptCount = appointments.filter((a) => a.professional_id === prof.user_id).length;
    const blockInfo = dayBlocks[prof.user_id];
    const isFullDayBlocked = blockInfo?.isFullDay ?? false;
    const hasSlotBlocks = (blockInfo?.blockedSlots?.length ?? 0) > 0;
    const isBlocked = isFullDayBlocked || hasSlotBlocks;
    return (
      <button
        className={cn(
          "flex flex-col items-center gap-1 py-2 px-1 min-w-[120px] w-full transition-all rounded-md group",
          isFullDayBlocked
            ? "bg-destructive/8 hover:bg-destructive/15"
            : hasSlotBlocks
              ? "bg-destructive/5 hover:bg-destructive/10"
              : "hover:bg-muted/60"
        )}
        title={isBlocked ? `Desbloquear agenda de ${prof.full_name}` : `Fechar agenda de ${prof.full_name} hoje`}
        onClick={() => {
          if (isBlocked) {
            handleUnblockDay(prof.user_id, prof.full_name);
          } else {
            setBlockTarget(prof);
            setBlockReason("");
            setBlockMode("day");
            setSelectedBlockSlots([]);
          }
        }}
      >
        <div className="relative">
          <Avatar className={cn("w-10 h-10 border-2", isFullDayBlocked ? "border-destructive/50 opacity-60" : hasSlotBlocks ? "border-destructive/30" : "border-border")}>
            <AvatarImage src={prof.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          {isFullDayBlocked && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
              <LockKeyhole className="w-2.5 h-2.5 text-destructive-foreground" />
            </div>
          )}
          {!isFullDayBlocked && hasSlotBlocks && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center">
              <CalendarOff className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <p className={cn("text-xs font-semibold text-center leading-tight line-clamp-2", isFullDayBlocked && "text-muted-foreground line-through")}>{prof.full_name}</p>
        {isFullDayBlocked ? (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
            <LockKeyhole className="w-2 h-2" /> Bloqueado
          </Badge>
        ) : hasSlotBlocks ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 border-destructive/40 text-destructive/80">
            <CalendarOff className="w-2 h-2" /> {blockInfo!.blockedSlots.length} horário(s)
          </Badge>
        ) : apptCount > 0 ? (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{apptCount}</Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <LockKeyhole className="w-2.5 h-2.5" /> Bloquear
          </span>
        )}
      </button>
    );
  };

  // Non-attendant appointment card
  const AppointmentCard = ({ a, showActions }: { a: any; showActions: boolean }) => {
    const st = STATUS_STYLE[a.status] || STATUS_STYLE.pending;
    return (
      <div className={cn("rounded-lg border-l-2 border border-border p-3 space-y-2", st.bg, st.border)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{a.profiles?.full_name || "Cliente"}</p>
              {a.profiles?.phone && <p className="text-xs text-muted-foreground">📱 {a.profiles.phone}</p>}
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0", st.text)}>{st.label}</Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5"><Scissors className="h-3 w-3" /><span className="font-medium text-foreground">{a.services?.name || "—"}</span></div>
          <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /><span>{`${new Date(a.appointment_date + "T00:00:00").toLocaleDateString("pt-BR")} às ${a.appointment_time?.slice(0, 5)}`}</span></div>
          <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /><span className="font-medium text-foreground">R$ {Number(a.services?.price || 0).toFixed(2)}</span></div>
        </div>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 h-full flex flex-col">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-serif text-2xl">
            {isAttendant ? "Atendimentos" : "Meus Atendimentos"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAttendant
              ? `${format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
              : "Seus agendamentos"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAttendant && (
            <Button size="sm" className="gap-2" onClick={() => openBookingDialog()}>
              <Plus className="h-4 w-4" />
              Agendar
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-48 justify-start text-left font-normal gap-2 transition-all hover:bg-muted/60",
                  isToday && "border-primary/40 text-primary bg-primary/5"
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {isToday ? "Hoje" : format(selectedDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center space-x-2 border rounded-md px-3 h-9 border-input bg-card shadow-sm transition-all hover:bg-muted/20">
            <Checkbox
              id="show-cancelled-my"
              checked={showCancelled}
              onCheckedChange={(checked) => setShowCancelled(checked as boolean)}
            />
            <Label htmlFor="show-cancelled-my" className="text-xs font-medium cursor-pointer select-none">
              Ver cancelados
            </Label>
          </div>

          <div className="flex items-center space-x-2 border rounded-md px-3 h-9 border-input bg-card shadow-sm transition-all hover:bg-muted/20">
            <Checkbox
              id="only-cancelled-my"
              checked={onlyCancelled}
              onCheckedChange={(checked) => {
                setOnlyCancelled(checked as boolean);
                if (checked) setShowCancelled(true);
              }}
            />
            <Label htmlFor="only-cancelled-my" className="text-xs font-medium cursor-pointer select-none text-destructive">
              Apenas cancelados
            </Label>
          </div>

          {!isToday && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedDate(today)} title="Voltar para hoje">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── ATTENDANT: Grid View ─────────────────────────────────────────────── */}
      {isAttendant && (
        loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
            {visibleProfessionals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-2">
                <User className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum profissional encontrado para esta filial.</p>
              </div>
            ) : (
              <table className="w-full border-collapse" style={{ minWidth: `${120 + visibleProfessionals.length * 140}px` }}>
                <thead className="sticky top-0 z-10 bg-card border-b border-border">
                  <tr>
                    {/* Time column header */}
                    <th className="w-14 border-r border-border bg-muted/40 p-2">
                      <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                    </th>
                    {visibleProfessionals.map((prof) => (
                      <th key={prof.user_id} className="border-r border-border last:border-r-0 align-top min-w-[140px]">
                        <ProfHeader prof={prof} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_SLOTS.map((slot) => {
                    const now = new Date();
                    const currentSlot = `${String(now.getHours()).padStart(2, "0")}:00`;
                    const isCurrentHour = isToday && slot === currentSlot;

                    return (
                      <tr
                        key={slot}
                        className={cn(
                          "border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors",
                          isCurrentHour && "bg-primary/5"
                        )}
                      >
                        {/* Time label */}
                        <td className={cn(
                          "w-14 border-r border-border p-2 text-center align-top sticky left-0 bg-card z-[1]",
                          isCurrentHour && "bg-primary/10"
                        )}>
                          <span className={cn(
                            "text-xs font-mono font-semibold",
                            isCurrentHour ? "text-primary" : "text-muted-foreground"
                          )}>
                            {slot}
                          </span>
                        </td>

                        {/* Professional cells */}
                        {visibleProfessionals.map((prof) => {
                          const cellAppts = slotMap[slot]?.[prof.user_id] ?? [];
                          const profBlockInfo = dayBlocks[prof.user_id];
                          const isProfFullDayBlocked = profBlockInfo?.isFullDay ?? false;
                          const isSlotBlocked = !isProfFullDayBlocked && (profBlockInfo?.blockedSlots?.includes(slot) ?? false);
                          const isAnyBlocked = isProfFullDayBlocked || isSlotBlocked;
                          return (
                            <td
                              key={prof.user_id}
                              className={cn(
                                "border-r border-border last:border-r-0 p-1.5 align-top min-h-[52px]",
                                isProfFullDayBlocked && "bg-destructive/5",
                                isSlotBlocked && "bg-destructive/5"
                              )}
                              style={{ minHeight: "52px" }}
                            >
                              {isAnyBlocked && cellAppts.length === 0 ? (
                                <div className={cn(
                                  "w-full h-10 rounded border border-dashed flex items-center justify-center border-destructive/20"
                                )}>
                                  <LockKeyhole className={cn("h-3 w-3 text-destructive/30")} />
                                </div>
                              ) : cellAppts.length > 0 ? (
                                <div className="space-y-1">
                                  {cellAppts.map((a) => <ApptChip key={a.id} a={a} />)}
                                </div>
                              ) : (
                                <button
                                  className="w-full h-10 rounded border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors opacity-0 hover:opacity-100 flex items-center justify-center"
                                  onClick={() => {
                                    openBookingDialog(prof.user_id);
                                    setBookingForm((f) => ({ ...f, time: slot, professional_id: prof.user_id }));
                                  }}
                                  title={`Agendar para ${prof.full_name} às ${slot}`}
                                >
                                  <Plus className="h-3 w-3 text-primary" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )
      )}

      {/* ── PROFESSIONAL: Card list ──────────────────────────────────────────── */}
      {!isAttendant && (
        loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <PlayCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Em Atendimento</span>
                <Badge variant="secondary" className="ml-auto text-xs">{confirmed.length}</Badge>
              </div>
              {confirmed.length === 0 ? (
                <Card className="border-dashed h-24">
                  <CardContent className="h-full flex items-center justify-center text-muted-foreground text-xs">
                    Nenhum agendamento para hoje.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {confirmed.map((a) => <AppointmentCard key={a.id} a={a} showActions />)}
                </div>
              )}
            </div>

            {/* History */}
            <div className="space-y-3">
              <button
                className="w-full flex items-center gap-2 px-1 text-left"
                onClick={() => setHistoryOpen((v) => !v)}
              >
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">Concluídos / Cancelados</span>
                <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">{history.length}</Badge>
                {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {historyOpen && (
                history.length === 0 ? (
                  <Card className="border-dashed h-24">
                    <CardContent className="h-full flex items-center justify-center text-muted-foreground text-xs">
                      Nenhum registro para hoje.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {history.map((a) => <AppointmentCard key={a.id} a={a} showActions={false} />)}
                  </div>
                )
              )}
            </div>
          </div>
        )
      )}

      {/* ── Block Day/Slots Modal ──────────────────────────────────────────────── */}
      <Dialog open={!!blockTarget} onOpenChange={(o) => { if (!o) { setBlockTarget(null); setBlockReason(""); setBlockMode("day"); setSelectedBlockSlots([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <LockKeyhole className="h-4 w-4 text-destructive" />
              Fechar Agenda
            </DialogTitle>
            <DialogDescription>
              Escolha fechar o dia inteiro ou apenas horários específicos.
            </DialogDescription>
          </DialogHeader>
          {blockTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={blockTarget.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {blockTarget.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{blockTarget.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={cn(
                    "rounded-lg border-2 p-3 text-center transition-all text-sm font-medium",
                    blockMode === "day"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                  onClick={() => setBlockMode("day")}
                >
                  <LockKeyhole className="h-5 w-5 mx-auto mb-1" />
                  Dia Inteiro
                </button>
                <button
                  className={cn(
                    "rounded-lg border-2 p-3 text-center transition-all text-sm font-medium",
                    blockMode === "slots"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                  onClick={() => setBlockMode("slots")}
                >
                  <CalendarOff className="h-5 w-5 mx-auto mb-1" />
                  Horários Específicos
                </button>
              </div>

              {/* Slot selection grid */}
              {blockMode === "slots" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Selecione os horários para fechar:</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ALL_SLOTS.map((slot) => {
                      const isSelected = selectedBlockSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            setSelectedBlockSlots((prev) =>
                              isSelected ? prev.filter((s) => s !== slot) : [...prev, slot]
                            );
                          }}
                          className={cn(
                            "rounded-lg border text-xs py-2 font-mono font-semibold transition-all",
                            isSelected
                              ? "bg-destructive text-white border-destructive shadow-sm"
                              : "border-border hover:border-destructive/60 hover:bg-destructive/5"
                          )}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {selectedBlockSlots.length > 0 && (
                    <p className="text-xs text-destructive font-medium">
                      {selectedBlockSlots.length} horário(s) selecionado(s)
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ex: Folga, treinamento, afastamento..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className={cn(
                "rounded-lg border p-3 border-destructive/30 bg-destructive/5"
              )}>
                <p className={cn(
                  "text-xs font-medium flex items-center gap-1.5 text-destructive"
                )}>
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  {blockMode === "day"
                    ? `Clientes não conseguirão fazer novos agendamentos com ${blockTarget.full_name} neste dia. Agendamentos já existentes não serão cancelados automaticamente.`
                    : `Os horários selecionados ficarão indisponíveis para novos agendamentos. Os demais horários continuam funcionando normalmente.`
                  }
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBlockTarget(null); setBlockReason(""); setBlockMode("day"); setSelectedBlockSlots([]); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleBlockDay}
              disabled={blocking || (blockMode === "slots" && selectedBlockSlots.length === 0)}
              className="gap-2"
            >
              {blockMode === "day" ? <LockKeyhole className="w-4 h-4" /> : <CalendarOff className="w-4 h-4" />}
              {blocking ? "Bloqueando..." : blockMode === "day" ? "Fechar Dia Inteiro" : `Fechar ${selectedBlockSlots.length} Horário(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Appointment Detail Modal ─────────────────────────────────────────── */}
      <Dialog open={!!detailAppt} onOpenChange={(o) => !o && setDetailAppt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>
          {detailAppt && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={detailAppt.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {detailAppt.profiles?.full_name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{detailAppt.profiles?.full_name ?? "Cliente"}</p>
                  {detailAppt.profiles?.phone && (
                    <p className="text-xs text-muted-foreground">📱 {detailAppt.profiles.phone}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn("ml-auto text-xs shrink-0", STATUS_STYLE[detailAppt.status]?.text)}
                >
                  {STATUS_STYLE[detailAppt.status]?.label}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Serviço</p>
                  <p className="font-medium">{detailAppt.services?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-medium">{detailAppt.appointment_time?.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="font-medium">{detailAppt.services?.duration_minutes ?? "—"} min</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold text-green-600">R$ {Number(detailAppt.services?.price ?? 0).toFixed(2)}</p>
                </div>
              </div>
              {["pending", "confirmed"].includes(detailAppt.status) && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => openCompleteModal(detailAppt)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10">
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar atendimento?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          onClick={() => { markCancel(detailAppt.id); setDetailAppt(null); }}
                        >
                          Confirmar Cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailAppt(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Complete Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!completeTarget} onOpenChange={(o) => !o && setCompleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Concluir Atendimento
            </DialogTitle>
          </DialogHeader>
          {completeTarget && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={completeTarget.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {completeTarget.profiles?.full_name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{completeTarget.profiles?.full_name ?? "Cliente"}</p>
                    {completeTarget.profiles?.phone && (
                      <p className="text-xs text-muted-foreground">📱 {completeTarget.profiles.phone}</p>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Serviço</p><p className="font-medium">{completeTarget.services?.name ?? "—"}</p></div>
                  <div><p className="text-muted-foreground">Horário</p><p className="font-medium">{completeTarget.appointment_time?.slice(0, 5)}</p></div>
                  <div><p className="text-muted-foreground">Duração</p><p className="font-medium">{completeTarget.services?.duration_minutes ?? "—"} min</p></div>
                </div>
                <div className="rounded-lg bg-green-600/10 border border-green-500/30 px-4 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Valor total
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {Number(completeTarget.services?.price ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  Forma de pagamento
                </label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancelar</Button>
            <Button onClick={confirmComplete} disabled={completing} className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {completing ? "Salvando..." : "Confirmar conclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Booking Dialog ─────────────────────────────────────────────── */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              Agendar Manualmente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Profissional */}
            {visibleProfessionals.length > 0 && (
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select
                  value={bookingForm.professional_id}
                  onValueChange={(v) => setBookingForm((f) => ({ ...f, professional_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar profissional (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {visibleProfessionals.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {clientSearch && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {filteredClients.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">Nenhum cliente encontrado</p>
                  ) : (
                    filteredClients.slice(0, 8).map((c) => (
                      <button
                        key={c.user_id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${bookingForm.client_id === c.user_id ? "bg-primary/10 font-semibold" : ""}`}
                        onClick={() => { setBookingForm((f) => ({ ...f, client_id: c.user_id })); setClientSearch(c.full_name); }}
                      >
                        <span>{c.full_name}</span>
                        {c.phone && <span className="text-muted-foreground text-xs ml-2">{c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
              {bookingForm.client_id && (
                <p className="text-xs text-primary font-medium">
                  ✓ {allClients.find((c) => c.user_id === bookingForm.client_id)?.full_name} selecionado(a)
                </p>
              )}
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <Label>Serviço <span className="text-destructive">*</span></Label>
              <Select value={bookingForm.service_id} onValueChange={(v) => setBookingForm((f) => ({ ...f, service_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — R$ {Number(s.price).toFixed(2)} ({s.duration_minutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {bookingForm.date ? format(bookingForm.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bookingForm.date}
                    onSelect={(d) => setBookingForm((f) => ({ ...f, date: d }))}
                    locale={ptBR}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Horário */}
            <div className="space-y-2">
              <Label>Horário <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {generateSlots().filter((slot) => {
                  if (!bookingForm.date) return true;
                  const now = new Date();
                  const d = bookingForm.date;
                  const isTodaySlot =
                    d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate();
                  if (!isTodaySlot) return true;
                  const [h] = slot.split(":").map(Number);
                  return h > now.getHours();
                }).map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setBookingForm((f) => ({ ...f, time: slot }))}
                    className={`rounded-lg border text-xs py-1.5 font-medium transition-colors ${
                      bookingForm.time === slot
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre o agendamento..."
                value={bookingForm.notes}
                onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancelar</Button>
            <Button onClick={handleManualBooking} disabled={bookingLoading} className="gap-2">
              <Plus className="h-4 w-4" />
              {bookingLoading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
