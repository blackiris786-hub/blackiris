export interface CaptchaTokenResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  'error-codes'?: string[];
}

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || 'not-configured';
const VERIFY_URL = 'https://hcaptcha.com/siteverify';
const IS_CONFIGURED = HCAPTCHA_SITE_KEY !== 'not-configured' && HCAPTCHA_SITE_KEY.length > 20;

if (typeof console !== 'undefined') {
  console.log(`hCaptcha ${IS_CONFIGURED ? 'configured' : 'not configured'}`);
}

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string, options: any) => void;
      reset: (id?: number) => void;
      getResponse: (id?: number) => string;
    };
  }
}

export function isCaptchaConfigured(): boolean {
  return IS_CONFIGURED;
}

export function initCaptcha(containerId: string): void {
  if (!window.hcaptcha) {
    console.error('hCaptcha script not loaded');
    return;
  }

  window.hcaptcha.render(containerId, {
    sitekey: HCAPTCHA_SITE_KEY,
    theme: 'dark',
    size: 'normal',
  });
}

export function getCaptchaToken(): string {
  if (!window.hcaptcha) {
    console.error('hCaptcha not initialized');
    return '';
  }
  return window.hcaptcha.getResponse() || '';
}

export function resetCaptcha(): void {
  if (window.hcaptcha) {
    window.hcaptcha.reset();
  }
}

export async function verifyCaptchaOnServer(
  token: string,
  secretKey: string
): Promise<{ success: boolean; challenge_ts: string; hostname: string; 'error-codes'?: string[] }> {
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `response=${token}&secret=${secretKey}`,
    });

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return {
      success: false,
      challenge_ts: new Date().toISOString(),
      hostname: '',
      'error-codes': ['verification-failed'],
    };
  }
}

export function validateCaptchaResponse(): boolean {
  // allow bypass if not configured
  if (!IS_CONFIGURED) {
    return true;
  }
  
  const token = getCaptchaToken();
  return token && token.length > 0;
}

export { HCAPTCHA_SITE_KEY };
