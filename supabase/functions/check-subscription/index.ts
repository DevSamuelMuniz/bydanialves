import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map Stripe price IDs to DB plan IDs
const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1T4BUGCYbhQ9R1GXkj34MsYP": "ef1be08b-36ce-4f36-8a5a-ec573bddc2e9", // BASIC CHIC
  "price_1T4BUZCYbhQ9R1GXJ0O1ynoB": "545c2bea-6561-41bb-8be5-4d3a7dd185a4", // FASHION
  "price_1T4BUlCYbhQ9R1GXeadYhSJy": "5c23ef55-ba6f-4820-bf17-b29e1879f79c", // GLAMOUR
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      const priceId = sub.items.data[0].price.id;
      planId = PRICE_PLAN_MAP[priceId] || null;
      logStep("Active subscription", { priceId, planId, subscriptionEnd });

      // Sync to DB: upsert subscription record
      // First cancel any existing active subscriptions
      await supabaseClient
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("client_id", user.id)
        .eq("status", "active");

      if (planId) {
        await supabaseClient.from("subscriptions").insert({
          client_id: user.id,
          plan_id: planId,
          status: "active",
          started_at: new Date(sub.current_period_start * 1000).toISOString(),
          expires_at: subscriptionEnd,
        });
      }
    } else {
      logStep("No active subscription");
      // Cancel DB subscriptions if no Stripe sub
      await supabaseClient
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("client_id", user.id)
        .eq("status", "active");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_id: planId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
