import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) throw new Error("appointmentId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca dados do agendamento com perfil e serviço
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("*, services(name), profiles!appointments_client_profile_fkey(full_name, phone), branches(name)")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) throw new Error("Agendamento não encontrado");

    const phone = appointment.profiles?.phone;
    const clientName = appointment.profiles?.full_name || "Cliente";
    const serviceName = appointment.services?.name || "Serviço";
    const branchName = appointment.branches?.name || "";
    const date = new Date(appointment.appointment_date + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long"
    });
    const time = appointment.appointment_time?.slice(0, 5);

    if (!phone) {
      return new Response(JSON.stringify({ ok: false, message: "Sem telefone cadastrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Formata o número: remove não-dígitos e garante código do país
    const digits = phone.replace(/\D/g, "");
    const formattedPhone = digits.startsWith("55") ? digits : `55${digits}`;

    const message = `Olá, ${clientName}! 🌟\n\nSeu agendamento foi *confirmado*!\n\n✂️ *Serviço:* ${serviceName}\n📅 *Data:* ${date}\n🕐 *Horário:* ${time}h${branchName ? `\n📍 *Unidade:* ${branchName}` : ""}\n\nEstamos te esperando! Qualquer dúvida, é só chamar. 💛\n\n_Salão Daniella Alves_`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    return new Response(
      JSON.stringify({ ok: true, phone: formattedPhone, waUrl, message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
