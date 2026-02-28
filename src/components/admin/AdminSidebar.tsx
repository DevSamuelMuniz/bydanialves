import { AppSidebar, NavItem } from "@/components/AppSidebar";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, Calendar, Scissors, DollarSign,
  BarChart3, ShieldCheck, Crown, Activity, ClipboardList,
} from "lucide-react";

export function AdminSidebar() {
  const { adminLevel } = useAuth();
  const perms = useAdminPermissions();

  const items: NavItem[] = [
    { title: "Dashboard",          url: "/admin",                icon: LayoutDashboard },
    { title: "Agenda",             url: "/admin/agenda",         icon: Calendar },
    { title: "Meus Atendimentos",  url: "/admin/my-appointments",icon: ClipboardList },
    { title: "Clientes",           url: "/admin/clients",        icon: Users },
    { title: "Serviços",           url: "/admin/services",       icon: Scissors },
    { title: "Planos",             url: "/admin/plans",          icon: Crown },
    { title: "Financeiro",         url: "/admin/finance",        icon: DollarSign },
    { title: "Relatórios",         url: "/admin/reports",        icon: BarChart3 },
    { title: "Usuários",           url: "/admin/users",          icon: ShieldCheck },
    { title: "Logs",               url: "/admin/logs",           icon: Activity },
  ].filter((item) => {
    const map: Record<string, boolean> = {
      "/admin":                 perms.canViewDashboard,
      "/admin/agenda":          perms.canViewAgenda,
      "/admin/my-appointments": perms.adminLevel === "professional",
      "/admin/clients":         perms.canViewClients,
      "/admin/services":        perms.canViewServices,
      "/admin/plans":           perms.canViewPlans,
      "/admin/finance":         perms.canViewFinance,
      "/admin/reports":         perms.canViewReports,
      "/admin/users":           perms.canViewUsers,
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
