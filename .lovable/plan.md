
# Plano: Planos integrados ao Admin e Cliente

## Resumo

O AdminPlans ja existe com CRUD completo. Agora vou integrar os planos ao lado do cliente, criando uma pagina dedicada para visualizar e assinar planos, e exibindo o plano ativo do cliente no dashboard e no fluxo de agendamento.

---

## 1. Admin - Melhorias no AdminPlans (ja existente)

O AdminPlans ja possui:
- Criar, editar, excluir planos
- Ativar/desativar planos (toggle)
- Visualizar assinaturas ativas e cancelar

**Ajuste necessario:** Adicionar a opcao de o admin atribuir manualmente um plano a um cliente (vincular assinatura pelo admin).

## 2. Cliente - Nova pagina "Meu Plano" (`/client/plans`)

Nova pagina onde o cliente pode:
- Ver os planos disponiveis com precos, beneficios e restricoes
- Ver seu plano atual (se tiver assinatura ativa)
- Assinar um plano (cria registro na tabela `subscriptions`)
- Cancelar sua assinatura ativa

## 3. Cliente - Dashboard integrado ao plano

No `ClientDashboard`, exibir:
- Card destacado com o plano ativo do cliente (nome, preco, o que inclui)
- Quantidade de escovas usadas no mes vs total do plano
- Se nao tem plano, exibir CTA para conhecer os planos

## 4. Cliente - Sidebar atualizada

Adicionar item "Meu Plano" no menu lateral do cliente com icone `Crown`.

## 5. Rota no App.tsx

Adicionar rota `/client/plans` apontando para a nova pagina.

---

## Detalhes Tecnicos

### Novos Arquivos
- `src/pages/client/ClientPlans.tsx` - pagina de visualizacao e assinatura de planos

### Arquivos Modificados
- `src/pages/client/ClientDashboard.tsx` - card do plano ativo + escovas usadas no mes
- `src/components/client/ClientSidebar.tsx` - novo item "Meu Plano"
- `src/App.tsx` - nova rota `/client/plans`
- `src/pages/admin/AdminPlans.tsx` - adicionar funcao de vincular plano a cliente pelo admin

### Logica de escovas usadas no mes
- Contar agendamentos do mes atual do cliente onde o servico e "Escova" (ou similar) e status != "cancelled"
- Comparar com o numero de escovas do plano (extraido do campo `includes`, ex: "04 escovas por mes" -> 4)

### Fluxo de assinatura pelo cliente
1. Cliente acessa `/client/plans`
2. Ve os planos ativos com cards estilizados
3. Clica em "Assinar" -> insere na tabela `subscriptions` com `client_id = auth.uid()`, `plan_id`, `status = "active"`, `started_at = now()`, `expires_at = now() + 30 dias`
4. Se ja tem assinatura ativa, nao pode assinar outro (botao desabilitado)

### Fluxo de atribuicao pelo admin
1. No AdminPlans, botao "Vincular Cliente"
2. Dialog com select de clientes (busca da tabela profiles)
3. Admin escolhe cliente e plano, cria a subscription

### Sequencia de Implementacao
1. `ClientPlans.tsx` (nova pagina)
2. `ClientSidebar.tsx` (novo item no menu)
3. `App.tsx` (nova rota)
4. `ClientDashboard.tsx` (card do plano ativo)
5. `AdminPlans.tsx` (vincular cliente a plano)
