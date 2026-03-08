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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import logoLight from "@/assets/logo_light.png";
import logoDark from "@/assets/logo_dark.png";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  tourId?: string;
}

interface AppSidebarProps {
  items: NavItem[];
  groupLabel: string;
  topBadge?: ReactNode;
  bottomSlot?: ReactNode;
}

export function AppSidebar({ items, groupLabel, topBadge, bottomSlot }: AppSidebarProps) {
  const { signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const logoSrc = resolvedTheme === "dark" ? logoLight : logoDark;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      {/* Logo */}
      <div className={`flex items-center border-b border-sidebar-border/40 transition-all duration-200 ${collapsed ? "justify-center p-3" : "justify-center p-4 pb-3"}`}>
        {collapsed ? (
          <img
            src={logoSrc}
            alt="Dani Alves Esmalteria"
            className="w-8 h-8 object-contain rounded-md"
          />
        ) : (
          <img
            src={logoSrc}
            alt="Dani Alves Esmalteria"
            className="w-32 h-auto object-contain"
          />
        )}
      </div>

      {/* Optional badge (e.g. admin level) */}
      {topBadge && !collapsed && (
        <div className="px-4 pt-3 pb-1">{topBadge}</div>
      )}

      <SidebarContent className="flex-1">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium px-4">
              {groupLabel}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      id={item.tourId}
                      to={item.url}
                      end
                      className={`rounded-lg transition-all duration-200 hover:bg-sidebar-accent ${collapsed ? "mx-1 px-2 py-2.5 justify-center" : "mx-2 px-3 py-2.5"}`}
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Optional bottom slot */}
      {bottomSlot && !collapsed && (
        <div className="border-t border-sidebar-border/40 p-3 space-y-3">
          {bottomSlot}
        </div>
      )}

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
