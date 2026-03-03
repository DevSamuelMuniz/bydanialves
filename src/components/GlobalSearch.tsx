import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Search, Calendar, Users, Scissors, Crown,
  Building2, DollarSign, X, ArrowRight,
} from "lucide-react";

type Result = {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  href: string;
  group: string;
};

interface GlobalSearchProps {
  isAdmin?: boolean;
}

/** Destaca o trecho que bate com o termo */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function GlobalSearch({ isAdmin = false }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const perms = useAdminPermissions();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Cancela busca anterior
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    const found: Result[] = [];

    try {
      // Todas as queries em paralelo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queries: Promise<any>[] = [];

      // ── Agendamentos (admin) ──
      if (isAdmin && perms.canViewAgenda) {
        queries.push((async () => {
          const { data } = await supabase
            .from("appointments")
            .select("id, appointment_date, appointment_time, status, profiles!appointments_client_profile_fkey(full_name), services(name)")
            .or(`appointment_date.ilike.%${q}%,status.ilike.%${q}%`)
            .limit(5);
          for (const a of data || []) {
            const name = (a.profiles as any)?.full_name || "";
            const service = (a.services as any)?.name || "";
            if (name.toLowerCase().includes(q.toLowerCase()) || service.toLowerCase().includes(q.toLowerCase()) || a.appointment_date?.includes(q)) {
              found.push({
                id: a.id,
                label: `${name} — ${service}`,
                sublabel: `${a.appointment_date} às ${a.appointment_time?.slice(0, 5)} · ${a.status}`,
                icon: <Calendar className="h-4 w-4 text-primary" />,
                href: "/admin/agenda",
                group: "Agendamentos",
              });
            }
          }
        })());

        // Busca por nome de cliente separada
        queries.push((async () => {
          const { data } = await supabase
            .from("appointments")
            .select("id, appointment_date, appointment_time, status, profiles!appointments_client_profile_fkey(full_name), services(name)")
            .limit(100);
          for (const a of data || []) {
            const name = (a.profiles as any)?.full_name || "";
            const service = (a.services as any)?.name || "";
            if (
              (name.toLowerCase().includes(q.toLowerCase()) || service.toLowerCase().includes(q.toLowerCase())) &&
              !found.find((f) => f.id === a.id && f.group === "Agendamentos")
            ) {
              found.push({
                id: a.id,
                label: `${name} — ${service}`,
                sublabel: `${a.appointment_date} às ${a.appointment_time?.slice(0, 5)} · ${a.status}`,
                icon: <Calendar className="h-4 w-4 text-primary" />,
                href: "/admin/agenda",
                group: "Agendamentos",
              });
            }
          }
        })());
      }

      // ── Meus Agendamentos (cliente) ──
      if (!isAdmin && user) {
        queries.push((async () => {
          const { data } = await supabase
            .from("appointments")
            .select("id, appointment_date, appointment_time, status, services(name)")
            .eq("client_id", user.id)
            .limit(50);
          for (const a of data || []) {
            const service = (a.services as any)?.name || "";
            if (service.toLowerCase().includes(q.toLowerCase()) || a.appointment_date?.includes(q) || a.status?.includes(q.toLowerCase())) {
              found.push({
                id: a.id,
                label: service,
                sublabel: `${a.appointment_date} às ${a.appointment_time?.slice(0, 5)} · ${a.status}`,
                icon: <Calendar className="h-4 w-4 text-primary" />,
                href: "/client/history",
                group: "Meus Agendamentos",
              });
            }
          }
        })());
      }

      // ── Clientes ──
      if (isAdmin && perms.canViewClients) {
        queries.push((async () => {
          const { data } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .ilike("full_name", `%${q}%`)
            .limit(5);
          for (const p of data || []) {
            found.push({
              id: p.user_id,
              label: p.full_name || "—",
              sublabel: p.phone ? `📞 ${p.phone}` : undefined,
              icon: <Users className="h-4 w-4 text-blue-500" />,
              href: "/admin/clients",
              group: "Clientes",
            });
          }
        })());
      }

      // ── Serviços ──
      if (isAdmin ? perms.canViewServices : true) {
        queries.push((async () => {
          const { data } = await supabase
            .from("services")
            .select("id, name, price, duration_minutes")
            .ilike("name", `%${q}%`)
            .eq("active", true)
            .limit(4);
          for (const s of data || []) {
            found.push({
              id: s.id,
              label: s.name,
              sublabel: `R$ ${Number(s.price).toFixed(2)} · ${s.duration_minutes} min`,
              icon: <Scissors className="h-4 w-4 text-purple-500" />,
              href: isAdmin ? "/admin/services" : "/client/new-booking",
              group: "Serviços",
            });
          }
        })());
      }

      // ── Planos ──
      if (isAdmin ? perms.canViewPlans : true) {
        queries.push((async () => {
          const { data } = await supabase
            .from("plans")
            .select("id, name, price, description")
            .ilike("name", `%${q}%`)
            .eq("active", true)
            .limit(3);
          for (const p of data || []) {
            found.push({
              id: p.id,
              label: p.name,
              sublabel: `R$ ${Number(p.price).toFixed(2)}/mês`,
              icon: <Crown className="h-4 w-4 text-amber-500" />,
              href: isAdmin ? "/admin/plans" : "/client/plans",
              group: "Planos",
            });
          }
        })());
      }

      // ── Filiais ──
      if (isAdmin && perms.canViewBranches) {
        queries.push((async () => {
          const { data } = await supabase
            .from("branches")
            .select("id, name, address")
            .ilike("name", `%${q}%`)
            .eq("active", true)
            .limit(3);
          for (const b of data || []) {
            found.push({
              id: b.id,
              label: b.name,
              sublabel: b.address || undefined,
              icon: <Building2 className="h-4 w-4 text-green-500" />,
              href: "/admin/branches",
              group: "Filiais",
            });
          }
        })());
      }

      // ── Financeiro ──
      if (isAdmin && perms.canViewFinance) {
        queries.push((async () => {
          const { data } = await supabase
            .from("financial_records")
            .select("id, description, amount, type")
            .ilike("description", `%${q}%`)
            .limit(3);
          for (const f of data || []) {
            found.push({
              id: f.id,
              label: f.description,
              sublabel: `R$ ${Number(f.amount).toFixed(2)} · ${f.type === "income" ? "Receita" : "Despesa"}`,
              icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
              href: "/admin/finance",
              group: "Financeiro",
            });
          }
        })());
      }

      await Promise.all(queries);
    } catch (_) {}

    setResults(found);
    setActiveIndex(0);
    setLoading(false);
  }, [isAdmin, perms, user]);

  // Debounce 250ms
  useEffect(() => {
    const timeout = setTimeout(() => search(query), 250);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const groups = [...new Set(results.map((r) => r.group))];
  const totalResults = results.length;

  const handleSelect = (href: string) => {
    navigate(href);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[activeIndex]) handleSelect(results[activeIndex].href);
  };

  let globalIndex = -1;

  return (
    <div ref={containerRef} className="flex-1 max-w-sm relative">
      {/* Input */}
      <div className="relative">
        {loading && query.length >= 2 ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          ref={inputRef}
          placeholder="Buscar clientes, serviços…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-16 h-9 bg-secondary/50 border-border/40 focus:border-primary/40 focus:bg-background transition-colors"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query ? (
            <button
              onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-muted px-1.5 text-[10px] font-medium text-muted-foreground select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border/60 bg-popover shadow-elevated z-50 overflow-hidden max-h-[440px] flex flex-col">
          {/* Header com contagem */}
          {!loading && totalResults > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
              <span className="text-[10px] text-muted-foreground">
                {totalResults} resultado{totalResults !== 1 ? "s" : ""} para <span className="font-semibold text-foreground">"{query}"</span>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">↑↓ navegar · Enter selecionar</span>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-1">
                    <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-2.5 bg-muted/60 animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="py-10 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum resultado para <span className="font-medium">"{query}"</span></p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tente outros termos</p>
              </div>
            ) : (
              groups.map((group) => {
                const groupItems = results.filter((r) => r.group === group);
                return (
                  <div key={group}>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-y border-border/30">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{group}</span>
                      <span className="text-[10px] text-muted-foreground/50">{groupItems.length}</span>
                    </div>
                    {groupItems.map((r) => {
                      globalIndex++;
                      const idx = globalIndex;
                      const isActive = activeIndex === idx;
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleSelect(r.href)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-100 border-b border-border/10 last:border-0 group/item ${
                            isActive ? "bg-primary/10" : "hover:bg-secondary/50"
                          }`}
                        >
                          <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? "bg-primary/15" : "bg-muted/60"
                          }`}>
                            {r.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm font-medium truncate transition-colors ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                              <Highlight text={r.label} term={query} />
                            </span>
                            {r.sublabel && (
                              <span className="block text-xs text-muted-foreground truncate mt-0.5">
                                {r.sublabel}
                              </span>
                            )}
                          </span>
                          <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-all duration-100 ${
                            isActive ? "text-primary opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
