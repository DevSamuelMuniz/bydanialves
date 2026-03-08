import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Star, Search, MessageSquare, TrendingUp, Award, Users,
  Scissors, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all services
    const { data: services } = await supabase
      .from("services")
      .select("id, name, image_url")
      .order("name");

    // Fetch all reviews with profile join via appointments
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

    const serviceList: ServiceWithReviews[] = (services || []).map((svc: any) => {
      const svcReviews: ReviewRow[] = (reviews || [])
        .filter((r: any) => r.appointments?.service_id === svc.id)
        .map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          client_name:
            r.profiles?.profiles?.full_name ||
            r.appointments?.profiles?.full_name ||
            "Cliente",
        }));

      const avg =
        svcReviews.length > 0
          ? svcReviews.reduce((s, r) => s + r.rating, 0) / svcReviews.length
          : 0;

      return {
        id: svc.id,
        name: svc.name,
        image_url: svc.image_url,
        avg,
        total: svcReviews.length,
        reviews: svcReviews,
      };
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

  // Global stats
  const totalReviews = data.reduce((a, s) => a + s.total, 0);
  const globalAvg =
    totalReviews > 0
      ? data.reduce((a, s) => a + s.avg * s.total, 0) / totalReviews
      : 0;
  const bestService = data.reduce(
    (best, s) => (s.total > 0 && s.avg > (best?.avg ?? 0) ? s : best),
    null as ServiceWithReviews | null
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl">Avaliações por Serviço</h1>
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

      {/* Summary KPIs */}
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
                <p className="font-serif font-bold text-xl">{withReviews.length} <span className="text-sm font-normal text-muted-foreground">/ {data.length}</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : withReviews.length === 0 && !search ? (
        <div className="text-center py-20 space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Star className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-muted-foreground">Nenhuma avaliação recebida ainda.</p>
          <p className="text-sm text-muted-foreground/70">As avaliações dos clientes aparecerão aqui após os atendimentos.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Services WITH reviews */}
          {withReviews.length > 0 && (
            <div className="space-y-4">
              {withReviews.map((svc) => {
                const isExpanded = expanded.has(svc.id);
                const displayedReviews = isExpanded ? svc.reviews : svc.reviews.slice(0, 3);

                // Distribution of 1-5 star ratings
                const dist = [5, 4, 3, 2, 1].map((star) => ({
                  star,
                  count: svc.reviews.filter((r) => r.rating === star).length,
                }));

                return (
                  <Card key={svc.id} className="border-border/40 overflow-hidden">
                    {/* Service header */}
                    <CardHeader className="p-0">
                      <div className="flex items-center gap-4 p-4 border-b border-border/40 bg-secondary/20">
                        {/* Image */}
                        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                          {svc.image_url ? (
                            <img src={svc.image_url} alt={svc.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Scissors className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        {/* Name + avg */}
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

                        {/* Distribution bars */}
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
                            <div key={rev.id} className="p-4 flex gap-3">
                              {/* Avatar */}
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{rev.client_name}</p>
                                  <div className="flex items-center gap-2">
                                    <StarDisplay value={rev.rating} />
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(rev.created_at), "dd MMM yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                </div>
                                {rev.comment ? (
                                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                    "{rev.comment}"
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground/50 mt-1 italic">Sem comentário</p>
                                )}
                              </div>
                            </div>
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

          {/* Services WITHOUT reviews */}
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
    </div>
  );
}
