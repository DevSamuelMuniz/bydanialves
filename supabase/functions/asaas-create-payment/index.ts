import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || "";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

async function asaasFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
        "User-Agent": "ByDaniAlves/1.0",
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg = json?.errors?.[0]?.description || json?.message || `Asaas error ${res.status}`;
      throw new Error(msg);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) throw new Error("Sessão inválida");
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) || "";

    const body = await req.json().catch(() => ({}));
    const planId: string = body.planId;
    const billingType: BillingType = body.billingType;
    if (!planId || !["PIX", "BOLETO", "CREDIT_CARD"].includes(billingType)) {
      throw new Error("Parâmetros inválidos");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Plan
    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("id, name, price, description")
      .eq("id", planId)
      .single();
    if (planErr || !plan) throw new Error("Plano não encontrado");

    // Profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, user_id, full_name, phone, asaas_customer_id, cpf")
      .eq("user_id", userId)
      .maybeSingle();

    // Ensure customer exists in Asaas
    let asaasCustomerId: string | null = (profile as any)?.asaas_customer_id || null;
    if (!asaasCustomerId) {
      const customer = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: profile?.full_name || userEmail || "Cliente",
          email: userEmail,
          mobilePhone: profile?.phone || undefined,
          cpfCnpj: (profile as any)?.cpf || undefined,
          notificationDisabled: false,
        }),
      });
      asaasCustomerId = customer.id;
      await admin.from("profiles").update({ asaas_customer_id: asaasCustomerId } as any).eq("user_id", userId);
    }

    // Due date = today + 3
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDate = due.toISOString().slice(0, 10);

    // Create payment
    const payment = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType,
        value: Number(plan.price),
        dueDate,
        description: `Assinatura ${plan.name} — By Dani Alves`,
        externalReference: `${userId}:${planId}`,
      }),
    });

    let pixQrCode: string | null = null;
    let pixCopyPaste: string | null = null;
    if (billingType === "PIX") {
      try {
        const qr = await asaasFetch(`/payments/${payment.id}/pixQrCode`);
        pixQrCode = qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null;
        pixCopyPaste = qr.payload || null;
      } catch (e) {
        console.error("pixQrCode error:", (e as Error).message);
      }
    }

    // Insert row
    await admin.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      asaas_payment_id: payment.id,
      asaas_customer_id: asaasCustomerId,
      status: "pending",
      billing_type: billingType,
      value: Number(plan.price),
      invoice_url: payment.invoiceUrl || null,
      pix_qr_code: pixQrCode,
      pix_copy_paste: pixCopyPaste,
      due_date: dueDate,
    } as any);

    await admin.from("activity_logs").insert({
      user_id: userId,
      performed_by: userId,
      action: "asaas_payment_created",
      entity: "payments",
      entity_id: payment.id,
      details: { plan_id: planId, billing_type: billingType, value: Number(plan.price) },
    } as any);

    return new Response(JSON.stringify({
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl,
      pixQrCode,
      pixCopyPaste,
      status: "pending",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("asaas-create-payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
