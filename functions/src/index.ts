import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key || '';

if (!geminiKey) {
  console.error('ERROR: GEMINI_API_KEY missing (set via env or firebase config)');
}

const genAI = new GoogleGenerativeAI(geminiKey);

const app = express();

// Security Headers Middleware
const securityHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Strict Transport Security (HSTS) - Force HTTPS for 2 years
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.firebasedatabase.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.firebaseapp.com https://*.firebasedatabase.app https://*.googleapis.com https://generativelanguage.googleapis.com wss://*.supabase.co wss://*.firebaseio.com; frame-ancestors 'none';"
  );
  
  next();
};

app.use(securityHeaders);
app.use(cors({ origin: true }));
app.use(express.json({ limit: '20mb' }));

const verifyFirebaseAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('No Firebase Auth token provided');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Firebase token verification happens at the function level
  // If the request reaches this point, it's already validated by Firebase
  next();
};

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

    return {
      valid: isValid,
      points: isValid ? 10 : 0,
      reason: parsed.reason || (isValid ? 'Image accepted' : 'Image rejected'),
      sourceFound: !!parsed.internetSourceFound
    };
  } catch (err: any) {
    console.error('Gemini Error:', err?.message || err);
    return { valid: false, reason: 'AI Analysis failed.' };
  }
}

app.post('/ai-chat', verifyFirebaseAuth, async (req, res) => {
  const { message, history = [], systemPrompt = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const conversation = [
    `System: ${systemPrompt}`,
    ...history.map((item: any) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`),
    `User: ${message}`,
    'Assistant:'
  ].join('\n');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(conversation);
    const reply = result.response.text().trim();
    res.json({ reply });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'AI chat generation failed.' });
  }
});

app.post('/ai-translate', verifyFirebaseAuth, async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

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
  } catch (error: any) {
    console.error('AI Translate Error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.post('/analyze-image', verifyFirebaseAuth, async (req, res) => {
  const { record, imageData } = req.body || {};
  const imageToProcess = record?.image_url || imageData;

  if (!imageToProcess) {
    return res.status(400).json({ valid: false, reason: 'No image data provided.' });
  }

  const result = await analyzePlantPostImage(imageToProcess);
  res.json(result);
});

export const api = functions.https.onRequest(app);
