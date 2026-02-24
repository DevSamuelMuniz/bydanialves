import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { LayoutDashboard, CalendarPlus, History, User, LogOut, Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoImg from "@/assets/logo-dani-alves.jpg";

const items = [
  { title: "Dashboard", url: "/client", icon: LayoutDashboard },
  { title: "Novo Agendamento", url: "/client/booking", icon: CalendarPlus },
  { title: "Histórico", url: "/client/history", icon: History },
  { title: "Meu Plano", url: "/client/plans", icon: Crown },
  { title: "Perfil", url: "/client/profile", icon: User },
];

export function ClientSidebar() {
  const { user, signOut } = useAuth();
  const [subscription, setSubscription] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("*, plans(name, price)")
      .eq("client_id", user.id)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setSubscription(data));
  }, [user]);

  const daysUntilExpiry = subscription?.expires_at
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <Sidebar className="border-r border-sidebar-border/60 flex flex-col">
      {/* Logo */}
      <div className="p-4 pb-3 flex items-center justify-center border-b border-sidebar-border/40">
        <img
          src={logoImg}
          alt="Dani Alves Esmalteria"
          className="h-16 w-auto object-contain"
        />
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium px-4">
            Menu
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

      {/* Plan status section */}
      <div className="border-t border-sidebar-border/40 p-3 space-y-3">
        {subscription ? (
          <div className="rounded-xl gradient-gold-subtle border border-primary/15 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                {subscription.plans?.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              R$ {Number(subscription.plans?.price).toFixed(2)}/mês
            </p>
            {daysUntilExpiry !== null && (
              <div className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 ${
                isExpired
                  ? "bg-destructive/10 text-destructive"
                  : isExpiringSoon
                    ? "bg-warning/15 text-warning-foreground"
                    : "bg-success/10 text-success"
              }`}>
                {isExpired ? (
                  <><AlertTriangle className="h-3 w-3" /> Plano vencido</>
                ) : isExpiringSoon ? (
                  <><AlertTriangle className="h-3 w-3" /> Vence em {daysUntilExpiry} dia{daysUntilExpiry !== 1 ? "s" : ""}</>
                ) : (
                  <>Vence em {daysUntilExpiry} dias</>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-muted-foreground/20 p-3 text-center space-y-1.5">
            <Crown className="h-4 w-4 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Sem plano ativo</p>
            <NavLink to="/client/plans" className="text-xs text-primary font-medium hover:underline">
              Ver planos →
            </NavLink>
          </div>
        )}
      </div>

      <SidebarFooter className="p-3 pt-0">
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
