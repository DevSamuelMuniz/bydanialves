import { ReactNode } from "react";
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
  SidebarFooter } from
"@/components/ui/sidebar";
import { LogOut, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo-dani-alves.jpg";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  items: NavItem[];
  groupLabel: string;
  topBadge?: ReactNode;
  bottomSlot?: ReactNode;
}

export function AppSidebar({ items, groupLabel, topBadge, bottomSlot }: AppSidebarProps) {
  const { signOut } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border/60">
      {/* Logo */}
      <div className="p-4 pb-3 flex items-center justify-center border-b border-sidebar-border/40">
        <img
          src={logoImg}
          alt="Dani Alves Esmalteria"
          className="w-28 h-auto object-contain" />

      </div>

      {/* Optional badge (e.g. admin level) */}
      {topBadge &&
      <div className="px-4 pt-3 pb-1">{topBadge}</div>
      }

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium px-4">
            {groupLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    end
                    className="rounded-lg mx-2 px-3 py-2.5 transition-all duration-200 hover:bg-sidebar-accent"
                    activeClassName="bg-primary/10 text-primary font-medium shadow-sm">

                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Optional bottom slot (e.g. plan status) */}
      {bottomSlot &&
      <div className="border-t border-sidebar-border/40 p-3 space-y-3">
          {bottomSlot}
        </div>
      }

      <SidebarFooter className="p-3 pt-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive rounded-lg"
          onClick={signOut}>

          <LogOut className="mr-3 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>);

}