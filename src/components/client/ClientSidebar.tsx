import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar, NavItem } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Crown, AlertTriangle, LayoutDashboard, CalendarPlus, History, User, BookOpen } from "lucide-react";

const items: NavItem[] = [
  { title: "Dashboard",        url: "/client",          icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { title: "Novo Agendamento", url: "/client/booking",  icon: CalendarPlus,    tourId: "sidebar-booking" },
  { title: "Histórico",        url: "/client/history",  icon: History,         tourId: "sidebar-history" },
  { title: "Meu Plano",        url: "/client/plans",    icon: Crown,           tourId: "sidebar-plans" },
  { title: "Perfil",           url: "/client/profile",  icon: User,            tourId: "sidebar-profile" },
  { title: "Cartilha de Uso",  url: "/client/manual",   icon: BookOpen },
];

export function ClientSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const planSlot = subscription ? (
    <div
      className="rounded-xl gradient-gold-subtle border border-primary/15 p-3 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate("/client/plans")}
    >
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
  );

  return (
    <AppSidebar
      items={items}
      groupLabel="Menu"
      bottomSlot={planSlot}
    />
  );
}
