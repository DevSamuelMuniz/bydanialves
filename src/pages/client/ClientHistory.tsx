import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ClientHistory() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("appointments")
      .select("*, services(name, price)")
      .eq("client_id", user.id)
      .order("appointment_date", { ascending: false })
      .then(({ data }) => {
        setAppointments(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl">Histórico</h1>
      {appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card key={appt.id} className="border-gold/10">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{(appt as any).services?.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(appt.appointment_date).toLocaleDateString("pt-BR")} às {appt.appointment_time?.slice(0, 5)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    R$ {Number((appt as any).services?.price).toFixed(2)}
                  </p>
                </div>
                <Badge variant="secondary" className={statusColors[appt.status]}>
                  {statusLabels[appt.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
