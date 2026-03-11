import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard, Users, Calendar, Scissors, DollarSign,
  Crown, Activity, ClipboardList, Building2, Tag, Star, Tv2, UserCheck,
  ChevronDown, BarChart2, LogOut, History, CalendarDays,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import logoVertical from "@/assets/logo_vertical.png";
import logoIcon from "@/assets/logo_icon.png";

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
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return count;
}

// Sub-items visible to manager/ceo only
const PROF_MANAGE_ITEMS = [
  { title: "Profissionais",             url: "/admin/professionals",         icon: UserCheck },
  { title: "Relatório do Profissional", url: "/admin/professionals/report",  icon: BarChart2 },
];

// Sub-items visible to professional + manager/ceo
const PROF_PERSONAL_ITEMS = [
  { title: "Agenda do Profissional",    url: "/admin/professionals/agenda",   icon: Calendar },
  { title: "Histórico do Profissional", url: "/admin/professionals/history",  icon: ClipboardList },
];

function ProfessionaisGroup({ canManage }: { canManage: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const allSubItems = [
    ...(canManage ? PROF_MANAGE_ITEMS : []),
    ...PROF_PERSONAL_ITEMS,
  ];

  const isActive = allSubItems.some((i) => pathname.startsWith(i.url));
  const [open, setOpen] = useState(isActive);

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Profissionais">
          <NavLink
            to={canManage ? "/admin/professionals" : "/admin/professionals/agenda"}
            end
            className="rounded-lg transition-all duration-200 hover:bg-sidebar-accent mx-1 px-2 py-2.5 justify-center flex items-center"
            activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
          >
            <UserCheck className="h-4 w-4" />
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
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
            {allSubItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground"
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

interface NavItemDef {
  title: string;
  url: string;
  icon: React.ElementType;
  tourId?: string;
  badge?: number;
}

export function AdminSidebar() {
  const { adminLevel, signOut } = useAuth();
  const perms = useAdminPermissions();
  const pendingCount = usePendingQueueCount();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isProfessional = adminLevel === "professional";
  const isManager = adminLevel === "manager" || adminLevel === "ceo";
  // Professional sees only the professionals dropdown (no other items except what perms allow)
  const showProfDropdown = isProfessional || perms.canViewProfessionals;

  const allItems: NavItemDef[] = [
    { title: "Dashboard",         url: "/admin",                icon: LayoutDashboard, tourId: "sidebar-admin-dashboard" },
    { title: "Meus Atendimentos", url: "/admin/my-appointments",icon: ClipboardList,   tourId: "sidebar-admin-my-appointments" },
    { title: "Clientes",          url: "/admin/clients",        icon: Users,           tourId: "sidebar-admin-clients" },
    { title: "Serviços",          url: "/admin/services",       icon: Scissors,        tourId: "sidebar-admin-services" },
    { title: "Planos",            url: "/admin/plans",          icon: Crown,           tourId: "sidebar-admin-plans" },
    { title: "Financeiro",        url: "/admin/finance",        icon: DollarSign,      tourId: "sidebar-admin-finance" },
    { title: "Filiais",           url: "/admin/branches",       icon: Building2,       tourId: "sidebar-admin-branches" },
    { title: "Cupons",            url: "/admin/coupons",        icon: Tag,             tourId: "sidebar-admin-coupons" },
    { title: "Avaliações",        url: "/admin/reviews",        icon: Star,            tourId: "sidebar-admin-reviews" },
    { title: "TV de Fila",        url: "/admin/queue-tv",       icon: Tv2,             tourId: "sidebar-admin-queue-tv", badge: pendingCount },
    { title: "Calendário",        url: "/admin/work-calendar",  icon: CalendarDays,    tourId: "sidebar-admin-work-calendar" },
    { title: "Logs",              url: "/admin/logs",           icon: Activity,        tourId: "sidebar-admin-logs" },
  ];

  const permMap: Record<string, boolean> = {
    "/admin":                 perms.canViewDashboard,
    "/admin/my-appointments": adminLevel === "attendant" || adminLevel === "professional",
    "/admin/clients":         perms.canViewClients && adminLevel !== "professional",
    "/admin/services":        perms.canViewServices,
    "/admin/plans":           perms.canViewPlans,
    "/admin/finance":         perms.canViewFinance,
    "/admin/branches":        perms.canViewBranches,
    "/admin/users":           perms.canViewUsers,
    "/admin/coupons":         perms.canManageCoupons,
    "/admin/reviews":         perms.canViewServices && adminLevel !== "professional",
    "/admin/queue-tv":        perms.canViewQueueTV,
    "/admin/work-calendar":   perms.canManageSystemSettings,
    "/admin/logs":            perms.canViewLogs,
  };

  const items = allItems.filter((item) => permMap[item.url] ?? false);

  // Profissional não vê o dropdown de Profissionais (Agenda e Histórico ficam fora do menu)
  const showProfDropdownFinal = isProfessional ? false : showProfDropdown;

  // Split items: before and after professionals slot
  const financeIdx = items.findIndex((i) => i.url === "/admin/finance");
  const splitIdx = financeIdx >= 0 ? financeIdx + 1 : items.length;
  const itemsBefore = items.slice(0, splitIdx);
  const itemsAfter = items.slice(splitIdx);

  const levelLabel = adminLevel ? ADMIN_LEVEL_LABELS[adminLevel] : null;
  const levelColor = adminLevel ? ADMIN_LEVEL_COLORS[adminLevel] : "";

  const renderItem = (item: NavItemDef) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          id={item.tourId}
          to={item.url}
          end
          className={`rounded-lg transition-all duration-200 hover:bg-sidebar-accent ${collapsed ? "mx-1 px-2 py-2.5 justify-center" : "mx-2 px-3 py-2.5"}`}
          activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
        >
          <span className="relative shrink-0">
            <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-3"}`} />
            {!!item.badge && item.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </span>
          {!collapsed && <span className="flex-1">{item.title}</span>}
          {!collapsed && !!item.badge && item.badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className={`border-b border-sidebar-border/40 transition-all duration-200 ${collapsed ? "items-center p-3" : "items-center p-4 pb-3"}`}>
        {collapsed
          ? <img src={logoIcon} alt="DA" className="w-8 h-8 object-contain" />
          : <img src={logoVertical} alt="Dani Alves Beauty Express" className="w-28 h-auto object-contain" />
        }
        {levelLabel && !collapsed && (
          <div className="w-full pt-1">
            <Badge variant="outline" className={`text-xs w-full justify-center py-1 ${levelColor}`}>
              {levelLabel}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium px-4">
              Administração
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {itemsBefore.map(renderItem)}
              {showProfDropdownFinal && <ProfessionaisGroup canManage={perms.canViewProfessionals} />}
              {itemsAfter.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 pt-0">
        <Button
          variant="ghost"
          className={`w-full hover:text-destructive rounded-lg transition-all duration-200 ${collapsed ? "justify-center px-2" : "justify-start text-muted-foreground"}`}
          onClick={signOut}
        >
          <LogOut className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-3"}`} />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
