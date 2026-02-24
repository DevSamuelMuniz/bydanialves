import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    // Verify user is admin
    const dbClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: roleData } = await dbClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Admin access required");

    const { planId, name, price } = await req.json();
    if (!planId || !name || price == null) throw new Error("Missing planId, name, or price");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Check if plan already has a stripe_price_id
    const { data: plan } = await dbClient
      .from("plans")
      .select("stripe_price_id")
      .eq("id", planId)
      .single();

    let priceId = plan?.stripe_price_id;

    if (priceId) {
      // Price already exists — deactivate old price and create new one on same product
      const oldPrice = await stripe.prices.retrieve(priceId);
      const productId = typeof oldPrice.product === "string" ? oldPrice.product : (oldPrice.product as any).id;
      
      // Update product name
      await stripe.products.update(productId, { name });
      
      // Deactivate old price and create new one
      await stripe.prices.update(priceId, { active: false });
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(price * 100),
        currency: "brl",
        recurring: { interval: "month" },
      });
      priceId = newPrice.id;
    } else {
      // Create new product + price
      const product = await stripe.products.create({ name });
      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: "brl",
        recurring: { interval: "month" },
      });
      priceId = newPrice.id;
    }

    // Save stripe_price_id to DB
    await dbClient
      .from("plans")
      .update({ stripe_price_id: priceId })
      .eq("id", planId);

    return new Response(JSON.stringify({ stripe_price_id: priceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
