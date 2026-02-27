import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const prompts: Record<string, string> = {
  "Corte de cabelo": "Professional hair cut salon scene, close-up of scissors cutting dark hair, elegant barbershop atmosphere, warm golden lighting, luxury aesthetic, photorealistic",
  "Pintar cabelo": "Hair coloring salon treatment, foils and color being applied to hair, vibrant hair dye, professional stylist hands, luxurious salon environment, warm tones, photorealistic",
  "escova algo mais": "Professional hair blow-dry brushing session, round brush and hair dryer, sleek shiny hair, glamorous salon, soft warm lighting, photorealistic",
  "Escova": "Elegant hair blowout styling, professional round brush, smooth silky hair, luxury beauty salon, golden bokeh background, photorealistic close-up",
};

async function generateImage(prompt: string, lovableApiKey: string): Promise<string | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    console.error("AI error:", await response.text());
    return null;
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  return imageUrl ?? null;
}

async function base64ToBlob(dataUrl: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const [meta, base64] = dataUrl.split(",");
  const contentType = meta.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch all active services
    const { data: services, error } = await supabase
      .from("services")
      .select("id, name, image_url")
      .eq("active", true);

    if (error) throw error;

    const results: { id: string; name: string; status: string; url?: string }[] = [];

    for (const service of services ?? []) {
      console.log(`Generating image for: ${service.name}`);

      const prompt = prompts[service.name] ??
        `Professional beauty salon service: ${service.name}, luxury aesthetic, warm golden lighting, photorealistic`;

      const imageDataUrl = await generateImage(prompt, lovableApiKey);
      if (!imageDataUrl) {
        results.push({ id: service.id, name: service.name, status: "failed" });
        continue;
      }

      const { bytes, contentType } = await base64ToBlob(imageDataUrl);
      const ext = contentType.split("/")[1] ?? "png";
      const filePath = `services/${service.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(filePath, bytes, { contentType, upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        results.push({ id: service.id, name: service.name, status: "upload_failed" });
        continue;
      }

      const { data: publicData } = supabase.storage
        .from("service-images")
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      await supabase.from("services").update({ image_url: publicUrl }).eq("id", service.id);

      results.push({ id: service.id, name: service.name, status: "ok", url: publicUrl });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
