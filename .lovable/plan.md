

# Sistema Web para Salão de Beleza 💇‍♀️✨

## Visão Geral
Sistema completo com **2 módulos** (Área do Cliente + CRM Administrativo) integrados via Supabase, com design **Elegante/Luxo em tons brancos e dourados**.

---

## 🎨 Design & Identidade Visual
- **Paleta**: Fundo branco/off-white, detalhes e acentos em dourado, textos em cinza escuro/preto
- **Tipografia**: Fontes serifadas para títulos, sans-serif clean para corpo
- **Estilo**: Minimalista luxuoso, espaçamentos generosos, bordas sutis douradas
- **Mobile-first**: Layout responsivo otimizado para celular

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas principais:
1. **profiles** — Nome, telefone, avatar (vinculado a auth.users)
2. **user_roles** — Controle de papéis (cliente/admin) com enum `app_role`
3. **services** — Nome, descrição, preço, duração, imagem
4. **appointments** — Cliente, serviço, data/hora, status (pendente/confirmado/concluído/cancelado)
5. **financial_records** — Tipo (entrada/saída), valor, descrição, vínculo com agendamento
6. **contacts** — Mensagens do formulário de contato (opcional futuro)

### Segurança:
- RLS em todas as tabelas
- Função `has_role()` para verificação de admin sem recursão
- Clientes veem apenas seus próprios dados

---

## 🔐 Módulo: Autenticação
- **Login/Cadastro** com E-mail/Senha e Google OAuth
- Página de **recuperação de senha**
- Redirecionamento automático baseado no papel (cliente → dashboard cliente, admin → CRM)
- Proteção de rotas: clientes bloqueados de acessar rotas admin

---

## 👤 Módulo: Área do Cliente

### Tela: Dashboard do Cliente
- Boas-vindas personalizadas
- Próximos agendamentos em destaque
- Botão rápido "Novo Agendamento"

### Tela: Novo Agendamento
- **Passo 1**: Escolher serviço (cards com nome, preço e duração)
- **Passo 2**: Escolher data no calendário (dias disponíveis)
- **Passo 3**: Escolher horário fixo disponível (slots como 9h, 10h, 11h...)
- **Passo 4**: Confirmação e pagamento via Stripe
- Notificação toast de sucesso

### Tela: Histórico
- Lista de agendamentos passados com status e detalhes
- Filtros por período

### Navegação
- Sidebar/header com: Dashboard, Novo Agendamento, Histórico, Perfil, Sair

---

## 🛠️ Módulo: CRM Administrativo

### Tela: Dashboard Admin
- Resumo do dia: agendamentos de hoje
- Faturamento do mês (card de destaque)
- Gráfico de receita semanal/mensal

### Tela: Gestão de Clientes
- Lista de todos os clientes com busca
- Detalhes do cliente com histórico completo de atendimentos
- CRUD completo

### Tela: Controle de Agenda
- Visão em lista/calendário de todos os agendamentos
- Alterar status: pendente → confirmado → concluído / cancelado
- Filtros por data e status

### Tela: Gestão de Serviços
- CRUD de serviços (nome, preço, duração, descrição)
- Ativar/desativar serviços

### Tela: Painel Financeiro
- Fluxo de caixa: entradas automáticas (agendamentos concluídos) + saídas manuais
- Integração com Stripe para visualização de pagamentos
- Resumo por período

### Tela: Relatórios
- Serviços mais agendados (gráfico de barras)
- Receita por período (gráfico de linhas)
- Filtros de data

### Navegação
- Sidebar com: Dashboard, Clientes, Agenda, Serviços, Financeiro, Relatórios, Sair

---

## 💳 Integração Stripe
- Pagamento no momento do agendamento
- Registro automático de entrada financeira ao concluir

---

## 📱 Extras de UX
- Botão flutuante do WhatsApp em todas as telas
- Toasts/notificações para ações importantes
- Loading states e skeletons para carregamento suave

