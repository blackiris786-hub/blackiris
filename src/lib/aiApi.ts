/**
 * Supabase Edge Functions API client
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-moderation` : '/api');

const API_TIMEOUT = 60000; // 60 seconds

if (!API_BASE) {
  console.error('API base URL is missing');
}

interface ApiHeaders {
  'Content-Type': string;
  'Authorization': string;
}

function getHeaders(): ApiHeaders {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
  };
}

async function callApi<T>(endpoint: string, body: any): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let errorMsg = `API error: ${response.status}`;

        if (contentType.includes('application/json')) {
          const data = await response.json().catch(() => ({}));
          if (data.message) {
            errorMsg = data.message;
          } else if (data.error) {
            errorMsg = data.error;
          } else {
            errorMsg = `${errorMsg} - ${JSON.stringify(data)}`;
          }
        } else {
          const text = await response.text().catch(() => '');
          if (text) errorMsg = `${errorMsg} - ${text}`;
        }

        if (response.status === 503) {
          errorMsg = 'AI Service is being set up. Try again later.';
        } else if (response.status === 401) {
          errorMsg = 'Authentication failed. Sign in again.';
        }

        throw new Error(errorMsg);
      }

      const result = await response.json() as T;
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof TypeError && error.name === 'AbortError') {
      const msg = `API request timed out after ${API_TIMEOUT / 1000}s. Try a smaller image.`;
      throw new Error(msg);
    }
    throw error;
  }
}

// AI Chat
export async function aiChat(
  message: string,
  history: Array<{ role: string; text: string }> = [],
  systemPrompt = ''
): Promise<{ reply: string }> {
  return callApi<{ reply: string }>('/ai-chat', {
    message,
    history,
    systemPrompt,
  });
}

// Translate text
export async function aiTranslate(
  text: string,
  targetLanguage: string
): Promise<{ translatedText: string }> {
  return callApi<{ translatedText: string }>('/ai-translate', {
    text,
    targetLanguage,
  });
}

// Analyze image for plant detection
export async function analyzeImage(
  imageData: string
): Promise<{
  valid: boolean;
  points: number;
  reason: string;
  sourceFound: boolean;
}> {
  return callApi('/analyze-image', {
    imageData,
  });
}

// Webhook for post analysis
export async function analyzePlantPost(
  postId: string,
  imageUrl: string
): Promise<any> {
  return callApi('/analyze-image', {
    record: {
      id: postId,
      image_url: imageUrl,
    },
  });
}
