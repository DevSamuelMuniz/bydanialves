import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const errText = await response.text();
    console.error("AI error:", response.status, errText);
    if (response.status === 429) throw new Error("Rate limit atingido. Tente novamente em instantes.");
    if (response.status === 402) throw new Error("Créditos insuficientes no workspace Lovable AI.");
    throw new Error(`Erro na geração de imagem: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  return imageUrl ?? null;
}

/** Converte dataURL base64 em Uint8Array usando chunks para evitar stack overflow */
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  let base64: string;
  let contentType = "image/png";

  if (dataUrl.includes(",")) {
    const [meta, b64] = dataUrl.split(",");
    contentType = meta.match(/:(.*?);/)?.[1] ?? "image/png";
    base64 = b64;
  } else {
    base64 = dataUrl;
  }

  // Remove whitespace
  base64 = base64.replace(/\s/g, "");

  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  const CHUNK = 8192;

  for (let i = 0; i < len; i += CHUNK) {
    const end = Math.min(i + CHUNK, len);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }

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

    const body = await req.json().catch(() => ({}));
    const singleServiceId: string | undefined = body.serviceId;
    const singleServiceName: string | undefined = body.serviceName;

    let servicesToProcess: { id: string; name: string; image_url: string | null }[] = [];

    if (singleServiceId && singleServiceName) {
      servicesToProcess = [{ id: singleServiceId, name: singleServiceName, image_url: null }];
    } else {
      const { data: services, error } = await supabase
        .from("services")
        .select("id, name, image_url")
        .eq("active", true);
      if (error) throw error;
      servicesToProcess = (services ?? []).filter((s) => !s.image_url);
    }

    const results: { id: string; name: string; status: string; url?: string }[] = [];

    for (const service of servicesToProcess) {
      console.log(`Generating image for: ${service.name}`);

      const prompt = `Professional beauty salon service: ${service.name}, luxury aesthetic, warm golden lighting, photorealistic, high quality, elegant`;

      let imageDataUrl: string | null = null;
      try {
        imageDataUrl = await generateImage(prompt, lovableApiKey);
      } catch (genErr) {
        const msg = genErr instanceof Error ? genErr.message : String(genErr);
        console.error("Generation error:", msg);
        results.push({ id: service.id, name: service.name, status: `failed: ${msg}` });
        continue;
      }

      if (!imageDataUrl) {
        results.push({ id: service.id, name: service.name, status: "failed: no image returned" });
        continue;
      }

      let bytes: Uint8Array;
      let contentType: string;

      try {
        ({ bytes, contentType } = dataUrlToBytes(imageDataUrl));
      } catch (parseErr) {
        console.error("Parse error:", parseErr);
        results.push({ id: service.id, name: service.name, status: "failed: parse error" });
        continue;
      }

      const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
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

      const publicUrl = publicData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("services").update({ image_url: publicUrl }).eq("id", service.id);

      results.push({ id: service.id, name: service.name, status: "ok", url: publicUrl });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Fatal error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
