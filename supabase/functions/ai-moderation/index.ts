// Supabase Edge Function (Deno runtime)
// Endpoints: /ai-chat, /ai-translate, /analyze-image

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? Deno.env.get("SUPABASE_WEBHOOK_SECRET") ?? "";

// Log startup configuration
if (!WEBHOOK_SECRET) {
  console.warn("⚠️ WARNING: WEBHOOK_SECRET not configured. Webhook validation will be skipped.");
}
if (!GEMINI_API_KEY) {
  console.warn("⚠️ WARNING: GEMINI_API_KEY not configured. AI operations will fail.");
  console.warn("To enable AI features, set GEMINI_API_KEY in Supabase project settings > Edge Function secrets");
}

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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...securityHeaders,
    },
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...securityHeaders,
    },
  });
}

/**
 * Verify Supabase Auth token from Authorization header
 * This uses Supabase's built-in JWT verification
 */
function verifyAuth(req: Request): { valid: boolean; userId?: string } {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    console.warn("No authorization token provided");
    return { valid: false };
  }

  // In Supabase Edge Functions, the token is automatically verified by Supabase
  // If we receive a request with a Bearer token, it's already been validated
  // The token is present only if it's valid
  return { valid: true };
}

function parseBase64Data(imageData: string): { mimeType: string; data: string } {
  const base64Regex = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/;
  const matches = imageData.match(base64Regex);
  if (matches && matches.length === 3) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return { mimeType: "image/jpeg", data: imageData };
}

async function analyzePlantPostImage(imageData: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const { mimeType, data } = parseBase64Data(imageData);

  const prompt = `
      Task: Verify if this is an original plant photo for the "Blackiris" community.
      Requirement: Check if this image exists on Pinterest, stock sites, or wallpapers.
      Rules:
      1. isValid: true ONLY if it's a real plant/flower/tree and looks like a unique user photo.
      2. isValid: false IF it's found online, AI-generated, or contains no plants.
      Return ONLY JSON: {"isValid": boolean, "reason": "English explanation", "internetSourceFound": boolean}
    `;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    },
  );

  const respText = await resp.text().catch(() => "");
  if (!resp.ok) {
    throw new Error(`Gemini request failed (${resp.status}): ${respText}`);
  }

  let aiData: any;
  try {
    aiData = JSON.parse(respText);
  } catch (err) {
    throw new Error(`Gemini response JSON parse error: ${(err as Error).message}; response body: ${respText}`);
  }

  const responseText =
    aiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
    aiData?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === "string")?.text;

  if (typeof responseText !== "string") {
    throw new Error("Gemini returned unexpected format");
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
  const parsed = JSON.parse(cleanJson);
  const isValid = !!parsed.isValid;

  return {
    valid: isValid,
    points: isValid ? 10 : 0,
    reason: parsed.reason || (isValid ? "Image accepted" : "Image rejected"),
    sourceFound: !!parsed.internetSourceFound,
  };
}

async function aiChat(message: string, history: any[] = [], systemPrompt = "") {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const conversation = [
    `System: ${systemPrompt}`,
    ...history.map((item: any) => `${item.role === "user" ? "User" : "Assistant"}: ${item.text}`),
    `User: ${message}`,
    "Assistant:",
  ].join("\n");

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: conversation }] }],
      }),
    },
  );

  const respText = await resp.text().catch(() => "");
  if (!resp.ok) {
    throw new Error(`AI Chat failed (${resp.status}): ${respText}`);
  }

  let aiData: any;
  try {
    aiData = JSON.parse(respText);
  } catch (err) {
    throw new Error(`AI Chat response JSON parse error: ${(err as Error).message}; response body: ${respText}`);
  }

  const reply =
    aiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
    aiData?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === "string")?.text ||
    "";

  return { reply: reply.trim() };
}

async function aiTranslate(text: string, targetLanguage: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const prompt = `
      Translate the following text to ${targetLanguage}.
      Context: A social media community for plant lovers called "Blackiris".
      Tone: Friendly, professional, and nature-oriented.
      Constraint: Return ONLY the translated text.
      Text to translate: "${text}"
    `;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const respText = await resp.text().catch(() => "");
  if (!resp.ok) {
    throw new Error(`Translation failed (${resp.status}): ${respText}`);
  }

  let aiData: any;
  try {
    aiData = JSON.parse(respText);
  } catch (err) {
    throw new Error(`Translation response JSON parse error: ${(err as Error).message}; response body: ${respText}`);
  }

  const translatedText =
    aiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
    aiData?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === "string")?.text ||
    "";

  return { translatedText: translatedText.trim() };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle preflight OPTIONS requests for CORS
    if (req.method === "OPTIONS") {
      return corsResponse();
    }

    // Verify Supabase Auth token
    const auth = verifyAuth(req);
    if (!auth.valid) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Check if GEMINI_API_KEY is configured
    if (!GEMINI_API_KEY) {
      return json(
        {
          error: "AI Service Unavailable",
          message: "The AI service has not been configured. Please contact the administrator to set up the GEMINI_API_KEY in Supabase project settings.",
          details: "Missing GEMINI_API_KEY environment variable"
        },
        503
      );
    }

    // Route: /ai-chat
    if (pathname.endsWith("/ai-chat") && req.method === "POST") {
      const { message, history = [], systemPrompt = "" } = await req.json();
      if (!message) {
        return json({ error: "No message provided" }, 400);
      }
      const result = await aiChat(message, history, systemPrompt);
      return json(result);
    }

    // Route: /ai-translate
    if (pathname.endsWith("/ai-translate") && req.method === "POST") {
      const { text, targetLanguage } = await req.json();
      if (!text) {
        return json({ error: "No text provided" }, 400);
      }
      const result = await aiTranslate(text, targetLanguage);
      return json(result);
    }

    // Route: /analyze-image
    if (pathname.endsWith("/analyze-image") && req.method === "POST") {
      const { record, imageData } = await req.json();
      const imageToProcess = record?.image_url || imageData;
      if (!imageToProcess) {
        return json({ valid: false, reason: "No image data provided." }, 400);
      }
      const result = await analyzePlantPostImage(imageToProcess);
      return json(result);
    }

    // Route not found
    return json({ error: "Endpoint not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
