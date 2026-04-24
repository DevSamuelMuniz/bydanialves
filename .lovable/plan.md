

# Integração Asaas — Pagamentos PIX, Boleto e Cartão

## Objetivo
Substituir/complementar o fluxo atual de pagamento (hoje via Stripe) por **Asaas**, suportando PIX, Boleto e Cartão de Crédito, com webhook seguro, idempotência e liberação automática de assinatura.

## Contexto atual
- O sistema usa **Stripe** para checkout de planos (`create-checkout`, `check-subscription`, `customer-portal`, `sync-plan-stripe`).
- Tabelas relevantes: `plans`, `subscriptions`, `profiles`, `activity_logs`.
- Não existe ainda tabela de pagamentos detalhados nem campo `asaas_customer_id` em `profiles`.

## Decisões de arquitetura
- O backend Lovable Cloud é **Supabase Edge Functions** (Deno), não Express. Os arquivos pedidos (`AsaasService.ts`, `AsaasRoutes.ts`, etc.) serão adaptados para **Edge Functions** equivalentes, mantendo a separação lógica solicitada.
- Stripe **continuará coexistindo** (não será removido) — Asaas será adicionado como provedor alternativo. Cliente escolhe método no checkout.
- Ambiente padrão: **Sandbox**, controlado por `ASAAS_BASE_URL`.

---

## 1. Banco de dados (migration)

### Nova coluna em `profiles`
- `asaas_customer_id text` (nullable) — armazena o ID do cliente no Asaas.

### Nova tabela `payments`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | client_id |
| plan_id | uuid | nullable |
| subscription_id | uuid | nullable |
| asaas_payment_id | text unique | |
| asaas_customer_id | text | |
| status | text | pending/confirmed/received/overdue/refunded/cancelled |
| billing_type | text | PIX/CREDIT_CARD/BOLETO |
| value | numeric | |
| invoice_url | text | |
| pix_qr_code | text | |
| pix_copy_paste | text | |
| due_date | date | |
| created_at / paid_at | timestamptz | |

RLS: cliente vê os próprios; admin vê todos; insert/update apenas via service role (edge function).

### Nova tabela `processed_webhooks` (idempotência)
| Campo | Tipo |
|---|---|
| id | uuid PK |
| event_id | text unique |
| event_type | text |
| processed_at | timestamptz default now() |
| payload | jsonb |

RLS: somente service role.

---

## 2. Secrets necessários
Solicitar ao usuário via `add_secret`:
- `ASAAS_API_KEY` — chave da API Asaas (Sandbox no início)
- `ASAAS_BASE_URL` — `https://sandbox.asaas.com/api/v3` ou produção
- `ASAAS_WEBHOOK_TOKEN` — token enviado no header `asaas-access-token` para validar webhooks

---

## 3. Edge Functions (estrutura modular)

Pasta lógica única `supabase/functions/asaas-*` (Edge Functions não suportam subpastas, então cada módulo vira uma function):

### `supabase/functions/_shared/asaas/` (compartilhado, importado pelas functions)
- **`AsaasTypes.ts`** — interfaces (Customer, Payment, WebhookEvent, BillingType).
- **`AsaasDTO.ts`** — schemas Zod para validar entradas (createPayment, webhook).
- **`AsaasService.ts`** — wrapper HTTP do Asaas:
  - `createCustomer(profile)`
  - `createPayment({ customer, billingType, value, dueDate, description })`
  - `createPixPayment()` / `createBoletoPayment()` / `createCreditCardPayment()`
  - `getPayment(id)`
  - `getPixQrCode(paymentId)` — endpoint `/payments/{id}/pixQrCode`
  - `refundPayment(id)` / `cancelPayment(id)`
  - `request()` interno com headers `access_token`, retries e timeout.

### `supabase/functions/asaas-create-payment/index.ts` (POST `/payments/create`)
1. Valida JWT do usuário (`auth.getClaims`).
2. Lê body com Zod: `{ planId, billingType }`.
3. Busca `profile`. Se não tem `asaas_customer_id` → cria customer no Asaas e salva.
4. Busca `plan` para preço/descrição.
5. Cria payment no Asaas com `dueDate` = hoje+3 dias.
6. Se PIX → busca QR Code.
7. Insere em `payments` com status `pending`.
8. Retorna `{ paymentId, invoiceUrl, pixQrCode, pixCopyPaste, status }`.

