import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, securityHeaders } from '../_shared/cors.ts';

const HCAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') || '';
const HCAPTCHA_SITEKEY = '7fb82e80-31c0-4eba-b03e-d94eb3a63150'; // Public sitekey
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

interface RateLimitRequest {
  email: string;
  ip: string;
  action: string;
}

interface RateLimitResponse {
  allowed: boolean;
  message: string;
  attempts?: number;
  maxAttempts?: number;
  resetTime?: string;
}

/**
 * In-memory rate limit store (will reset on function restart)
 * For production, use Redis or a database
 */
const rateLimitStore = new Map<string, {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number;
}>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check rate limit for email/IP combination
 */
function checkRateLimit(key: string): RateLimitResponse {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Check if blocked
  if (entry && entry.blockedUntil > now) {
    return {
      allowed: false,
      message: 'Too many attempts. Please try again later.',
      attempts: entry.attempts,
      maxAttempts: MAX_ATTEMPTS,
      resetTime: new Date(entry.blockedUntil).toISOString(),
    };
  }

  // Clear old entries
  if (entry && now - entry.firstAttempt > WINDOW_MS + BLOCK_DURATION_MS) {
    rateLimitStore.delete(key);
    return {
      allowed: true,
      message: 'Rate limit check passed',
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (!entry) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: 0,
    });
    return {
      allowed: true,
      message: 'Rate limit check passed',
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  entry.attempts += 1;

  if (entry.attempts > MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      allowed: false,
      message: 'Too many attempts. Please try again later.',
      attempts: entry.attempts,
      maxAttempts: MAX_ATTEMPTS,
      resetTime: new Date(entry.blockedUntil).toISOString(),
    };
  }

  return {
    allowed: true,
    message: 'Rate limit check passed',
    attempts: entry.attempts,
    maxAttempts: MAX_ATTEMPTS,
  };
}

/**
 * Verify hCaptcha token using official hCaptcha API
 * Follows hCaptcha's official verification endpoint spec
 */
async function verifyCaptcha(token: string, remoteip: string): Promise<{ success: boolean; errors?: string[] }> {
  if (!HCAPTCHA_SECRET) {
    console.error('HCAPTCHA_SECRET not configured in Supabase secrets');
    return { success: false, errors: ['HCAPTCHA_SECRET not configured'] };
  }

  try {
    const payload = new URLSearchParams({
      response: token,
      secret: HCAPTCHA_SECRET,
      remoteip: remoteip,
      sitekey: HCAPTCHA_SITEKEY,
    });

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      console.error(`CAPTCHA verification failed: ${response.statusText}`);
      return { success: false, errors: ['Verification service error'] };
    }

    const data = await response.json();
    console.log(`CAPTCHA verification result: ${data.success ? 'SUCCESS' : 'FAILED'}`);
    
    return {
      success: data.success === true,
      errors: data['error-codes'] || [],
    };
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return { success: false, errors: ['Verification failed'] };
  }
}

/**
 * Get client IP from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    const { email, captchaToken, action = 'login' } = await req.json();
    const ip = getClientIP(req);
    const emailKey = `login:email:${email.toLowerCase()}`;
    const ipKey = `login:ip:${ip}`;

    console.log(`🔐 Auth verification attempt: ${action} from ${ip} for ${email}`);

    // Check rate limits (both email and IP)
    const emailLimit = checkRateLimit(emailKey);
    const ipLimit = checkRateLimit(ipKey);

    if (!emailLimit.allowed) {
      console.warn(`⚠️ Email rate limit exceeded for ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'rate_limit_exceeded',
          message: emailLimit.message,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!ipLimit.allowed) {
      console.warn(`⚠️ IP rate limit exceeded from ${ip}`);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'ip_rate_limit_exceeded',
          message: 'Too many login attempts from your location. Please try again later.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify CAPTCHA
    if (!captchaToken || typeof captchaToken !== 'string') {
      console.warn(`⚠️ Missing CAPTCHA token for ${email}`);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'missing_captcha',
          message: 'CAPTCHA verification is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const captchaResult = await verifyCaptcha(captchaToken, ip);

    if (!captchaResult.success) {
      console.warn(`⚠️ CAPTCHA verification failed for ${email}: ${captchaResult.errors?.join(', ')}`);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'captcha_failed',
          message: 'CAPTCHA verification failed. Please try again.',
          errors: captchaResult.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // All checks passed
    console.log(`All verification checks passed for ${email}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification passed. Proceeding with authentication.',
        rateLimitInfo: {
          emailAttempts: emailLimit.attempts,
          ipAttempts: ipLimit.attempts,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auth verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        reason: 'server_error',
        message: 'Authentication verification failed. Please try again later.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
