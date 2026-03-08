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
    canViewAgenda: r >= 1,
    canManageAgenda: r >= 1,
    canViewAllProfessionalsAgenda: r >= 3,

    // ── Clientes ───────────────────────────────────────
    canViewClients: r >= 1,
    canManageClients: r >= 1,

    // ── Serviços ───────────────────────────────────────
    canViewServices: r >= 1,
    canManageServices: r >= 3,

    // ── Planos ─────────────────────────────────────────
    canViewPlans: r >= 3,
    canManagePlans: r >= 4,

    // ── Financeiro ─────────────────────────────────────
    canViewOwnCommission: r >= 2,
    canViewFinance: r >= 3,
    canViewFullFinance: r >= 4,
    canDeleteFinancialRecords: r >= 4,

    // ── Relatórios ─────────────────────────────────────
    canViewReports: r >= 4,
    canExportData: r >= 4,

    // ── Usuários / Configurações ───────────────────────
    canViewUsers: r >= 4,
    canManageUsers: r >= 4,
    canViewLogs: r >= 4,
    canManageCoupons: r >= 4,
    canManageSystemSettings: r >= 4,

    // ── Filiais ────────────────────────────────────────
    canViewBranches: r >= 3,
    canManageBranches: r >= 3,

    // ── Dashboard ──────────────────────────────────────
    canViewDashboard: r >= 2 && adminLevel !== "professional",
    canViewDashboardFinancials: r >= 4,
    canViewBranchKpis: r >= 3,

    // ── TV de Fila ─────────────────────────────────────
    canViewQueueTV: adminLevel === "attendant" || adminLevel === "manager" || adminLevel === "ceo",
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
