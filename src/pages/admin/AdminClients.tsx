import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export default function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").order("full_name").then(({ data }) => {
      setClients(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = clients.filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Gestão de Clientes</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="border-gold/10">
              <CardContent className="py-4">
                <p className="font-medium">{c.full_name || "Sem nome"}</p>
                <p className="text-sm text-muted-foreground">{c.phone || "Sem telefone"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
