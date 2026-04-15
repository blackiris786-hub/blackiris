import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuration & Initializations
const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const EXPECTED_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || '';
const genAI = new GoogleGenerativeAI(apiKey);

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY missing in .env');
}

// --- INITIALIZE APP FIRST ---
const app = express();

// 2. Middleware Setup
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'x-webhook-secret'],
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json({ limit: '20mb' })); 

// 3. Security Middleware
const verifyWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const incomingSecret = req.headers['x-webhook-secret'];
  if (!incomingSecret || incomingSecret !== EXPECTED_SECRET) {
    console.error('Unauthorized request.');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// --- Helpers ---

function parseBase64Data(imageData: string) {
  const base64Regex = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/;
  const matches = imageData.match(base64Regex);
  if (matches && matches.length === 3) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return { mimeType: 'image/jpeg', data: imageData };
}

async function analyzePlantPostImage(imageData: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} }] 
    });

    const { mimeType, data } = parseBase64Data(imageData);

    const prompt = `
      Task: Verify if this is an original plant photo for the "Blackiris" community.
      Requirement: Use Google Search to check if this image exists on Pinterest, stock sites, or wallpapers.
      Rules:
      1. isValid: true ONLY if it's a real plant/flower/tree and looks like a unique user photo.
      2. isValid: false IF it's found online, AI-generated, or contains no plants.
      Return ONLY JSON: {"isValid": boolean, "reason": "English explanation", "internetSourceFound": boolean}
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data, mimeType } }] }],
      generationConfig: { temperature: 0.1 },
    });

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(cleanJson);
    const isValid = !!parsed.isValid;

    console.log(`Result: ${isValid ? 'VALID' : 'REJECTED'} | Reason: ${parsed.reason}`);

    return {
      valid: isValid,
      points: isValid ? 10 : 0,
      reason: parsed.reason || (isValid ? 'Image accepted' : 'Image rejected'),
      sourceFound: parsed.internetSourceFound || false
    };
  } catch (err: any) {
    console.error('Gemini Error:', err.message);
    return { valid: false, reason: 'AI Analysis failed.' };
  }
}

// 4. API Routes

// Route: AI Chat
app.post('/api/ai-chat', verifyWebhook, async (req, res) => {
  const { message, history = [], systemPrompt = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  try {
    const conversation = [
      `System: ${systemPrompt}`,
      ...history.map((item: any) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`),
      `User: ${message}`,
      'Assistant:'
    ].join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(conversation);
    const reply = result.response.text().trim();
    res.json({ reply });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'AI chat generation failed.' });
  }
});

// Route: AI Translation
app.post('/api/ai-translate', verifyWebhook, async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const prompt = `
      Translate the following text to ${targetLanguage}.
      Context: A social media community for plant lovers called "Blackiris".
      Tone: Friendly, professional, and nature-oriented.
      Constraint: Return ONLY the translated text.
      Text to translate: "${text}"
    `;

    const result = await model.generateContent(prompt);
    const translatedText = result.response.text().trim();
    res.json({ translatedText });
  } catch {
    res.status(500).json({ error: "Translation failed" });
  }
});

// Route: Image Moderation
app.post('/api/analyze-image', verifyWebhook, async (req, res) => {
  console.log('Received analysis request...');
  const { record, imageData } = req.body || {};
  const imageToProcess = record?.image_url || imageData;

  if (!imageToProcess) {
    return res.status(400).json({ valid: false, reason: 'No image data provided.' });
  }

  const result = await analyzePlantPostImage(imageToProcess);
  return res.json(result);
});

// 5. Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
🚀 Blackiris AI Moderation Server
📡 Listening on Port: ${PORT}
🌿 Model: Gemini 2.5 Flash-Lite
🌐 Google Search Grounding: ENABLED
  `);
});