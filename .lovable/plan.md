
## Problem

The `fetchClients` function in `AdminClients.tsx` fetches ALL rows from `profiles` without filtering out team members (admins with roles: manager/ceo/attendant/professional). This causes admin staff to appear in the client list.

The current query:
```typescript
let query = supabase.from("profiles").select("*").order("full_name");
```

It only filters by `branch_id` for restricted roles — it never excludes profiles that have an `admin` role in `user_roles`.

## Fix

### Approach: Fetch admin user_ids first, then exclude them from profiles query

Since there's no direct FK between `profiles` and `user_roles`, we need a two-step approach:

1. Query `user_roles` to get all `user_id`s that have `role = 'admin'` (this covers all admin levels: attendant, professional, manager, ceo — they all have `role = 'admin'` in the `user_roles` table)
2. Use `.not("user_id", "in", (...))` to exclude those user_ids from the profiles query

This is a clean, fully client-side join — no DB changes needed, no migration required.

### Code change — `src/pages/admin/AdminClients.tsx`, `fetchClients` function (lines 69–84)

Replace:
```typescript
const fetchClients = async () => {
  let query = supabase.from("profiles").select("*").order("full_name");
  if (isRestricted && adminBranchId) {
    query = query.eq("branch_id", adminBranchId);
  }
  const { data } = await query;
  ...
};
```

With:
```typescript
const fetchClients = async () => {
  // Step 1: get all user_ids that have any admin role
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  const adminUserIds = (adminRoles || []).map((r) => r.user_id);

  // Step 2: fetch profiles excluding those user_ids
  let query = supabase.from("profiles").select("*").order("full_name");

  if (adminUserIds.length > 0) {
    query = query.not("user_id", "in", `(${adminUserIds.join(",")})`);
  }

  if (isRestricted && adminBranchId) {
    query = query.eq("branch_id", adminBranchId);
  }

  const { data } = await query;
  ...
};
```

## Why this works

- All admin staff (CEO, manager, attendant, professional) are stored in `user_roles` with `role = 'admin'` — the `admin_level` column differentiates their rank, but `role` is always `'admin'`
- Regular clients have `role = 'client'` and are NOT in the exclusion list
- This requires no DB migration, no new RLS policies, and no schema changes
- Only one file to change: `src/pages/admin/AdminClients.tsx`
