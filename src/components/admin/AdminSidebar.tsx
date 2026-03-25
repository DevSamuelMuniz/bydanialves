import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard, Users, Calendar, Scissors, DollarSign,
  Crown, Activity, ClipboardList, Building2, Tag, Star, Tv2, UserCheck,
  ChevronDown, BarChart2, LogOut, CalendarDays, TableProperties, Award, MessageCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import logoBlack from "@/assets/logo-black.png";
import logoGold from "@/assets/logo-gold.png";
import { useTheme } from "next-themes";

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

const PROF_MANAGE_ITEMS = [
  { title: "Profissionais",             url: "/admin/professionals",         icon: UserCheck },
  { title: "Relatório do Profissional", url: "/admin/professionals/report",  icon: BarChart2 },
];
const PROF_PERSONAL_ITEMS = [
  { title: "Agenda do Profissional",    url: "/admin/professionals/agenda",   icon: Calendar },
  { title: "Histórico do Profissional", url: "/admin/professionals/history",  icon: ClipboardList },
];

function ProfissionaisDropdownItem({ canManage }: { canManage: boolean }) {
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
          <button className={`w-full flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-sidebar-accent ${isActive ? "text-primary font-medium" : "text-sidebar-foreground"}`}>
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

interface NavGroupDef {
  label: string;
  urls: string[];
  items: NavItemDef[];
  showProfDropdown?: boolean;
}

function NavGroupCollapsible({
  group,
  collapsed,
  renderItem,
  perms,
}: {
  group: NavGroupDef;
  collapsed: boolean;
  renderItem: (item: NavItemDef) => React.ReactNode;
  perms: ReturnType<typeof useAdminPermissions>;
}) {
  const { pathname } = useLocation();
  const isActive = group.urls.some((u) => pathname === u || pathname.startsWith(u + "/"));
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <>
        {group.items.map(renderItem)}
        {group.showProfDropdown && <ProfissionaisDropdownItem canManage={perms.canViewProfessionals} />}
      </>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className={`w-full flex items-center gap-2 px-4 py-1.5 text-[11px] uppercase tracking-wider font-semibold transition-all duration-200 hover:text-foreground ${open ? "text-foreground" : "text-muted-foreground"}`}>
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map(renderItem)}
            {group.showProfDropdown && <ProfissionaisDropdownItem canManage={perms.canViewProfessionals} />}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const { adminLevel, signOut } = useAuth();
  const perms = useAdminPermissions();
  const pendingCount = usePendingQueueCount();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isProfessional = adminLevel === "professional";
  const isAttendant = adminLevel === "attendant";
  const showProfDropdown = isProfessional || perms.canViewProfessionals;
  const showProfDropdownFinal = !isProfessional && showProfDropdown;

  const levelLabel = adminLevel ? ADMIN_LEVEL_LABELS[adminLevel] : null;
  const levelColor = adminLevel ? ADMIN_LEVEL_COLORS[adminLevel] : "";

  const gestaoItems: NavItemDef[] = [
    perms.canViewDashboard && { title: "Dashboard", url: "/admin", icon: LayoutDashboard, tourId: "sidebar-admin-dashboard" },
    (isAttendant || isProfessional) && { title: isAttendant ? "Atendimentos" : "Meus Atendimentos", url: "/admin/my-appointments", icon: ClipboardList, tourId: "sidebar-admin-my-appointments" },
    (isAttendant || isProfessional) && { title: "Minha Escala", url: "/admin/my-schedule", icon: TableProperties, tourId: "sidebar-admin-my-schedule" },
    (perms.canViewClients && adminLevel !== "professional") && { title: "Clientes", url: "/admin/clients", icon: Users, tourId: "sidebar-admin-clients" },
    perms.canViewBranches && { title: "Filiais", url: "/admin/branches", icon: Building2, tourId: "sidebar-admin-branches" },
  ].filter(Boolean) as NavItemDef[];

  const servicosItems: NavItemDef[] = [
    perms.canViewServices && { title: "Serviços", url: "/admin/services", icon: Scissors, tourId: "sidebar-admin-services" },
    perms.canViewPlans && { title: "Planos", url: "/admin/plans", icon: Crown, tourId: "sidebar-admin-plans" },
  ].filter(Boolean) as NavItemDef[];

  const agendaItems: NavItemDef[] = [
    perms.canManageSystemSettings && { title: "Calendário", url: "/admin/work-calendar", icon: CalendarDays, tourId: "sidebar-admin-work-calendar" },
    perms.canViewQueueTV && { title: "TV de Fila", url: "/admin/queue-tv", icon: Tv2, tourId: "sidebar-admin-queue-tv", badge: pendingCount },
  ].filter(Boolean) as NavItemDef[];

  const financeiroItems: NavItemDef[] = [
    perms.canViewFinance && { title: "Financeiro", url: "/admin/finance", icon: DollarSign, tourId: "sidebar-admin-finance" },
    perms.canViewBonification && { title: "Bonificação", url: "/admin/bonification", icon: Award },
    perms.canManageCoupons && { title: "Cupons", url: "/admin/coupons", icon: Tag, tourId: "sidebar-admin-coupons" },
  ].filter(Boolean) as NavItemDef[];

  const relatoriosItems: NavItemDef[] = [
    (perms.canViewServices && adminLevel !== "professional") && { title: "Avaliações", url: "/admin/reviews", icon: Star, tourId: "sidebar-admin-reviews" },
  ].filter(Boolean) as NavItemDef[];

  const sistemaItems: NavItemDef[] = [
    perms.canViewLogs && { title: "Logs", url: "/admin/logs", icon: Activity, tourId: "sidebar-admin-logs" },
  ].filter(Boolean) as NavItemDef[];

  const groups: NavGroupDef[] = [
    {
      label: "Gestão",
      urls: ["/admin", "/admin/my-appointments", "/admin/my-schedule", "/admin/clients", "/admin/branches", "/admin/professionals"],
      items: gestaoItems,
      showProfDropdown: showProfDropdownFinal,
    },
    {
      label: "Serviços",
      urls: ["/admin/services", "/admin/plans"],
      items: servicosItems,
    },
    {
      label: "Agenda",
      urls: ["/admin/work-calendar", "/admin/queue-tv"],
      items: agendaItems,
    },
    {
      label: "Financeiro",
      urls: ["/admin/finance", "/admin/bonification", "/admin/coupons"],
      items: financeiroItems,
    },
    {
      label: "Relatórios",
      urls: ["/admin/reviews"],
      items: relatoriosItems,
    },
    {
      label: "Sistema",
      urls: ["/admin/logs"],
      items: sistemaItems,
    },
  ].filter((g) => g.items.length > 0 || g.showProfDropdown);

  // Logo com alternância dark/light
  function AdminLogoImg({ collapsed }: { collapsed: boolean }) {
    const { resolvedTheme } = useTheme();
    const logo = resolvedTheme === "dark" ? logoGold : logoBlack;
    return <img src={logo} alt="Dani Alves Esmalteria" className={collapsed ? "w-8 h-8 object-contain" : "w-28 h-auto object-contain"} />;
  }

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
        <AdminLogoImg collapsed={collapsed} />
        {levelLabel && !collapsed && (
          <div className="w-full pt-1">
            <Badge variant="outline" className={`text-xs w-full justify-center py-1 ${levelColor}`}>
              {levelLabel}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        {groups.map((group, idx) => (
          <SidebarGroup key={group.label} className="py-1">
            {idx > 0 && !collapsed && (
              <SidebarSeparator className="mx-3 mb-1 opacity-30" />
            )}
            <NavGroupCollapsible
              group={group}
              collapsed={collapsed}
              renderItem={renderItem}
              perms={perms}
            />
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-3">
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
