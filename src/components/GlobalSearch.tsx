import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users, Scissors, Crown, Building2, DollarSign, X } from "lucide-react";

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

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
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
      return;
    }
    setLoading(true);
    const found: Result[] = [];
    const term = q.toLowerCase();

    try {
      // ── Agendamentos (todos os admins / clientes veem os próprios) ──
      if (isAdmin && perms.canViewAgenda) {
        const { data } = await supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status, profiles!appointments_client_profile_fkey(full_name), services(name)")
          .or(`appointment_date.ilike.%${term}%`)
          .limit(4);
        for (const a of data || []) {
          const name = (a.profiles as any)?.full_name || "";
          const service = (a.services as any)?.name || "";
          if (
            name.toLowerCase().includes(term) ||
            service.toLowerCase().includes(term) ||
            a.appointment_date?.includes(term) ||
            a.status?.includes(term)
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
        // broader search by client name
        const { data: d2 } = await supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status, profiles!appointments_client_profile_fkey(full_name), services(name)")
          .limit(50);
        for (const a of d2 || []) {
          const name = (a.profiles as any)?.full_name || "";
          const service = (a.services as any)?.name || "";
          if (
            (name.toLowerCase().includes(term) || service.toLowerCase().includes(term)) &&
            !found.find((f) => f.id === a.id)
          ) {
            found.push({
              id: a.id,
              label: `${name} — ${service}`,
              sublabel: `${a.appointment_date} às ${a.appointment_time?.slice(0, 5)} · ${a.status}`,
              icon: <Calendar className="h-4 w-4 text-primary" />,
              href: "/admin/agenda",
              group: "Agendamentos",
            });
            if (found.filter((f) => f.group === "Agendamentos").length >= 4) break;
          }
        }
      }

      // ── Meus Agendamentos (cliente) ──
      if (!isAdmin && user) {
        const { data } = await supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status, services(name)")
          .eq("client_id", user.id)
          .limit(50);
        for (const a of data || []) {
          const service = (a.services as any)?.name || "";
          if (service.toLowerCase().includes(term) || a.appointment_date?.includes(term) || a.status?.includes(term)) {
            found.push({
              id: a.id,
              label: service,
              sublabel: `${a.appointment_date} às ${a.appointment_time?.slice(0, 5)} · ${a.status}`,
              icon: <Calendar className="h-4 w-4 text-primary" />,
              href: "/client/history",
              group: "Meus Agendamentos",
            });
            if (found.filter((f) => f.group === "Meus Agendamentos").length >= 4) break;
          }
        }
      }

      // ── Clientes ──
      if (isAdmin && perms.canViewClients) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email:user_id")
          .ilike("full_name", `%${q}%`)
          .limit(4);
        for (const p of data || []) {
          found.push({
            id: p.user_id,
            label: p.full_name || "—",
            sublabel: p.phone || undefined,
            icon: <Users className="h-4 w-4 text-blue-500" />,
            href: "/admin/clients",
            group: "Clientes",
          });
        }
      }

      // ── Serviços ──
      if (isAdmin ? perms.canViewServices : true) {
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
      }

      // ── Planos ──
      if (isAdmin ? perms.canViewPlans : true) {
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
      }

      // ── Filiais (admin gerente+) ──
      if (isAdmin && perms.canViewBranches) {
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
      }

      // ── Financeiro (admin gerente+) ──
      if (isAdmin && perms.canViewFinance) {
        const { data } = await supabase
          .from("financial_records")
          .select("id, description, amount, type, category")
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
      }
    } catch (_) {}

    setResults(found);
    setActiveIndex(0);
    setLoading(false);
  }, [isAdmin, perms, user]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const groups = [...new Set(results.map((r) => r.group))];

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
    <div ref={containerRef} className="flex-1 max-w-xs relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Buscar… (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-9 bg-secondary/50 border-border/40"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border/60 bg-popover shadow-elevated z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 bg-muted/40 border-b border-border/40">
                  {group}
                </div>
                {results
                  .filter((r) => r.group === group)
                  .map((r) => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r.href)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/20 last:border-0 ${
                          activeIndex === idx ? "bg-primary/8 text-foreground" : "hover:bg-secondary/60"
                        }`}
                      >
                        <span className="shrink-0">{r.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{r.label}</span>
                          {r.sublabel && (
                            <span className="block text-xs text-muted-foreground truncate">{r.sublabel}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
