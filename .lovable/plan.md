
## Context

The current `AdminBonification.tsx` page is very basic — it reads data from `plan_professionals`, shows a total pool (10% hardcoded), and has a simple per-professional hours input with no persistence, no rules management, no configuration, and no payment tracking.

The user wants a **complete bonification management system** on this page:
- Create/configure bonus rules (per plan, with custom percentage)
- Manage which professionals participate
- Set values and percentages
- Register bonification payments with hours worked
- View paid/pending history

## What needs to be built

### 1. New database table: `bonification_rules`
Stores the rules that define bonus percentages per plan:
```sql
CREATE TABLE bonification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
  percentage numeric NOT NULL DEFAULT 10,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: only admins
```

### 2. New database table: `bonification_payments`
Stores actual payments/records of bonuses paid out to professionals:
```sql
CREATE TABLE bonification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  plan_id uuid REFERENCES plans(id),
  rule_id uuid REFERENCES bonification_rules(id),
  hours_worked numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL,
  reference_period text NOT NULL,  -- e.g. "Março 2026"
  status text NOT NULL DEFAULT 'pending',  -- pending | paid
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: only admins
```

### 3. Completely rebuild `AdminBonification.tsx`

The page will have 3 tabs:

**Tab 1 — Regras (Rules)**
- List of bonification rules per plan
- Button "Nova Regra" opens a dialog to:
  - Select plan (dropdown)
  - Set percentage (input, default 10%)
  - Add description (text)
  - Active/inactive toggle
- Edit and delete rules
- Shows: plan name, percentage, description, status badge

**Tab 2 — Profissionais (Professionals)**
- Lists professionals linked to plans (`plan_professionals` + `profiles`)
- For each professional: shows their name, avatar, linked plans, and computed bonus based on rules
- Button "Registrar Lançamento" opens dialog to:
  - Pre-filled professional name
  - Select plan (from their linked plans)
  - Input hours worked
  - Reference period (month/year text or month picker)
  - Notes
  - Calculates bonus automatically using the rule for the selected plan
  - Saves to `bonification_payments`

**Tab 3 — Histórico (History)**
- Lists all `bonification_payments` with:
  - Professional name, plan name, period, hours, value, status
- Filter by status (pending/paid)
- Filter by period
- Button "Marcar como Pago" to update `status = 'paid'` + set `paid_at`
- Shows KPI summary: total pending, total paid, total overall

**KPI bar at top (always visible):**
- Total fundo de bonificação disponível (sum of active rules × plan prices)
- Total pendente de pagamento (sum of pending payment records)
- Total pago no período

## Files to change

1. **New migration** — creates `bonification_rules` and `bonification_payments` tables with RLS policies
2. **`src/pages/admin/AdminBonification.tsx`** — full rebuild with 3-tab system

No changes needed to sidebar, App.tsx, or permissions (already correct).

## Technical approach

- Use `react-hook-form` + `zod` for the rule and payment dialogs for validation
- Use existing `Dialog`, `Tabs`, `Card`, `Badge`, `Input`, `Select`, `Button` components
- Fetch: plans, plan_professionals+profiles, bonification_rules, bonification_payments
- Rule percentage is stored per plan in `bonification_rules`; if no rule exists for a plan, fall back to 10%
- Bonus amount formula: `(plan_price × percentage / 100)` per plan the professional is linked to
- Payment registration: calculates from the rule at time of creation (stored as `bonus_amount`)
