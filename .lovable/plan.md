
# Implementação de Filiais (Multi-Branch)

## Visão Geral

Adicionar suporte a filiais no sistema, com seleção obrigatória no cadastro e no agendamento, e visualização restrita a CEO e Gerente no dashboard.

---

## 1. Banco de Dados

### Nova tabela: `branches`
Armazena as filiais cadastradas pela empresa.

```text
branches
├── id         uuid (PK)
├── name       text (ex: "Centro", "Jardins")
├── address    text (nullable)
├── active     boolean default true
├── created_at timestamptz
└── updated_at timestamptz
```

**RLS:**
- Qualquer usuário autenticado pode **ler** filiais ativas (necessário para o select no cadastro e agendamento)
- Somente admins podem **gerenciar** (INSERT/UPDATE/DELETE)

### Alterações em tabelas existentes

| Tabela | Coluna adicionada | Tipo | Notas |
|---|---|---|---|
| `profiles` | `branch_id` | uuid (FK → branches) | Filial preferida do cliente |
| `appointments` | `branch_id` | uuid (FK → branches) | Filial do agendamento |

---

## 2. Fluxo do Cliente — Cadastro (`/auth`)

Adicionar um campo **"Selecione a filial"** (Select) no formulário de cadastro, logo após cidade/telefone. A filial escolhida será salva em `profiles.branch_id` junto com `phone` e `gender`.

A lista de filiais será carregada do banco ao montar a aba de cadastro.

---

## 3. Fluxo do Cliente — Agendamento (`/client/booking`)

Adicionar um **Step 0** antes da seleção de serviço: o cliente escolhe a filial. O fluxo passa de 4 para 5 etapas:

```text
Passo 1 → Filial
Passo 2 → Serviço
Passo 3 → Data
Passo 4 → Horário
Passo 5 → Confirmação
```

- A filial selecionada aparece no card de confirmação
- O campo `branch_id` é salvo em `appointments` no momento da criação

---

## 4. Dashboard Administrativo — Visualização por Filial

Na página `AdminDashboard.tsx`, adicionar uma seção de **KPIs por Filial** visível somente para **CEO (r >= 4)** e **Gerente (r >= 3)**.

Será exibido um conjunto de cards e/ou um gráfico de barras com:
- Total de agendamentos por filial (no período)
- Receita por filial (quando o usuário tiver permissão financeira)

A permissão de visualização seguirá a constante já existente no hook:
- `canViewFinance: r >= 3` (Gerente e CEO)

---

## 5. Gestão de Filiais — Admin

Criar uma nova página `AdminBranches.tsx` acessível via menu lateral somente para CEO e Gerente, com operações de:
- Listar filiais
- Criar filial (nome + endereço)
- Ativar / desativar filial

Adicionar item "Filiais" ao `AdminSidebar.tsx` com permissão `canViewFinance` (r >= 3).

---

## Arquivos Modificados / Criados

| Arquivo | Operação | Motivo |
|---|---|---|
| Migration SQL | Criado | Tabela `branches`, colunas em `profiles` e `appointments` |
| `src/pages/Auth.tsx` | Editado | Select de filial no cadastro |
| `src/pages/client/NewBooking.tsx` | Editado | Passo 1 de seleção de filial |
| `src/pages/admin/AdminDashboard.tsx` | Editado | Seção de KPIs por filial (CEO/Gerente) |
| `src/pages/admin/AdminBranches.tsx` | Criado | CRUD de filiais |
| `src/components/admin/AdminSidebar.tsx` | Editado | Link "Filiais" no menu |
| `src/hooks/use-admin-permissions.ts` | Editado | Permissão `canViewBranches` |

---

## Controle de Acesso

| Ação | Nível mínimo |
|---|---|
| Ver filiais (select público) | Qualquer usuário autenticado |
| Ver KPIs de filiais no Dashboard | Gerente (r >= 3) |
| Gerenciar filiais (CRUD) | Gerente (r >= 3) |
| Ver receita por filial | CEO (r >= 4) |
