
## Análise do sistema atual

O sistema já tem uma base sólida com:
- Landing page com partículas, galeria, testemunhos, planos
- Área do cliente: dashboard, agendamento (5 etapas), histórico, planos, perfil
- Área admin: dashboard com KPIs, agenda (kanban), meus atendimentos, clientes, serviços, finanças, filiais, planos, cupons, usuários, logs
- RBAC com 4 níveis (atendente, profissional, gerente, CEO)
- Multi-filiais com filtro gerente/CEO
- Onboarding tour
- Assinaturas via Stripe

## O que pode ser implementado e melhorado

Abaixo está uma análise completa das oportunidades de melhoria, divididas por área:

---

### ÁREA DO CLIENTE

**1. Cancelamento de agendamento pelo cliente**
- Atualmente o cliente não pode cancelar seus próprios agendamentos pendentes/confirmados
- Adicionar botão "Cancelar" nos cards da aba "Pendentes" com confirmação
- Regra: só cancelar se a data ainda não passou

**2. Notificações em tempo real**
- O sino no header já existe mas não tem função
- Criar tabela `notifications` no banco
- Mostrar notificações push quando status do agendamento muda (pendente → confirmado → concluído)
- Badge com contador não lido

**3. Avaliação pós-atendimento**
- Após agendamento concluído, exibir modal ou card pedindo avaliação com estrelas (1-5) e comentário
- Criar tabela `reviews` no banco
- Exibir médias no dashboard admin

**4. Reagendamento**
- No histórico, botão "Reagendar" em agendamentos concluídos/cancelados
- Reutiliza o fluxo de booking já existente mas com serviço pré-selecionado

---

### ÁREA ADMINISTRATIVA

**5. Confirmação em lote na agenda**
- Seleção múltipla de agendamentos pendentes → confirmar todos de uma vez
- Economiza tempo em dias com muitos agendamentos

**6. Exportação de relatórios**
- No módulo Financeiro: botão "Exportar CSV" para os dados filtrados
- No módulo Clientes: exportar lista filtrada
- Implementar client-side com dados já carregados (sem necessidade de backend)

**7. Notificação WhatsApp automática**
- A edge function `send-whatsapp-confirmation` já existe mas pode não estar conectada ao fluxo de mudança de status
- Disparar WhatsApp automaticamente quando admin confirma ou conclui agendamento

**8. Foto de perfil para profissionais**
- Admin pode ver avatar do cliente mas profissionais não têm avatar visível na agenda
- Mostrar avatar do profissional responsável no card do agendamento

---

### LANDING PAGE

**9. Seção de galeria melhorada**
- Adicionar lightbox (modal com zoom) ao clicar nas fotos da galeria
- Navegação prev/next dentro do lightbox

**10. SEO + meta tags**
- Adicionar `<title>`, `<meta description>` e Open Graph tags no `index.html`
- Melhorar posicionamento orgânico

---

### GERAL / UX

**11. Modo dark/light automático**
- O toggle já existe mas poderia seguir a preferência do sistema automaticamente no primeiro acesso

**12. Feedback visual nos formulários**
- Adicionar animações de sucesso (check animado) após salvar perfil, confirmar agendamento, etc.

**13. Página de erro 404 melhorada**
- A NotFound.tsx já existe mas pode ter design mais elaborado com link de retorno

---

## Plano de implementação sugerido (prioridade alta)

Com base no impacto e viabilidade, as 3 funcionalidades mais valiosas a implementar agora seriam:

```text
PRIORIDADE ALTA
├── 1. Cancelamento pelo cliente (impacto direto na UX)
├── 2. Sistema de notificações (sino já está no header)
└── 3. Avaliação pós-atendimento (gera dados valiosos para o negócio)
```

### Detalhes técnicos

**Cancelamento pelo cliente:**
- Atualizar `ClientPendingAppointments.tsx` — adicionar AlertDialog de confirmação
- Update RLS: clientes podem atualizar `status = 'cancelled'` nos próprios agendamentos
- Sem migração de banco necessária

**Sistema de notificações:**
- Nova tabela `notifications(id, user_id, title, body, read, created_at)`
- RLS: usuário vê só as próprias notificações
- Trigger no banco ao mudar status do agendamento → insere notificação para o `client_id`
- Componente `NotificationBell.tsx` no `AppHeader.tsx` com dropdown e badge contador
- Realtime subscription para atualizar badge em tempo real

**Avaliação pós-atendimento:**
- Nova tabela `reviews(id, appointment_id, client_id, rating, comment, created_at)`
- No `ClientHistory.tsx` — botão "Avaliar" em cards com status `completed` sem avaliação
- No `AdminDashboard.tsx` — card com média de avaliações

Quer implementar todas as três, ou prefere escolher por qual começar?
