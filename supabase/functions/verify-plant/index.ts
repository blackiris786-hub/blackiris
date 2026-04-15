// Supabase Edge Function (Deno runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload<T> = { record?: T };

type PostRecord = {
  id?: string | number;
  image_url?: string | null;
};

// Supabase provides SUPABASE_URL automatically in Edge Functions.
// Secrets cannot be named with SUPABASE_* via CLI, so we use SERVICE_ROLE_KEY.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      ...securityHeaders,
    },
  });
}

async function imageUrlToBase64(url: string): Promise<{ mimeType: string; data: string }> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch image (${resp.status})`);
  }
  const mimeType = resp.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let binary = "";
  // chunk to avoid call stack limits
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return { mimeType, data: btoa(binary) };
}

async function analyzeWithGemini(input: { mimeType: string; data: string }) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY secret");
  }

  const prompt =
    "You are a plant community moderator. Determine if the image is a real photo containing a plant. " +
    "Be lenient when a plant is visible. Reject only if clearly offensive, not a plant photo, or cartoon/AI art. " +
    "Respond ONLY with strict JSON: {\"is_plant\": boolean, \"plant_name\": string, \"confidence\": number, \"reason\": string}";

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
      GEMINI_API_KEY,
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: input.mimeType, data: input.data } },
            ],
          },
        ],
        generationConfig: { response_mime_type: "application/json", temperature: 0 },
      }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Gemini request failed (${resp.status}): ${text}`);
  }

  const aiData = await resp.json();
  const rawText =
    aiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
    aiData?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === "string")?.text;

  if (typeof rawText !== "string") {
    throw new Error("Gemini returned an unexpected response format");
  }

  return JSON.parse(rawText) as {
    is_plant?: boolean;
    plant_name?: string;
    confidence?: number;
    reason?: string;
  };
}

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" }, 500);
    }

    if (WEBHOOK_SECRET) {
      const provided = req.headers.get("x-webhook-secret") ?? "";
      if (provided !== WEBHOOK_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const payload = (await req.json()) as WebhookPayload<PostRecord> & { imageData?: string };
    const record = payload?.record ?? {};
    const postId = record.id;
    const imageUrl = record.image_url ?? null;

    if (!postId) {
      return json({ error: "Missing record.id in webhook payload" }, 400);
    }
    if (!imageUrl || typeof imageUrl !== "string") {
      return json({ error: "Missing record.image_url in webhook payload" }, 400);
    }

    const image = await imageUrlToBase64(imageUrl);
    const result = await analyzeWithGemini(image);

    const isPlant = !!result.is_plant;
    const plantName = typeof result.plant_name === "string" ? result.plant_name : "";
    const confidence = typeof result.confidence === "number" ? result.confidence : null;
    const reason = typeof result.reason === "string" ? result.reason : "";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { error } = await supabase
      .from('posts')
      .update({
        is_verified: isPlant,
        metadata: {
          ai_label: plantName,
          ai_confidence: confidence,
          ai_reason: reason,
          last_checked: new Date().toISOString(),
        },
      })
      .eq('id', postId);

    if (error) throw error;

    return json({ status: "success", verified: isPlant, confidence, label: plantName });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
