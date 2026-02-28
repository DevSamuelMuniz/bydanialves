import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions, ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS } from "@/hooks/use-admin-permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, Calendar, Scissors, DollarSign, BarChart3, LogOut, ShieldCheck, Crown, Activity, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoImg from "@/assets/logo-dani-alves.jpg";

export function AdminSidebar() {
  const { signOut, adminLevel } = useAuth();
  const perms = useAdminPermissions();

  const items = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: perms.canViewDashboard },
    { title: "Agenda", url: "/admin/agenda", icon: Calendar, show: perms.canViewAgenda },
    { title: "Meus Atendimentos", url: "/admin/my-appointments", icon: ClipboardList, show: perms.adminLevel === "professional" },
    { title: "Clientes", url: "/admin/clients", icon: Users, show: perms.canViewClients },
    { title: "Serviços", url: "/admin/services", icon: Scissors, show: perms.canViewServices },
    { title: "Planos", url: "/admin/plans", icon: Crown, show: perms.canViewPlans },
    { title: "Financeiro", url: "/admin/finance", icon: DollarSign, show: perms.canViewFinance },
    { title: "Relatórios", url: "/admin/reports", icon: BarChart3, show: perms.canViewReports },
    { title: "Usuários", url: "/admin/users", icon: ShieldCheck, show: perms.canViewUsers },
    { title: "Logs", url: "/admin/logs", icon: Activity, show: perms.canViewLogs },
  ].filter((i) => i.show);

  const levelLabel = adminLevel ? ADMIN_LEVEL_LABELS[adminLevel] : null;
  const levelColor = adminLevel ? ADMIN_LEVEL_COLORS[adminLevel] : "";

  return (
    <Sidebar className="border-r border-sidebar-border/60">
      {/* Logo */}
      <div className="p-4 pb-3 flex items-center justify-center border-b border-sidebar-border/40">
        <img
          src={logoImg}
          alt="Dani Alves Esmalteria"
          className="h-16 w-auto object-contain"
        />
      </div>

      {/* Level badge */}
      {levelLabel && (
        <div className="px-4 pt-3 pb-1">
          <Badge variant="outline" className={`text-xs w-full justify-center py-1 ${levelColor}`}>
            {levelLabel}
          </Badge>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium px-4">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="rounded-lg mx-2 px-3 py-2.5 transition-all duration-200 hover:bg-sidebar-accent"
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive rounded-lg"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
