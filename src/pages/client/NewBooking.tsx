import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ShieldX, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

function parseEscovasFromIncludes(includes: string): number {
  const match = includes.match(/(\d+)\s*escova/i);
  return match ? parseInt(match[1], 10) : 0;
}

const WHATSAPP_NUMBER = "5500000000000";

export default function NewBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [escovasDisponiveis, setEscovasDisponiveis] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Check if user is blocked
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

      // Load services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("active", true);
      setServices(servicesData || []);

      // Load active subscription
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

        const escovasUsadas = (appointments || []).filter((a: any) =>
          a.services?.is_system === true
        ).length;

        setEscovasDisponiveis(Math.max(0, totalEscovas - escovasUsadas));
      } else {
        setEscovasDisponiveis(0);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled")
      .then(({ data }) => {
        setBookedSlots((data || []).map((a) => a.appointment_time?.slice(0, 5)));
      });
  }, [selectedDate]);

  const isEscovaService = (service: any) => !!service?.is_system;
  const isFreeEscova = selectedService && isEscovaService(selectedService) && escovasDisponiveis > 0;

  const handleConfirm = async () => {
    if (!user || !selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      client_id: user.id,
      service_id: selectedService.id,
      appointment_date: selectedDate.toISOString().split("T")[0],
      appointment_time: selectedTime + ":00",
      status: "pending",
    });
    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agendamento realizado! ✨", description: "Seu horário foi reservado com sucesso." });
      setStep(1);
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
    }
    setSubmitting(false);
  };

  const handleWhatsAppQuestion = () => {
    const message = encodeURIComponent(
      "Olá! Minha conta foi bloqueada e gostaria de entender o motivo. Poderia me ajudar a resolver essa situação? Obrigada!"
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;

  // Blocked user modal + empty state
  if (blocked) {
    return (
      <div className="max-w-4xl space-y-6">
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

        {/* Modal on first load */}
        <Dialog open={blockedModalOpen} onOpenChange={setBlockedModalOpen}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader className="items-center">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="font-serif text-xl">Conta Bloqueada</DialogTitle>
              <DialogDescription className="text-base">
                Sua conta foi bloqueada e você não pode realizar agendamentos no momento. Entre em contato para mais informações.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleWhatsAppQuestion} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="mr-2 h-4 w-4" />
                Questionar via WhatsApp
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setBlockedModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        {step > 1 && (
          <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="font-serif text-2xl tracking-tight">Novo Agendamento</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {/* Step 1: Choose service */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-muted-foreground">Escolha o serviço</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s) => {
            const escova = isEscovaService(s);
            const free = escova && escovasDisponiveis > 0;
            const isSelected = selectedService?.id === s.id;
            // Use service image_url or a category-based placeholder
            const imgUrl = s.image_url ||
              `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=60&auto=format&fit=crop`;
            return (
              <div
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(2); }}
                className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 border-2 h-44
                  ${isSelected ? "border-primary shadow-elevated scale-[1.02]" : "border-transparent hover:border-primary/40 hover:scale-[1.01]"}`}
              >
                {/* Background image */}
                <img
                  src={imgUrl}
                  alt={s.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-end p-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-white text-base leading-tight">{s.name}</p>
                        {free && (
                          <Badge className="text-xs bg-primary/90 text-primary-foreground border-0">
                            Incluso no plano
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-white/70">{s.duration_minutes} min</p>
                    </div>
                    <div className="text-right">
                      {free ? (
                        <div>
                          <p className="text-xs text-white/50 line-through">
                            R$ {Number(s.price).toFixed(2)}
                          </p>
                          <p className="font-serif text-xl text-primary">R$ 0,00</p>
                        </div>
                      ) : (
                        <p className="font-serif text-xl text-white">
                          R$ {Number(s.price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            );
          })}
          </div>
          {services.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">Nenhum serviço disponível no momento.</p>
          )}
        </div>
      )}

      {/* Step 2: Choose date */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-muted-foreground">Escolha a data</p>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); if (d) setStep(3); }}
              disabled={(date) => date < new Date() || date.getDay() === 0}
              className="rounded-md border border-primary/15"
            />
          </div>
        </div>
      )}

      {/* Step 3: Choose time */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            Escolha o horário — {selectedDate?.toLocaleDateString("pt-BR")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((t) => {
              const booked = bookedSlots.includes(t);
              return (
                <Button
                  key={t}
                  variant={selectedTime === t ? "default" : "outline"}
                  disabled={booked}
                  className={booked ? "opacity-40" : ""}
                  onClick={() => { setSelectedTime(t); setStep(4); }}
                >
                  {t}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Confirme seu agendamento</p>
          <Card className="border-primary/15">
            <CardContent className="py-4 space-y-2">
              <p><span className="text-muted-foreground">Serviço:</span> {selectedService?.name}</p>
              <p><span className="text-muted-foreground">Data:</span> {selectedDate?.toLocaleDateString("pt-BR")}</p>
              <p><span className="text-muted-foreground">Horário:</span> {selectedTime}</p>
              <p>
                <span className="text-muted-foreground">Valor:</span>{" "}
                {isFreeEscova ? (
                  <span className="text-primary font-medium">R$ 0,00 (incluso no plano)</span>
                ) : (
                  `R$ ${Number(selectedService?.price).toFixed(2)}`
                )}
              </p>
            </CardContent>
          </Card>
          <Button className="w-full" onClick={handleConfirm} disabled={submitting}>
            <Check className="mr-2 h-4 w-4" />
            {submitting ? "Confirmando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      )}
    </div>
  );
}
