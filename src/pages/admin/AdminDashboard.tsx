import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, DollarSign, Users, Clock } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function AdminDashboard() {
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    Promise.all([
      supabase.from("appointments").select("*, services(name), profiles!appointments_client_id_fkey(full_name)").eq("appointment_date", today).order("appointment_time"),
      supabase.from("financial_records").select("amount").eq("type", "income").gte("created_at", monthStart),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]).then(([apptRes, finRes, clientRes]) => {
      setTodayAppointments(apptRes.data || []);
      setMonthRevenue((finRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0));
      setTotalClients(clientRes.count || 0);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><CalendarDays className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Agendamentos Hoje</p>
              <p className="text-2xl font-serif font-bold">{todayAppointments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><DollarSign className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento do Mês</p>
              <p className="text-2xl font-serif font-bold">R$ {monthRevenue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-serif font-bold">{totalClients}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-serif text-lg mb-3">Agenda de Hoje</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map((a) => (
              <Card key={a.id} className="border-gold/10">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{(a as any).profiles?.full_name || "Cliente"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{a.appointment_time?.slice(0, 5)} — {(a as any).services?.name}
                    </p>
                  </div>
                  <Badge variant="outline">{statusLabels[a.status]}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
