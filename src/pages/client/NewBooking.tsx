import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronLeft } from "lucide-react";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

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

  useEffect(() => {
    supabase.from("services").select("*").eq("active", true).then(({ data }) => {
      setServices(data || []);
      setLoading(false);
    });
  }, []);

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

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        {step > 1 && (
          <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="font-serif text-2xl">Novo Agendamento</h1>
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
          {services.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer transition border-2 ${selectedService?.id === s.id ? "border-primary" : "border-transparent hover:border-gold/20"}`}
              onClick={() => { setSelectedService(s); setStep(2); }}
            >
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.duration_minutes} min</p>
                  </div>
                  <p className="font-serif text-lg text-primary">
                    R$ {Number(s.price).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
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
              className="rounded-md border border-gold/20"
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
          <Card className="border-gold/20">
            <CardContent className="py-4 space-y-2">
              <p><span className="text-muted-foreground">Serviço:</span> {selectedService?.name}</p>
              <p><span className="text-muted-foreground">Data:</span> {selectedDate?.toLocaleDateString("pt-BR")}</p>
              <p><span className="text-muted-foreground">Horário:</span> {selectedTime}</p>
              <p><span className="text-muted-foreground">Valor:</span> R$ {Number(selectedService?.price).toFixed(2)}</p>
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
