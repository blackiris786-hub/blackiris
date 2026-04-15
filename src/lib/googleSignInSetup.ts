/**
 * Google Sign-In configuration helper
 */
import { secureLog } from './secureLogger';

export function checkGoogleSignInSetup(): {
  isConfigured: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    issues.push('VITE_SUPABASE_URL is not set');
  } else {
    secureLog.debug('Supabase URL configured');
  }

  if (!key) {
    issues.push('VITE_SUPABASE_ANON_KEY is not set');
  } else {
    secureLog.debug('Supabase Anon Key configured');
  }

  return {
    isConfigured: issues.length === 0,
    issues,
  };
}

export function logGoogleSignInStatus() {
  const config = checkGoogleSignInSetup();
  
  if (config.isConfigured) {
    secureLog.debug('Google Sign-In configured');
    secureLog.debug('Using Supabase OAuth');
  } else {
    secureLog.warn('Google Sign-In not fully configured');
    config.issues.forEach(issue => secureLog.warn(issue));
    
    // Setup instructions
    secureLog.debug('Setup steps:');
    secureLog.debug('1. Go to https://supabase.com/dashboard');
    secureLog.debug('2. Select project: black-iris-org');
    secureLog.debug('3. Authentication > Providers');
    secureLog.debug('4. Enable Google provider');
    secureLog.debug('5. Add your Google OAuth credentials');
    secureLog.debug('6. Create OAuth 2.0 Web Application');
    secureLog.debug('7. Set Redirect URL to: ' + window.location.origin);
  }
}
