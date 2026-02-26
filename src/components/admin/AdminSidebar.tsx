import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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
import { LayoutDashboard, Users, Calendar, Scissors, DollarSign, BarChart3, LogOut, ShieldCheck, Crown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo-dani-alves.jpg";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Clientes", url: "/admin/clients", icon: Users },
  { title: "Agenda", url: "/admin/agenda", icon: Calendar },
  { title: "Serviços", url: "/admin/services", icon: Scissors },
  { title: "Planos", url: "/admin/plans", icon: Crown },
  { title: "Financeiro", url: "/admin/finance", icon: DollarSign },
  { title: "Relatórios", url: "/admin/reports", icon: BarChart3 },
  { title: "Usuários", url: "/admin/users", icon: ShieldCheck },
  { title: "Logs", url: "/admin/logs", icon: Activity },
];

export function AdminSidebar() {
  const { signOut } = useAuth();

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
