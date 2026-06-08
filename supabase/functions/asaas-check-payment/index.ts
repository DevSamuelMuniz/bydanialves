import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error } = await supabase.auth.getClaims(token);
    if (error || !claims?.claims) throw new Error("Sessão inválida");
    const userId = claims.claims.sub as string;

    const { paymentId } = await req.json();
    if (!paymentId) throw new Error("paymentId obrigatório");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: local } = await admin
      .from("payments")
      .select("*")
      .eq("asaas_payment_id", paymentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!local) throw new Error("Pagamento não encontrado");

    if (local.status === "received") {
      return new Response(JSON.stringify({ status: "received" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Query Asaas
    const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      headers: { "access_token": ASAAS_API_KEY, "User-Agent": "ByDaniAlves/1.0" },
    });
    const data = await res.json();
    const asaasStatus: string = data.status || "";

    if (asaasStatus === "RECEIVED" || asaasStatus === "CONFIRMED" || asaasStatus === "RECEIVED_IN_CASH") {
      // Activate (mirror webhook logic minimally)
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
          plan_id: local.plan_id,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
        } as any)
        .select()
        .single();
      await admin.from("payments").update({
        status: "received",
        paid_at: now.toISOString(),
        subscription_id: newSub?.id || null,
      } as any).eq("id", local.id);
      return new Response(JSON.stringify({ status: "received" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({ status: "pending", asaasStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
