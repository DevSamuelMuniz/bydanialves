
# Filiais como Sistemas Independentes

## Objetivo

Cada funcionário (Atendente, Profissional) deve ver somente os dados da filial onde trabalha. Gerente e CEO têm visão global de todas as filiais.

---

## 1. Banco de Dados — Vincular Funcionários a Filiais

Hoje, `profiles` já tem `branch_id` (filial do cliente). Precisamos associar também os **funcionários** admin a uma filial.

A tabela `user_roles` é o lugar correto para isso (é a tabela de papéis admin). Adicionaremos uma coluna `branch_id` nela:

```sql
ALTER TABLE public.user_roles ADD COLUMN branch_id uuid REFERENCES public.branches(id);
```

O CEO e Gerente ficarão com `branch_id = null` (acesso global).  
Atendentes e Profissionais terão um `branch_id` definido.

---

## 2. AuthContext — Expor a Filial do Funcionário

O `AuthContext` já carrega `adminLevel`. Vamos adicionar `adminBranchId` ao contexto, lido de `user_roles.branch_id`.

```tsx
// AuthContext.tsx
adminBranchId: string | null;
```

Assim, qualquer componente pode chamar `useAuth().adminBranchId` para saber a filial do funcionário logado.

---

## 3. Agenda Admin — Filtrar por Filial

Atendentes/Profissionais (`r < 3`) verão **somente** agendamentos da sua filial.  
Gerentes/CEO (`r >= 3`) verão todos, com um **seletor de filial** opcional para filtrar.

Mudança em `AdminAgenda.tsx`:
```ts
// Se adminBranchId existe, filtra automaticamente
if (adminBranchId) query = query.eq("branch_id", adminBranchId);
```

---

## 4. Meus Atendimentos — Filtrar por Filial

Mesma lógica em `AdminMyAppointments.tsx`: se o funcionário tem filial, só carrega atendimentos daquela filial.

---

## 5. Dashboard — KPIs Isolados por Filial

- **Atendente/Profissional**: vê KPIs apenas da sua filial (total de agendamentos do dia/semana).
- **Gerente/CEO**: vê KPIs globais + seção comparativa por filial já implementada.

---

## 6. Gestão de Usuários — Atribuir Filial ao Funcionário

Na página `AdminUsers.tsx`, ao criar ou editar um funcionário admin, o Gerente/CEO poderá definir a filial dele no campo de edição de perfil.

---

## 7. Gestão de Filiais — Exibir Funcionários por Filial

Em `AdminBranches.tsx`, adicionar uma listagem de quantos funcionários estão associados a cada filial.

---

## Arquivos Modificados

| Arquivo | O que muda |
|---|---|
| Migration SQL | `ALTER TABLE user_roles ADD COLUMN branch_id` |
| `src/contexts/AuthContext.tsx` | Expõe `adminBranchId` |
| `src/pages/admin/AdminAgenda.tsx` | Filtra por filial automaticamente |
| `src/pages/admin/AdminMyAppointments.tsx` | Filtra por filial automaticamente |
| `src/pages/admin/AdminDashboard.tsx` | KPIs filtrados por filial |
| `src/pages/admin/AdminUsers.tsx` | Campo de filial ao editar funcionário |
| `src/pages/admin/AdminBranches.tsx` | Contagem de funcionários por filial |

---

## Regras de Acesso Resumidas

| Nível | Vê agendamentos de | Vê financeiro de |
|---|---|---|
| Atendente | Só sua filial | Não tem acesso |
| Profissional | Só sua filial | Não tem acesso |
| Gerente | Todas as filiais | Sua filial |
| CEO | Todas as filiais | Todas |
