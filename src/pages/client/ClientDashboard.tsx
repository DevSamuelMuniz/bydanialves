import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

export default function ClientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, apptRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase
          .from("appointments")
          .select("*, services(name, price, duration_minutes)")
          .eq("client_id", user.id)
          .gte("appointment_date", new Date().toISOString().split("T")[0])
          .order("appointment_date", { ascending: true })
          .limit(5),
      ]);
      setProfile(profileRes.data);
      setAppointments(apptRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">
          Olá, {profile?.full_name || "Cliente"} ✨
        </h1>
        <p className="text-muted-foreground mt-1">Bem-vinda ao seu espaço de beleza</p>
      </div>

      <Link to="/client/booking">
        <Button size="lg" className="w-full md:w-auto">
          <CalendarPlus className="mr-2 h-5 w-5" />
          Novo Agendamento
        </Button>
      </Link>

      <div>
        <h2 className="font-serif text-lg mb-3">Próximos Agendamentos</h2>
        {appointments.length === 0 ? (
          <Card className="border-dashed border-gold/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum agendamento futuro. Que tal marcar um horário?
            </CardContent>
          </Card>
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
    </div>
  );
}
