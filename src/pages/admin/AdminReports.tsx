import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AdminReports() {
  const perms = useAdminPermissions();
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Most booked services
      const { data: appts } = await supabase.from("appointments").select("service_id, services(name)");
      const serviceCounts: Record<string, { name: string; count: number }> = {};
      (appts || []).forEach((a: any) => {
        const name = a.services?.name || "Desconhecido";
        if (!serviceCounts[name]) serviceCounts[name] = { name, count: 0 };
        serviceCounts[name].count++;
      });
      setServiceData(Object.values(serviceCounts).sort((a, b) => b.count - a.count).slice(0, 10));

      // Revenue by month
      const { data: fin } = await supabase.from("financial_records").select("amount, created_at").eq("type", "income");
      const monthly: Record<string, number> = {};
      (fin || []).forEach((r) => {
        const month = new Date(r.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        monthly[month] = (monthly[month] || 0) + Number(r.amount);
      });
      setRevenueData(Object.entries(monthly).map(([name, value]) => ({ name, value })));

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;

  if (!perms.canViewReports) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Relatórios</h1>

      <Card className="border-gold/20">
        <CardHeader><CardTitle className="font-serif text-lg">Serviços Mais Agendados</CardTitle></CardHeader>
        <CardContent>
          {serviceData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem dados disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(43, 72%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-gold/20">
        <CardHeader><CardTitle className="font-serif text-lg">Receita por Período</CardTitle></CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem dados disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(43, 72%, 50%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
