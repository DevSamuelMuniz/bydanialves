import { useEffect, useState } from "react";
import { AppSidebar, NavItem } from "@/components/AppSidebar";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Calendar, Scissors, DollarSign,
  ShieldCheck, Crown, Activity, ClipboardList, Building2, Tag, Star, Tv2,
} from "lucide-react";

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
    { title: "Usuários",           url: "/admin/users",          icon: ShieldCheck,     tourId: "sidebar-admin-users" },
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

  return (
    <AppSidebar
      items={items}
      groupLabel="Administração"
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
