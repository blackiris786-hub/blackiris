import { useState, useRef, useEffect } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';
import { isValidEmail } from '../lib/emailValidator';
import { isValidPassword } from '../lib/passwordValidator';
import { isCaptchaConfigured, HCAPTCHA_SITE_KEY } from '../lib/captcha';
import { loginRateLimiter, generateRateLimitKey } from '../lib/rateLimiter';
import { Leaf, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { t, isRtl } = useLanguage();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState('');
  const [verificationCode, setVerificationCode] = useState(''); // TODO: implement email verification later
  const captchaRef = useRef<HCaptcha>(null);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRateLimitWarning('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const authType = isSignUp ? 'signup' : 'login';
      const rateLimitKey = generateRateLimitKey(normalizedEmail, authType);
      const limitCheck = loginRateLimiter.checkLimit(rateLimitKey);

      if (!limitCheck.allowed) {
        setError(limitCheck.message);
        setLoading(false);
        captchaRef.current?.reset();
        return;
      }

      if (limitCheck.message) {
        setRateLimitWarning(limitCheck.message);
      }

      // Check CAPTCHA if configured
      if (isCaptchaConfigured()) {
        const token = captchaRef.current?.getResponse();
        if (!token) {
          setError('Please complete the CAPTCHA verification');
          setLoading(false);
          return;
        }
      }

      if (isSignUp) {
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          captchaRef.current?.reset();
          return;
        }

        const emailValidation = isValidEmail(normalizedEmail);
        if (!emailValidation.isValid) {
          setError(emailValidation.reason || 'Invalid email address');
          setLoading(false);
          captchaRef.current?.reset();
          return;
        }

        const passwordValidation = isValidPassword(normalizedPassword);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.errors[0] || 'Password is too weak');
          setLoading(false);
          captchaRef.current?.reset();
          return;
        }

        try {
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.trim())
            .single();

          if (existingUser) {
            setError('Username is already taken');
            setLoading(false);
            captchaRef.current?.reset();
            return;
          }
        } catch (dbError: unknown) {
          console.error('Database check failed:', dbError);
        }

        const { error } = await signUp(normalizedEmail, normalizedPassword, username.trim());
        if (error) throw error;
        loginRateLimiter.clear(rateLimitKey);
      } else {
        const { error } = await signIn(normalizedEmail, normalizedPassword);
        if (error) throw error;
        loginRateLimiter.clear(rateLimitKey);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'} flex items-center justify-center p-2 sm:p-4`}>
      <div className="w-full sm:w-80 md:w-96 lg:w-96 relative">
        <div className={`absolute top-0 z-10 flex gap-2 ${isRtl ? 'left-0' : 'right-0'}`}>
          <ThemeToggle />
          <LanguageSwitcher variant="button" />
        </div>
        <div className="text-center mb-4 sm:mb-5 pt-4 sm:pt-5">
          <div className="flex items-center justify-center mb-2 sm:mb-2.5">
            <Logo className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-greenyellow" iconClassName="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-greenyellow mb-1 sm:mb-2 font-mono tracking-wider">BLACKIRIS</h1>
          <p className={`${theme === 'dark' ? 'text-gray-400 text-xs' : 'text-gray-600 text-xs'}`}>{t('joinCommunity')}</p>
        </div>

        <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black border-purple-600/30' : 'bg-gradient-to-br from-white to-gray-50 border-purple-200'} rounded-3xl p-5 sm:p-6 border-2 shadow-2xl flex flex-col backdrop-blur-sm`}>
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                !isSignUp
                  ? 'bg-greenyellow text-black shadow-lg shadow-greenyellow/60'
                  : `${theme === 'dark' ? 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                isSignUp
                  ? 'bg-greenyellow text-black shadow-lg shadow-greenyellow/60'
                  : `${theme === 'dark' ? 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 flex-1 flex flex-col">
            {isSignUp && (
              <div>
                <label htmlFor="username" className={`block text-xs sm:text-sm font-bold mb-2.5 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-medium rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    theme === 'dark'
                      ? 'bg-gray-800/60 border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/30 focus:bg-gray-800/80'
                      : 'bg-gray-100 border-purple-200 text-gray-900 placeholder-gray-500 focus:border-purple-400 focus:ring-purple-300/50 focus:bg-white'
                  }`}
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className={`block text-xs sm:text-sm font-bold mb-2.5 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-medium rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  theme === 'dark'
                    ? 'bg-gray-800/60 border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/30 focus:bg-gray-800/80'
                    : 'bg-gray-100 border-purple-200 text-gray-900 placeholder-gray-500 focus:border-purple-400 focus:ring-purple-300/50 focus:bg-white'
                }`}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-xs sm:text-sm font-bold mb-2.5 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-medium rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 pr-12 ${
                    theme === 'dark'
                      ? 'bg-gray-800/60 border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/30 focus:bg-gray-800/80'
                      : 'bg-gray-100 border-purple-200 text-gray-900 placeholder-gray-500 focus:border-purple-400 focus:ring-purple-300/50 focus:bg-white'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 px-4 flex items-center justify-center transition-colors hover:text-purple-500 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} focus:outline-none`}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className={`text-xs mt-2.5 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  8+ chars, letters, numbers & symbols
                </p>
              )}
            </div>

            {/* Info message if CAPTCHA not configured */}
            {!isCaptchaConfigured() && (
              <div className={`p-3 ${theme === 'dark' ? 'bg-blue-900/20 border-blue-600' : 'bg-blue-50 border-blue-300'} rounded-lg border-2 text-xs sm:text-sm flex items-start gap-2`}>
                <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <p className={`font-semibold mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>CAPTCHA Not Configured</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>For DDoS protection, add your hCaptcha Site Key to your .env file as VITE_HCAPTCHA_SITE_KEY</p>
                </div>
              </div>
            )}

            {rateLimitWarning && (
              <div className={`p-3 ${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-600 text-yellow-400' : 'bg-yellow-50 border-yellow-300 text-yellow-700'} rounded-lg border-2 text-xs sm:text-sm flex items-center gap-2`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {rateLimitWarning}
              </div>
            )}

            {error && (
              <div className={`p-3 ${theme === 'dark' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-red-50 border-red-300 text-red-700'} rounded-lg border-2 text-xs sm:text-sm`}>{error}</div>
            )}

            {/* hCaptcha Widget - Visible */}
            {isCaptchaConfigured() && (
              <div className={`flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl border-2 transition-all ${
                theme === 'dark'
                  ? 'bg-purple-900/20 border-purple-500/40 backdrop-blur-sm'
                  : 'bg-purple-50 border-purple-300 backdrop-blur-sm'
              }`}>
                <p className={`text-xs sm:text-sm font-bold mb-4 text-center ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>
                  Security Verification
                </p>
                <div className="transform scale-75 origin-top">
                  <HCaptcha
                    sitekey={HCAPTCHA_SITE_KEY}
                    ref={captchaRef}
                    theme={theme}
                    onVerify={() => {
                      // CAPTCHA verified, form can be submitted
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 sm:py-4 px-4 text-sm sm:text-base font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-auto ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:shadow-purple-500/40 hover:from-purple-500 hover:to-purple-400'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:shadow-purple-500/40 hover:from-purple-700 hover:to-purple-600'
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Logo className="w-5 h-5 text-white" iconClassName="w-full h-full" animate />
                  {t('loading')}
                </span>
              ) : isSignUp ? (
                t('createAccount')
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          <div className="mt-6 sm:mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <span className={`text-xs uppercase tracking-wider font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>or</span>
              <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setError('');
                setLoading(true);
                const { error } = await signInWithGoogle();
                if (error) {
                  setError((error as Error)?.message || 'Google sign-in failed. Please check your configuration.');
                }
                setLoading(false);
              }}
              className={`w-full py-3.5 sm:py-4 px-4 text-sm sm:text-base font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                theme === 'dark'
                  ? 'bg-white text-gray-900 hover:bg-gray-50 hover:shadow-lg'
                  : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg'
              }`}
            >
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}