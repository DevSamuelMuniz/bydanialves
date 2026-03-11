import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar, NavItem } from "@/components/AppSidebar";
import { useSidebar } from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, Calendar, Scissors, DollarSign,
  ShieldCheck, Crown, Activity, ClipboardList, Building2, Tag, Star, Tv2, UserCheck,
  ChevronDown, BarChart2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLocation } from "react-router-dom";

function usePendingQueueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    const fetch = async () => {
      const { count: c } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("appointment_date", today)
        .eq("status", "pending");
      setCount(c ?? 0);
    };

    fetch();

    const channel = supabase
      .channel("pending-queue-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => fetch()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}

const PROF_SUB_ITEMS = [
  { title: "Profissionais", url: "/admin/professionals", tourId: "sidebar-admin-professionals" },
  { title: "Relatório do Profissional", url: "/admin/professionals/report", tourId: "sidebar-admin-prof-report" },
];

function ProfessionaisGroup() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = PROF_SUB_ITEMS.some((i) => pathname === i.url);
  const [open, setOpen] = useState(isActive);

  if (collapsed) {
    // When sidebar is collapsed, show just the icon linking to the main page
    return (
      <NavLink
        to="/admin/professionals"
        end
        className="rounded-lg transition-all duration-200 hover:bg-sidebar-accent mx-1 px-2 py-2.5 justify-center flex items-center"
        activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
      >
        <span className="relative shrink-0">
          <UserCheck className="h-4 w-4" />
        </span>
      </NavLink>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-sidebar-accent ${isActive ? "text-primary font-medium" : "text-sidebar-foreground"}`}
        >
          <UserCheck className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Profissionais</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-7 mt-0.5 space-y-0.5 border-l border-sidebar-border/50 pl-3">
          {PROF_SUB_ITEMS.map((item) => (
            <NavLink
              key={item.url}
              id={item.tourId}
              to={item.url}
              end
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              {item.url.includes("report") ? (
                <BarChart2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const { adminLevel } = useAuth();
  const perms = useAdminPermissions();
  const pendingCount = usePendingQueueCount();

  const items: NavItem[] = [
    { title: "Dashboard",          url: "/admin",                icon: LayoutDashboard, tourId: "sidebar-admin-dashboard" },
    { title: "Agenda",             url: "/admin/agenda",         icon: Calendar,        tourId: "sidebar-admin-agenda" },
    { title: "Meus Atendimentos",  url: "/admin/my-appointments",icon: ClipboardList,   tourId: "sidebar-admin-my-appointments" },
    { title: "Clientes",           url: "/admin/clients",        icon: Users,           tourId: "sidebar-admin-clients" },
    { title: "Serviços",           url: "/admin/services",       icon: Scissors,        tourId: "sidebar-admin-services" },
    { title: "Planos",             url: "/admin/plans",          icon: Crown,           tourId: "sidebar-admin-plans" },
    { title: "Financeiro",         url: "/admin/finance",        icon: DollarSign,      tourId: "sidebar-admin-finance" },
    { title: "Filiais",            url: "/admin/branches",       icon: Building2,       tourId: "sidebar-admin-branches" },
    { title: "Cupons",             url: "/admin/coupons",        icon: Tag,             tourId: "sidebar-admin-coupons" },
    { title: "Avaliações",         url: "/admin/reviews",        icon: Star,            tourId: "sidebar-admin-reviews" },
    { title: "TV de Fila",         url: "/admin/queue-tv",       icon: Tv2,             tourId: "sidebar-admin-queue-tv", badge: pendingCount },
    { title: "Logs",               url: "/admin/logs",           icon: Activity,        tourId: "sidebar-admin-logs" },
  ].filter((item) => {
    const map: Record<string, boolean> = {
      "/admin":                 perms.canViewDashboard,
      "/admin/agenda":          perms.canViewAgenda,
      "/admin/my-appointments": perms.adminLevel === "professional",
      "/admin/clients":         perms.canViewClients,
      "/admin/services":        perms.canViewServices,
      "/admin/plans":           perms.canViewPlans,
      "/admin/finance":         perms.canViewFinance,
      "/admin/branches":        perms.canViewBranches,
      "/admin/users":           perms.canViewUsers,
      "/admin/coupons":         perms.canManageCoupons,
      "/admin/reviews":         perms.canViewServices,
      "/admin/queue-tv":        perms.canViewQueueTV,
      "/admin/logs":            perms.canViewLogs,
    };
    return map[item.url] ?? false;
  });

  const levelLabel = adminLevel ? ADMIN_LEVEL_LABELS[adminLevel] : null;
  const levelColor = adminLevel ? ADMIN_LEVEL_COLORS[adminLevel] : "";

  // Insert the professionals group slot at the right position (after Financeiro)
  const financeIdx = items.findIndex((i) => i.url === "/admin/finance");
  const itemsBefore = items.slice(0, financeIdx + 1);
  const itemsAfter = items.slice(financeIdx + 1);

  return (
    <AppSidebar
      items={items}
      groupLabel="Administração"
      professionaisSlot={perms.canViewProfessionals ? <ProfessionaisGroup /> : undefined}
      professionaisAfterUrl="/admin/finance"
      topBadge={
        levelLabel ? (
          <Badge variant="outline" className={`text-xs w-full justify-center py-1 ${levelColor}`}>
            {levelLabel}
          </Badge>
        ) : undefined
      }
    />
  );
}
