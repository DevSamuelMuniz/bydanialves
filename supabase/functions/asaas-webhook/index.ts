import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = req.headers.get("asaas-access-token") || "";
    if (!WEBHOOK_TOKEN || !timingSafeEqual(token, WEBHOOK_TOKEN)) {
      console.warn("Webhook: token inválido");
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const event: string = payload.event;
    const payment = payload.payment;
    if (!event || !payment?.id) {
      return new Response(JSON.stringify({ error: "invalid payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const eventId = `${payment.id}:${event}`;
    const { error: dupErr } = await admin
      .from("processed_webhooks")
      .insert({ event_id: eventId, event_type: event, payload } as any);
    if (dupErr) {
      // duplicate
      console.log("Webhook duplicado ignorado:", eventId);
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook recebido:", event, payment.id);

    // Find local payment
    const { data: localPayment } = await admin
      .from("payments")
      .select("*")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    if (!localPayment) {
      console.warn("Payment não encontrado localmente:", payment.id);
      return new Response(JSON.stringify({ status: "no-local-payment" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = localPayment.user_id;
    const planId = localPayment.plan_id;

    const isReceived = event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
    const isOverdue = event === "PAYMENT_OVERDUE";
    const isRefunded = event === "PAYMENT_REFUNDED" || event === "PAYMENT_CHARGEBACK_REQUESTED";

    if (isReceived) {
      // Cancel previous active subscription
      await admin
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() } as any)
        .eq("client_id", userId)
        .eq("status", "active");

      const now = new Date();
      const expires = new Date(now);
      expires.setDate(expires.getDate() + 30);

      const { data: newSub } = await admin
        .from("subscriptions")
        .insert({
          client_id: userId,
          plan_id: planId,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
        } as any)
        .select()
        .single();

      await admin
        .from("payments")
        .update({
          status: "received",
          paid_at: now.toISOString(),
          subscription_id: newSub?.id || null,
        } as any)
        .eq("id", localPayment.id);

      console.log("Pagamento confirmado e assinatura ativada:", userId, planId);
    } else if (isOverdue) {
      await admin.from("payments").update({ status: "overdue" } as any).eq("id", localPayment.id);
    } else if (isRefunded) {
      await admin.from("payments").update({ status: "refunded" } as any).eq("id", localPayment.id);
      if (localPayment.subscription_id) {
        await admin
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() } as any)
          .eq("id", localPayment.subscription_id);
      }
    } else {
      console.log("Evento sem ação:", event);
    }

    await admin.from("activity_logs").insert({
      user_id: userId,
      performed_by: userId,
      action: "asaas_webhook_processed",
      entity: "payments",
      entity_id: payment.id,
      details: { event, status: payment.status },
    } as any);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("asaas-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
