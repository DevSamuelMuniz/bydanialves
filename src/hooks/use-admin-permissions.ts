import { useAuth, AdminLevel } from "@/contexts/AuthContext";

/**
 * Hierarquia: attendant < professional < manager < ceo
 * Cada nível herda as permissões dos níveis abaixo.
 */

const LEVEL_RANK: Record<NonNullable<AdminLevel>, number> = {
  attendant: 1,
  professional: 2,
  manager: 3,
  ceo: 4,
};

function rank(level: AdminLevel): number {
  if (!level) return 0;
  return LEVEL_RANK[level] ?? 0;
}

export function useAdminPermissions() {
  const { adminLevel } = useAuth();
  const r = rank(adminLevel);

  return {
    adminLevel,

    // ── Agenda ─────────────────────────────────────────
    /** Pode ver a agenda (todos os níveis) */
    canViewAgenda: r >= 1,
    /** Atendente e acima podem criar/editar agendamentos */
    canManageAgenda: r >= 1,
    /** Só gerente e CEO veem agenda de todos os profissionais */
    canViewAllProfessionalsAgenda: r >= 3,

    // ── Clientes ───────────────────────────────────────
    /** Atendente e acima podem ver e cadastrar clientes */
    canViewClients: r >= 1,
    canManageClients: r >= 1,

    // ── Serviços ───────────────────────────────────────
    canViewServices: r >= 1,
    /** Só gerente e CEO podem criar/editar serviços */
    canManageServices: r >= 3,

    // ── Planos ─────────────────────────────────────────
    canViewPlans: r >= 3,
    canManagePlans: r >= 4,

    // ── Financeiro ─────────────────────────────────────
    /** Profissional e acima veem comissão (só a própria) */
    canViewOwnCommission: r >= 2,
    /** Gerente vê relatórios de produtividade, mas não lucro líquido */
    canViewFinance: r >= 3,
    /** Apenas CEO vê faturamento total / lucro líquido */
    canViewFullFinance: r >= 4,
    canDeleteFinancialRecords: r >= 4,

    // ── Relatórios ─────────────────────────────────────
    canViewReports: r >= 3,
    canExportData: r >= 4,

    // ── Usuários / Configurações ───────────────────────
    canViewUsers: r >= 4,
    canManageUsers: r >= 4,
    canViewLogs: r >= 3,
    canManageSystemSettings: r >= 4,

    // ── Dashboard ──────────────────────────────────────
    canViewDashboard: r >= 1 && adminLevel !== "professional",
    /** Só CEO vê métricas financeiras no dashboard */
    canViewDashboardFinancials: r >= 4,
  };
}

export const ADMIN_LEVEL_LABELS: Record<NonNullable<AdminLevel>, string> = {
  attendant: "Atendente",
  professional: "Profissional",
  manager: "Gerente",
  ceo: "CEO",
};

export const ADMIN_LEVEL_COLORS: Record<NonNullable<AdminLevel>, string> = {
  attendant: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  professional: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  manager: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  ceo: "bg-primary/15 text-primary border-primary/30",
};