### `supabase/functions/asaas-webhook/index.ts` (POST público — `verify_jwt = false`)
1. Lê header `asaas-access-token` e compara com `ASAAS_WEBHOOK_TOKEN` (timing-safe). Rejeita 401 se inválido.
2. Lê payload `{ event, payment }`.
3. Idempotência: tenta inserir em `processed_webhooks` com `event_id = payment.id + ':' + event`. Se conflito → retorna 200 (ignorar).
4. Localiza linha em `payments` por `asaas_payment_id`.
5. Switch por evento:
   - `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `status = 'received'`, `paid_at = now()`. Cria/ativa `subscriptions` (status `active`, `expires_at = now()+30d`). Cancela assinatura ativa anterior do mesmo cliente.
   - `PAYMENT_OVERDUE` → `status = 'overdue'`.
   - `PAYMENT_REFUNDED` → `status = 'refunded'` + cancela subscription relacionada.
   - `PAYMENT_CREATED` → log apenas.
6. Insere `activity_logs` (`asaas_webhook_processed`).
7. Retorna 200 sempre que processado/ignorado; 4xx só para erros de validação/auth.

### `supabase/functions/asaas-check-payment/index.ts`
- Endpoint para o frontend fazer **polling** após o cliente pagar via PIX (caso o webhook atrase). Consulta Asaas + atualiza DB se `status` mudou para `RECEIVED`.

### `supabase/config.toml`
- Adicionar bloco para `asaas-webhook` com `verify_jwt = false`.

---

## 4. Frontend

### Novo componente `src/components/AsaasCheckoutModal.tsx`
- Aberto a partir do botão "Assinar" nos planos.
- Usuário escolhe método: **PIX**, **Boleto** ou **Cartão** (radio).
- Chama `supabase.functions.invoke("asaas-create-payment", { body: { planId, billingType } })`.
- Renderiza conforme retorno:
  - **PIX**: QR Code (img base64) + botão "Copiar código Pix" + polling a cada 5s em `asaas-check-payment` até `status === 'received'`.
  - **Boleto**: link `invoiceUrl` + botão abrir em nova aba.
  - **Cartão**: redireciona para `invoiceUrl` (checkout hospedado do Asaas).
- Ao confirmar pagamento → fecha modal, mostra toast de sucesso e redireciona para `/client`.

### Integração nas telas de planos
- `ClientPlans.tsx` e `LandingPage.tsx`: ao lado do botão atual de Stripe, adicionar/substituir por "Assinar com Asaas" abrindo o `AsaasCheckoutModal`.
- `PublicInvite.tsx` (etapa de planos): mesmo tratamento.

### Helper `src/lib/asaas.ts`
- Função `createAsaasPayment(planId, billingType)` encapsulando o invoke + tratamento de erro com `translateError`.

---

## 5. Segurança
- Webhook protegido por token + idempotência em `processed_webhooks`.
- `asaas-create-payment` valida JWT e nunca confia em valores vindos do client (preço sempre lido de `plans`).
- Validação de body com Zod em todas as functions.
- Logs em `activity_logs` para criação de pagamento, webhook recebido, webhook processado, falhas.

---

## 6. Tratamento de erros
- HTTP errors do Asaas → propagados como mensagens traduzidas no toast.
- Timeout (10s) com `AbortController`.
- Webhook duplicado → 200 + log "ignored".
- Customer inexistente → recriado on-the-fly.

---

## 7. Plano de entrega (ordem de execução após aprovação)

1. Migration: tabelas `payments`, `processed_webhooks`, coluna `asaas_customer_id`.
2. Solicitar secrets `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN`.
3. Criar arquivos compartilhados em `supabase/functions/_shared/asaas/`.
4. Criar Edge Functions: `asaas-create-payment`, `asaas-webhook`, `asaas-check-payment`.
5. Atualizar `supabase/config.toml` (verify_jwt do webhook).
6. Frontend: `AsaasCheckoutModal`, helper, integração em `ClientPlans`, `LandingPage`, `PublicInvite`.
7. Informar ao usuário a URL do webhook para cadastrar no painel Asaas:
   `https://vugesuaephjbygtpyese.supabase.co/functions/v1/asaas-webhook`

---

## Observações importantes
- **Stripe não será removido** — coexistirá. Se quiser remover, peça explicitamente.
- Ambiente inicial = **Sandbox** (definido pela `ASAAS_BASE_URL`). Para produção, basta trocar a env e a chave.
- O fluxo de cartão usa a **página hospedada do Asaas** (não tokenização local) — mais simples e PCI-safe. Se quiser checkout transparente com tokenização, é um escopo extra.

