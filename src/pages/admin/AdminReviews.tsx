import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Star, Search, MessageSquare, TrendingUp, Award, Users,
  Scissors, ChevronDown, ChevronUp, CalendarDays,
} from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
  service_name: string;
}

interface ServiceWithReviews {
  id: string;
  name: string;
  image_url: string | null;
  avg: number;
  total: number;
  reviews: ReviewRow[];
}

function StarDisplay({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} transition-colors ${
            s <= Math.round(value)
              ? "fill-warning text-warning"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </div>
  );
}

function RatingBar({ rating, total }: { rating: number; total: number }) {
  const pct = total > 0 ? Math.round((rating / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-1">{5 - [1,2,3,4,5].indexOf(rating)}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-6 text-right">{rating}</span>
    </div>
  );
}

export default function AdminReviews() {
  const [data, setData] = useState<ServiceWithReviews[]>([]);
  const [allReviews, setAllReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recentSearch, setRecentSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: services } = await supabase
      .from("services")
      .select("id, name, image_url")
      .order("name");

    const { data: reviews } = await (supabase as any)
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        appointment_id,
        appointments!inner(service_id, client_id),
        profiles:appointments!inner(profiles!appointments_client_profile_fkey(full_name))
      `)
      .order("created_at", { ascending: false });

    const serviceMap = new Map((services || []).map((s: any) => [s.id, s.name]));

    const flatReviews: ReviewRow[] = (reviews || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      client_name:
        r.profiles?.profiles?.full_name ||
        r.appointments?.profiles?.full_name ||
        "Cliente",
      service_name: serviceMap.get(r.appointments?.service_id) || "Serviço",
    }));

    setAllReviews(flatReviews);

    const serviceList: ServiceWithReviews[] = (services || []).map((svc: any) => {
      const svcReviews = flatReviews.filter(
        (r) => {
          // match by service_name since we already resolved
          const raw = reviews?.find((rr: any) => rr.id === r.id);
          return raw?.appointments?.service_id === svc.id;
        }
      );

      const avg =
        svcReviews.length > 0
          ? svcReviews.reduce((s, r) => s + r.rating, 0) / svcReviews.length
          : 0;

      return { id: svc.id, name: svc.name, image_url: svc.image_url, avg, total: svcReviews.length, reviews: svcReviews };
    });

    setData(serviceList);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = data.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );
  const withReviews = filtered.filter((s) => s.total > 0);
  const withoutReviews = filtered.filter((s) => s.total === 0);

  const totalReviews = data.reduce((a, s) => a + s.total, 0);
  const globalAvg =
    totalReviews > 0
      ? data.reduce((a, s) => a + s.avg * s.total, 0) / totalReviews
      : 0;
  const bestService = data.reduce(
    (best, s) => (s.total > 0 && s.avg > (best?.avg ?? 0) ? s : best),
    null as ServiceWithReviews | null
  );

  // Monthly average evolution chart
  const monthlyData = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    allReviews.forEach((r) => {
      const key = format(startOfMonth(parseISO(r.created_at)), "MMM/yy", { locale: ptBR });
      if (!map[key]) map[key] = { sum: 0, count: 0 };
      map[key].sum += r.rating;
      map[key].count += 1;
    });
    return Object.entries(map)
      .map(([month, { sum, count }]) => ({ month, avg: parseFloat((sum / count).toFixed(2)), total: count }))
      .reverse();
  }, [allReviews]);

  // Filtered recent comments
  const filteredRecent = useMemo(() => {
    const q = recentSearch.toLowerCase();
    return allReviews.filter(
      (r) =>
        !q ||
        r.client_name.toLowerCase().includes(q) ||
        r.service_name.toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q)
    );
  }, [allReviews, recentSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl">Relatório de Avaliações</h1>
      </div>

      {/* KPI cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Média Geral</p>
                <p className="font-serif font-bold text-xl">{globalAvg > 0 ? globalAvg.toFixed(1) : "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Avaliações</p>
                <p className="font-serif font-bold text-xl">{totalReviews}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Melhor Serviço</p>
                <p className="font-semibold text-sm leading-tight line-clamp-1">{bestService?.name ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serviços Avaliados</p>
                <p className="font-serif font-bold text-xl">
                  {withReviews.length}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/ {data.length}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="services">
          <TabsList className="mb-4">
            <TabsTrigger value="services">Por Serviço</TabsTrigger>
            <TabsTrigger value="recent">Comentários Recentes</TabsTrigger>
            <TabsTrigger value="evolution">Evolução Mensal</TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Por Serviço ── */}
          <TabsContent value="services" className="space-y-6 mt-0">
            <div className="flex justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>
            </div>

            {withReviews.length === 0 && !search ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {withReviews.length > 0 && (
                  <div className="space-y-4">
                    {withReviews.map((svc) => {
                      const isExpanded = expanded.has(svc.id);
                      const displayedReviews = isExpanded ? svc.reviews : svc.reviews.slice(0, 3);
                      const dist = [5, 4, 3, 2, 1].map((star) => ({
                        star,
                        count: svc.reviews.filter((r) => r.rating === star).length,
                      }));

                      return (
                        <Card key={svc.id} className="border-border/40 overflow-hidden">
                          <CardHeader className="p-0">
                            <div className="flex items-center gap-4 p-4 border-b border-border/40 bg-secondary/20">
                              <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                                {svc.image_url ? (
                                  <img src={svc.image_url} alt={svc.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Scissors className="h-6 w-6 text-muted-foreground/30" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate">{svc.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <StarDisplay value={svc.avg} />
                                  <span className="font-serif font-bold text-base">{svc.avg.toFixed(1)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({svc.total} avaliação{svc.total !== 1 ? "ões" : ""})
                                  </span>
                                </div>
                              </div>
                              <div className="hidden sm:flex flex-col gap-0.5 w-28 shrink-0">
                                {dist.map(({ star, count }) => (
                                  <RatingBar key={star} rating={count} total={svc.total} />
                                ))}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            {displayedReviews.length === 0 ? (
                              <p className="text-sm text-muted-foreground p-4">Nenhum comentário.</p>
                            ) : (
                              <div className="divide-y divide-border/30">
                                {displayedReviews.map((rev) => (
                                  <ReviewItem key={rev.id} rev={rev} />
                                ))}
                              </div>
                            )}
                            {svc.reviews.length > 3 && (
                              <button
                                className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:text-primary hover:bg-accent/40 transition-colors border-t border-border/30"
                                onClick={() => toggleExpand(svc.id)}
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="h-3.5 w-3.5" /> Mostrar menos</>
                                ) : (
                                  <><ChevronDown className="h-3.5 w-3.5" /> Ver todas {svc.reviews.length} avaliações</>
                                )}
                              </button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {withoutReviews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sem avaliações ainda</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {withoutReviews.map((svc) => (
                        <div
                          key={svc.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card opacity-60"
                        >
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {svc.image_url ? (
                              <img src={svc.image_url} alt={svc.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Scissors className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{svc.name}</p>
                            <p className="text-xs text-muted-foreground">0 avaliações</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 2: Comentários Recentes ── */}
          <TabsContent value="recent" className="mt-0 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                {filteredRecent.length} comentário{filteredRecent.length !== 1 ? "s" : ""}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, serviço ou texto..."
                  value={recentSearch}
                  onChange={(e) => setRecentSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>

            {filteredRecent.length === 0 ? (
              <EmptyState />
            ) : (
              <Card className="border-border/40">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/30">
                    {filteredRecent.map((rev) => (
                      <div key={rev.id} className="p-4 flex gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">{rev.client_name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Scissors className="h-3 w-3" />
                                {rev.service_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <StarDisplay value={rev.rating} />
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {format(parseISO(rev.created_at), "dd MMM yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          {rev.comment ? (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              "{rev.comment}"
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 mt-1 italic">Sem comentário</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── TAB 3: Evolução Mensal ── */}
          <TabsContent value="evolution" className="mt-0">
            {monthlyData.length < 2 ? (
              <Card className="border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Dados insuficientes</p>
                  <p className="text-sm text-muted-foreground/70">São necessárias avaliações em pelo menos 2 meses para exibir a evolução.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/40">
                <CardHeader className="pb-2 px-5 pt-5">
                  <p className="font-semibold text-sm">Evolução da Média de Estrelas</p>
                  <p className="text-xs text-muted-foreground">Média mensal de avaliações recebidas</p>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value: number, name: string) =>
                          name === "avg"
                            ? [`★ ${value.toFixed(2)}`, "Média"]
                            : [value, "Avaliações"]
                        }
                      />
                      <ReferenceLine
                        y={globalAvg}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                        label={{ value: `Média: ${globalAvg.toFixed(1)}`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        stroke="hsl(var(--warning))"
                        strokeWidth={2.5}
                        dot={{ fill: "hsl(var(--warning))", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Monthly summary table */}
                  <div className="mt-4 border-t border-border/40 pt-4">
                    <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-2 px-1">
                      <span>Mês</span>
                      <span className="text-center">Avaliações</span>
                      <span className="text-right">Média</span>
                    </div>
                    <div className="space-y-1">
                      {[...monthlyData].reverse().map((row) => (
                        <div
                          key={row.month}
                          className="grid grid-cols-3 text-sm px-1 py-1.5 rounded-lg hover:bg-accent/40 transition-colors"
                        >
                          <span className="font-medium capitalize">{row.month}</span>
                          <span className="text-center text-muted-foreground">{row.total}</span>
                          <span className="text-right font-semibold flex items-center justify-end gap-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            {row.avg.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ReviewItem({ rev }: { rev: ReviewRow }) {
  return (
    <div className="p-4 flex gap-3">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-medium text-sm">{rev.client_name}</p>
          <div className="flex items-center gap-2">
            <StarDisplay value={rev.rating} />
            <span className="text-xs text-muted-foreground">
              {format(parseISO(rev.created_at), "dd MMM yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
        {rev.comment ? (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">"{rev.comment}"</p>
        ) : (
          <p className="text-xs text-muted-foreground/50 mt-1 italic">Sem comentário</p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 space-y-3">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
        <Star className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="font-medium text-muted-foreground">Nenhuma avaliação encontrada.</p>
      <p className="text-sm text-muted-foreground/70">As avaliações dos clientes aparecerão aqui após os atendimentos.</p>
    </div>
  );
}
