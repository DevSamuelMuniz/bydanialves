import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Check, ChevronLeft, ShieldX, MessageCircle, Building2, MapPin,
  Scissors, Clock, CalendarDays, Timer, DollarSign, Star, Sparkles,
  ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

interface Branch { id: string; name: string; address: string | null; image_url: string | null; }

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_system: boolean;
}

function parseEscovasFromIncludes(includes: string): number {
  const match = includes.match(/(\d+)\s*escova/i);
  return match ? parseInt(match[1], 10) : 0;
}

const WHATSAPP_NUMBER = "5500000000000";

const DEFAULT_BRANCH_IMAGE = "https://images.unsplash.com/photo-1582095133179-bfd08e2d6b27?w=800&q=70&auto=format&fit=crop";

function getBranchImage(branch: Branch) {
  return branch.image_url || DEFAULT_BRANCH_IMAGE;
}

// Generate available time slots based on services total duration
function generateTimeSlots(totalMinutes: number): string[] {
  const slots: string[] = [];
  const start = 8 * 60; // 08:00
  const end = 18 * 60;  // 18:00
  let t = start;
  while (t + totalMinutes <= end) {
    if (t < 12 * 60 || t >= 13 * 60) { // Lunch break 12-13
      const h = Math.floor(t / 60);
      const m = t % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    t += 30;
  }
  return slots;
}

// Check if a time slot is free given booked appointments and total duration
function isSlotAvailable(
  slot: string,
  totalMinutes: number,
  bookedRanges: { start: number; end: number }[],
  professionals: number
): boolean {
  const [h, m] = slot.split(":").map(Number);
  const slotStart = h * 60 + m;
  const slotEnd = slotStart + totalMinutes;

  const conflicts = bookedRanges.filter(
    (r) => slotStart < r.end && slotEnd > r.start
  ).length;

  return conflicts < professionals;
}

export default function NewBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedRanges, setBookedRanges] = useState<{ start: number; end: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [escovasDisponiveis, setEscovasDisponiveis] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [professionals] = useState(3); // Number of simultaneous professionals

  // Total duration of selected services
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((acc, s) => {
    const free = s.is_system && escovasDisponiveis > 0;
    return acc + (free ? 0 : Number(s.price));
  }, 0);

  const availableSlots = selectedDate
    ? generateTimeSlots(totalDuration).filter((slot) =>
        isSlotAvailable(slot, totalDuration, bookedRanges, professionals)
      )
    : [];

  useEffect(() => {
    supabase.from("branches" as any).select("id, name, address, image_url").eq("active", true).order("name")
      .then(({ data }) => setBranches((data as unknown as Branch[]) || []));
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("user_id", user.id)
        .single();

      if (profile?.blocked) {
        setBlocked(true);
        setBlockedModalOpen(true);
        setLoading(false);
        return;
      }

      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("active", true);
      setServices((servicesData as unknown as ServiceItem[]) || []);

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
        const { data: appointments } = await supabase
          .from("appointments")
          .select("*, services(name, is_system)")
          .eq("client_id", user.id)
          .gte("appointment_date", startOfMonth)
          .lte("appointment_date", endStr)
          .neq("status", "cancelled");
        const escovasUsadas = (appointments || []).filter((a: any) => a.services?.is_system === true).length;
        setEscovasDisponiveis(Math.max(0, totalEscovas - escovasUsadas));
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (!selectedDate || !selectedBranch) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    supabase
      .from("appointments")
      .select("appointment_time, services(duration_minutes)")
      .eq("appointment_date", dateStr)
      .eq("branch_id", selectedBranch.id)
      .neq("status", "cancelled")
      .then(({ data }) => {
        const ranges = (data || []).map((a: any) => {
          const [h, m] = (a.appointment_time || "00:00").slice(0, 5).split(":").map(Number);
          const start = h * 60 + m;
          const dur = a.services?.duration_minutes || 60;
          return { start, end: start + dur };
        });
        setBookedRanges(ranges);
      });
  }, [selectedDate, selectedBranch]);

  const toggleService = (s: ServiceItem) => {
    setSelectedServices((prev) => {
      const exists = prev.find((x) => x.id === s.id);
      if (exists) return prev.filter((x) => x.id !== s.id);
      return [...prev, s];
    });
  };

  const handleConfirm = async () => {
    if (!user || selectedServices.length === 0 || !selectedDate || !selectedTime) return;
    setSubmitting(true);

    const dateStr = selectedDate.toISOString().split("T")[0];
    const errors: string[] = [];

    for (const service of selectedServices) {
      const { error } = await supabase.from("appointments").insert({
        client_id: user.id,
        service_id: service.id,
        appointment_date: dateStr,
        appointment_time: selectedTime + ":00",
        status: "pending",
        branch_id: selectedBranch?.id || null,
      } as any);
      if (error) errors.push(error.message);
    }

    if (errors.length) {
      toast({ title: "Erro ao agendar", description: errors[0], variant: "destructive" });
    } else {
      toast({ title: "Agendamento realizado! ✨", description: "Seus horários foram reservados com sucesso." });
      setStep(1);
      setSelectedServices([]);
      setSelectedDate(undefined);
      setSelectedTime(null);
      setSelectedBranch(null);
    }
    setSubmitting(false);
  };

  const handleWhatsAppQuestion = () => {
    const message = encodeURIComponent(
      "Olá! Minha conta foi bloqueada e gostaria de entender o motivo. Poderia me ajudar a resolver essa situação?"
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );

  if (blocked) {
    return (
      <div className="w-full space-y-6">
        <h1 className="font-serif text-2xl tracking-tight">Novo Agendamento</h1>
        <Card className="border-destructive/20">
          <CardContent className="py-10 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldX className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-lg font-serif font-medium">Conta bloqueada</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Sua conta está temporariamente bloqueada e não é possível realizar novos agendamentos.
            </p>
            <Button onClick={handleWhatsAppQuestion} className="bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="mr-2 h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </CardContent>
        </Card>
        <Dialog open={blockedModalOpen} onOpenChange={setBlockedModalOpen}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader className="items-center">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="font-serif text-xl">Conta Bloqueada</DialogTitle>
              <DialogDescription className="text-base">
                Sua conta foi bloqueada. Entre em contato para mais informações.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleWhatsAppQuestion} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="mr-2 h-4 w-4" />
                Questionar via WhatsApp
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setBlockedModalOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Step labels
  const STEP_LABELS = ["Filial", "Serviços", "Data", "Horário", "Confirmação"];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="rounded-full h-9 w-9 border border-border/60">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Novo Agendamento</h1>
          <p className="text-sm text-muted-foreground">{STEP_LABELS[step - 1]}</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${s <= step ? "bg-primary" : "bg-muted"}`} />
          </div>
        ))}
      </div>

      {/* ── STEP 1: Filiais ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Selecione a unidade onde deseja ser atendido</p>
          {branches.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma filial disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => { setSelectedBranch(b); setStep(2); }}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 flex flex-col
                    ${selectedBranch?.id === b.id ? "border-primary shadow-elevated" : "border-border/50 hover:border-primary/50 hover:shadow-elegant"}`}
                >
                  {/* Branch image 16:9 */}
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <img
                      src={getBranchImage(b)}
                      alt={b.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {selectedBranch?.id === b.id && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Branch info */}
                  <div className="p-2.5 flex flex-col gap-1 bg-card flex-1">
                    <p className="font-semibold text-sm leading-tight">{b.name}</p>
                    {b.address ? (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                        <span className="line-clamp-1">{b.address}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Endereço não informado</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Serviços (múltipla seleção) ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Selecione um ou mais serviços</p>
            {selectedServices.length > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {selectedServices.length} selecionado{selectedServices.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {services.map((s) => {
              const free = s.is_system && escovasDisponiveis > 0;
              const isSelected = selectedServices.some((x) => x.id === s.id);
              const imgUrl = s.image_url ||
                `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=60&auto=format&fit=crop`;
              return (
                <div
                  key={s.id}
                  onClick={() => toggleService(s)}
                  className={`relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 border-2
                    ${isSelected ? "border-primary shadow-elevated" : "border-transparent hover:border-primary/40"}`}
                >
                  {/* 16:9 image */}
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <img src={imgUrl} alt={s.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    {free && (
                      <div className="absolute top-1.5 left-1.5">
                        <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] px-1.5 py-0">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> Incluso
                        </Badge>
                      </div>
                    )}
                  </div>
                  {/* Info below image */}
                  <div className="p-2 bg-card">
                    <p className="font-semibold text-sm leading-tight">{s.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Timer className="h-3 w-3" /> {s.duration_minutes}min
                      </span>
                      {free ? (
                        <p className="font-serif font-bold text-primary text-lg tracking-tight">Grátis</p>
                      ) : (
                        <p className="font-serif font-bold text-primary text-lg tracking-tight">R$ {Number(s.price).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {services.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">Nenhum serviço disponível no momento.</p>
          )}

          {selectedServices.length > 0 && (
            <div className="sticky bottom-4 z-10">
              <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-elevated flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{selectedServices.length} serviço{selectedServices.length > 1 ? "s" : ""} • {totalDuration} min</p>
                  <p className="text-xs text-muted-foreground">Total: R$ {totalPrice.toFixed(2)}</p>
                </div>
                <Button onClick={() => setStep(3)} className="rounded-xl px-6">
                  Continuar <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Calendário ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-secondary/60 rounded-xl">
            <Timer className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm">
              <span className="font-medium">{selectedServices.length} serviço{selectedServices.length > 1 ? "s" : ""}</span>
              {" · "}<span className="text-muted-foreground">{totalDuration} min no total</span>
              {" · "}<span className="font-medium text-primary">R$ {totalPrice.toFixed(2)}</span>
            </p>
          </div>

          <p className="text-muted-foreground text-sm">Escolha a data do atendimento</p>

          <div className="flex justify-center">
            <div className="border border-border/60 rounded-2xl overflow-hidden shadow-elegant bg-card w-full max-w-md">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); if (d) setStep(4); }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today || date.getDay() === 0;
                }}
                locale={ptBR}
                className="p-4 pointer-events-auto w-full"
                classNames={{
                  months: "flex flex-col",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-2",
                  caption_label: "text-base font-semibold font-serif capitalize",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-8 w-8 bg-transparent p-0 hover:bg-accent rounded-lg transition-colors",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-xs uppercase tracking-wide text-center py-2",
                  row: "flex w-full mt-1",
                  cell: "flex-1 text-center text-sm p-0 relative",
                  day: "h-10 w-10 mx-auto p-0 font-normal rounded-lg hover:bg-accent transition-colors aria-selected:opacity-100",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary font-semibold rounded-lg",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-40",
                  day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
                }}
              />
            </div>
          </div>

          <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>
              Os horários disponíveis serão calculados com base na duração total dos seus serviços ({totalDuration} min)
              e na disponibilidade de {professionals} profissionais simultâneos.
            </span>
          </div>
        </div>
      )}

      {/* ── STEP 4: Horários disponíveis ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-muted-foreground text-sm">
              Horários disponíveis · <span className="font-medium text-foreground">{selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            </p>
            <Badge variant="secondary" className="text-xs">
              <Timer className="h-3 w-3 mr-1" /> {totalDuration} min
            </Badge>
          </div>

          {availableSlots.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">Nenhum horário disponível</p>
              <p className="text-sm text-muted-foreground">Tente outra data ou reduza os serviços selecionados.</p>
              <Button variant="outline" onClick={() => setStep(3)}>Escolher outra data</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableSlots.map((t) => {
                const [h, m] = t.split(":").map(Number);
                const endMin = h * 60 + m + totalDuration;
                const endH = Math.floor(endMin / 60);
                const endM = endMin % 60;
                const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
                const isSelected = selectedTime === t;
                return (
                  <button
                    key={t}
                    onClick={() => { setSelectedTime(t); setStep(5); }}
                    className={`group relative rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer
                      ${isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-elevated"
                        : "border-border/60 bg-card hover:border-primary/60 hover:bg-accent/40 hover:shadow-elegant"
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                      <span className="font-serif font-semibold text-xl tracking-tight">{t}</span>
                    </div>
                    <p className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      Até {endStr}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>
                      {totalDuration} min · {selectedServices.length} serviço{selectedServices.length > 1 ? "s" : ""}
                    </p>
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 5: Confirmação ── */}
      {step === 5 && (
        <div className="space-y-4 max-w-lg mx-auto">
          <p className="text-muted-foreground text-sm text-center">Revise e confirme seu agendamento</p>

          {/* Branch photo header */}
          <div className="relative rounded-2xl overflow-hidden h-40 shadow-elegant">
            <img
              src={selectedBranch ? getBranchImage(selectedBranch) : DEFAULT_BRANCH_IMAGE}
              alt={selectedBranch?.name || "Filial"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-white/80" />
                <p className="font-serif text-white font-semibold text-lg">{selectedBranch?.name}</p>
              </div>
              {selectedBranch?.address && (
                <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {selectedBranch.address}
                </p>
              )}
            </div>
          </div>

          {/* Summary card */}
          <Card className="border-primary/15 shadow-elegant">
            <CardContent className="p-0">
              {/* Date & Time row */}
              <div className="grid grid-cols-2 divide-x divide-border/60">
                <div className="p-4 flex flex-col items-center gap-1">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
                    <CalendarDays className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-semibold text-sm text-center">
                    {selectedDate && format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedDate && format(selectedDate, "EEEE", { locale: ptBR })}
                  </p>
                </div>
                <div className="p-4 flex flex-col items-center gap-1">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-semibold text-sm">{selectedTime}</p>
                  <p className="text-xs text-muted-foreground">{totalDuration} min</p>
                </div>
              </div>

              <div className="border-t border-border/60" />

              {/* Services list */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Scissors className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Serviços</p>
                </div>
                {selectedServices.map((s) => {
                  const free = s.is_system && escovasDisponiveis > 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center">
                          <Scissors className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {free ? (
                          <div>
                            <p className="text-xs text-muted-foreground line-through">R$ {Number(s.price).toFixed(2)}</p>
                            <p className="text-sm font-semibold text-primary">Grátis</p>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold">R$ {Number(s.price).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border/60" />

              {/* Total */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Total</p>
                </div>
                <p className="font-serif font-bold text-xl text-primary">R$ {totalPrice.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-12 text-base rounded-xl" onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <>Confirmando...</>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmar Agendamento
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
