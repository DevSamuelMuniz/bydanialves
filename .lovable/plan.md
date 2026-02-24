
# Plano: Features Avançadas para Admin - Controle Total

## Resumo

Vou expandir significativamente o painel administrativo para dar visibilidade e controle total sobre clientes, agendamentos e finanças. As melhorias incluem detalhes completos de clientes, gestao de usuarios, filtros avancados na agenda e financeiro, e um log de atividades.

---

## 1. Gestao de Clientes Expandida (AdminClients)

**Atualmente:** Lista simples com nome e telefone.

**Melhorias:**
- Exibir email do cliente (buscar da tabela `auth.users` via edge function)
- Mostrar quantidade de agendamentos e ultimo agendamento de cada cliente
- Ao clicar no cliente, abrir um dialog/painel com:
  - Historico completo de agendamentos (com status e servico)
  - Total gasto pelo cliente
  - Opcao de editar nome/telefone do perfil
  - Opcao de bloquear/desbloquear cliente (novo campo `blocked` na tabela profiles)
- Filtros: buscar por nome, telefone ou email

## 2. Agenda com Filtros e Acoes (AdminAgenda)

**Atualmente:** Lista dos ultimos 50 agendamentos com troca de status.

**Melhorias:**
- Filtro por data (date picker para selecionar periodo)
- Filtro por status (pendente, confirmado, concluido, cancelado)
- Filtro por servico
- Mostrar valor do servico em cada card
- Botao para cancelar agendamento com confirmacao
- Exibir notas/observacoes do agendamento
- Campo para admin adicionar notas ao agendamento
- Paginacao para ver mais que 50 registros

## 3. Financeiro Expandido (AdminFinance)

**Atualmente:** Lista de registros com totais simples.

**Melhorias:**
- Filtro por periodo (data inicio/fim)
- Filtro por tipo (entrada/saida)
- Permitir registrar tanto entradas quanto saidas (atualmente so saidas)
- Editar e excluir registros financeiros existentes
- Exibir cliente/servico associado quando o registro vier de um agendamento

## 4. Dashboard Melhorado (AdminDashboard)

**Atualmente:** 3 KPIs + agenda do dia.

**Melhorias:**
- KPI de agendamentos pendentes (aguardando confirmacao)
- KPI de agendamentos da semana
- Grafico rapido de receita dos ultimos 7 dias (mini bar chart)
- Lista dos ultimos 5 clientes cadastrados

## 5. Gestao de Usuarios/Roles (Nova pagina)

**Nova rota:** `/admin/users`

- Listar todos os usuarios com suas roles
- Promover cliente para admin ou remover role admin
- Ver status da conta (ativo, email verificado)

---

## Detalhes Tecnicos

### Banco de Dados

1. **Novo campo `blocked` na tabela `profiles`:**
```sql
ALTER TABLE public.profiles ADD COLUMN blocked boolean NOT NULL DEFAULT false;
```

2. **Edge function `admin-get-users`** para buscar emails da tabela `auth.users` (nao acessivel via client SDK):
   - Recebe lista de user_ids
   - Retorna emails usando `supabase-admin` (service role key)
   - Protegida: valida que o caller e admin

### Novos Arquivos
- `src/pages/admin/AdminUsers.tsx` - pagina de gestao de roles
- `supabase/functions/admin-get-users/index.ts` - edge function para dados de auth

### Arquivos Modificados
- `src/pages/admin/AdminClients.tsx` - expansao com detalhes, historico, bloqueio
- `src/pages/admin/AdminAgenda.tsx` - filtros, notas, paginacao
- `src/pages/admin/AdminFinance.tsx` - filtros, edicao, entradas/saidas
- `src/pages/admin/AdminDashboard.tsx` - novos KPIs e graficos
- `src/components/admin/AdminSidebar.tsx` - novo item "Usuarios"
- `src/App.tsx` - nova rota `/admin/users`

### Sequencia de Implementacao
1. Migracao do banco (campo `blocked`)
2. Edge function `admin-get-users`
3. AdminClients expandido
4. AdminAgenda com filtros
5. AdminFinance expandido
6. AdminDashboard melhorado
7. AdminUsers (nova pagina)
8. Sidebar e rotas atualizadas
