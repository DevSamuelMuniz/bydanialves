import { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoLight from "@/assets/logo_light.png";
import logoDark from "@/assets/logo_dark.png";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  tourId?: string;
  badge?: number;
}

interface AppSidebarProps {
  items: NavItem[];
  groupLabel: string;
  topBadge?: ReactNode;
  bottomSlot?: ReactNode;
}

export function AppSidebar({ items, groupLabel, topBadge, bottomSlot }: AppSidebarProps) {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const imgClass = collapsed ? "w-8 h-8 object-contain rounded-md" : "w-32 h-auto object-contain";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      {/* Logo */}
      <SidebarHeader className={`border-b border-sidebar-border/40 transition-all duration-200 ${collapsed ? "items-center p-3" : "items-center p-4 pb-3"}`}>
        {/* Show light logo on dark backgrounds, dark logo on light backgrounds */}
        <img src={logoLight} alt="Salão Daniella Alves" className={`${imgClass} hidden dark:block`} />
        <img src={logoDark}  alt="Salão Daniella Alves" className={`${imgClass} block dark:hidden`} />
        {/* Optional badge (e.g. admin level) */}
        {topBadge && !collapsed && (
          <div className="w-full pt-1">{topBadge}</div>
        )}
      </SidebarHeader>

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
