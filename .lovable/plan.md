
# Plano: Escova gratuita para assinantes com escovas disponiveis

## Resumo

Quando o cliente tiver um plano ativo com escovas disponiveis no mes, ao agendar um servico do tipo "escova", o valor exibido sera R$ 0,00 (cortesia do plano). Se ja tiver usado todas as escovas do plano, o preco normal sera cobrado. Servicos que nao sao "escova" continuam com preco normal.

---

## Mudancas no fluxo de agendamento (`NewBooking.tsx`)

1. **Ao carregar a pagina**, buscar tambem:
   - A assinatura ativa do cliente (`subscriptions` com `plans(*)`)
   - O numero de escovas ja usadas no mes atual (appointments com servico "escova", status != "cancelled")

2. **No Step 1 (lista de servicos)**, ao lado do servico de escova:
   - Se o cliente tem plano ativo E ainda tem escovas disponiveis: exibir "Cortesia do plano" e preco riscado ou R$ 0,00
   - Se o cliente tem plano mas ja usou todas: exibir preco normal
   - Para outros servicos: preco normal

3. **No Step 4 (confirmacao)**:
   - Se a escova sera coberta pelo plano: exibir "R$ 0,00 (incluso no plano)" no campo Valor
   - Caso contrario: exibir preco normal

4. **Logica de verificacao**: servico e "escova" se `service.name.toLowerCase().includes("escova")`. Escovas disponiveis = total do plano (parseado do campo `includes`) menos escovas usadas no mes.

---

## Detalhes Tecnicos

### Arquivo modificado: `src/pages/client/NewBooking.tsx`

**Novos estados:**
- `subscription` - assinatura ativa do cliente (com `plans(*)`)
- `escovasUsadas` - contagem de escovas usadas no mes
- `escovasDisponiveis` - calculado: total do plano - usadas

**Novos fetches no useEffect inicial:**
- `supabase.from("subscriptions").select("*, plans(*)").eq("client_id", user.id).eq("status", "active").maybeSingle()`
- `supabase.from("appointments").select("*, services(name)").eq("client_id", user.id).gte("appointment_date", startOfMonth).lte("appointment_date", endOfMonth).neq("status", "cancelled")` e filtrar por servicos com nome contendo "escova"

**Funcao auxiliar:**
- Reutilizar `parseEscovasFromIncludes()` (mesma logica do `ClientDashboard`)

**Calculo `isFreeEscova`:**
- `const isEscova = selectedService?.name?.toLowerCase().includes("escova")`
- `const isFreeEscova = isEscova && escovasDisponiveis > 0`

**Exibicao no Step 1 (card do servico):**
- Se escova + escovas disponiveis > 0: mostrar preco riscado + badge "Incluso no plano"
- Senao: preco normal

**Exibicao no Step 4 (confirmacao):**
- Valor: `isFreeEscova ? "R$ 0,00 (incluso no plano)" : "R$ " + price`

**Nenhuma mudanca no insert** do appointment - o agendamento continua sendo inserido normalmente. A diferenca e apenas visual (o preco exibido). A cobranca real pode ser controlada pelo admin no fluxo financeiro.
