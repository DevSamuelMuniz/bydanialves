import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Token obrigatório" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from("queue_tv_tokens")
    .select("id, active, label")
    .eq("token", token)
    .eq("active", true)
    .single();

  if (tokenError || !tokenData) {
    return new Response(
      JSON.stringify({ error: "Token inválido ou expirado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch today's appointments
  const today = new Date().toISOString().split("T")[0];
  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_time,
      status,
      services!inner(name),
      profiles!appointments_client_profile_fkey(full_name),
      branches(name)
    `)
    .eq("appointment_date", today)
    .neq("status", "cancelled")
    .order("appointment_time", { ascending: true });

  if (apptError) {
    return new Response(
      JSON.stringify({ error: "Falha ao carregar agendamentos" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const mapped = (appointments || []).map((a: any) => ({
    id: a.id,
    appointment_time: a.appointment_time?.slice(0, 5) ?? "--:--",
    client_name: a.profiles?.full_name ?? "Cliente",
    service_name: a.services?.name ?? "Serviço",
    status: a.status,
    branch_name: a.branches?.name ?? null,
  }));

  return new Response(
    JSON.stringify({ appointments: mapped, label: tokenData.label }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
