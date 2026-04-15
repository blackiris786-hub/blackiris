import React, { useState } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult 
} from 'firebase/auth';
import { LogIn, Phone, Chrome } from 'lucide-react';
import { getPasswordStrength, STRENGTH_CONFIG } from '../utils/passwordStrength';

export const AuthUI: React.FC = () => {
  const auth = getAuth();
  
  // Email/Password States
  const [password, setPassword] = useState('');
  const strength = getPasswordStrength(password);

  // Phone States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<'method' | 'phone' | 'otp'>('method');

  // Google Sign In
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error", error);
    }
  };

  // Phone Auth Logic
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handleSendCode = async () => {
    setupRecaptcha();
    const appVerifier = (window as any).recaptchaVerifier;
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (error) {
      console.error("SMS Error", error);
    }
  };

  const handleVerifyCode = async () => {
    try {
      await confirmationResult?.confirm(verificationCode);
    } catch (error) {
      console.error("Verification Error", error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-black border border-gray-800 rounded-xl space-y-6">
      <h2 className="text-2xl font-bold text-greenyellow flex items-center gap-2">
        <LogIn className="w-6 h-6" /> Join Blackiris
      </h2>

      {/* Google Option */}
      <button 
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 bg-white text-black p-3 rounded-lg font-semibold hover:bg-gray-200 transition"
      >
        <Chrome className="w-5 h-5" /> Continue with Google
      </button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-gray-800"></div>
        <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
        <div className="flex-grow border-t border-gray-800"></div>
      </div>

      {/* Phone Option */}
      {step === 'method' && (
        <button 
          onClick={() => setStep('phone')}
          className="w-full border border-gray-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-900"
        >
          <Phone className="w-5 h-5" /> Use Phone Number
        </button>
      )}

      {step === 'phone' && (
        <div className="space-y-3">
          <input 
            type="tel" 
            placeholder="+1 123 456 7890"
            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <button onClick={handleSendCode} className="w-full bg-greenyellow text-black p-3 rounded font-bold">
            Send Code
          </button>
          <div id="recaptcha-container"></div>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Enter 6-digit code"
            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white text-center tracking-widest"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button onClick={handleVerifyCode} className="w-full bg-greenyellow text-black p-3 rounded font-bold">
            Verify Code
          </button>
        </div>
      )}

      {/* Password Strength Section */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Set Password</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white"
            placeholder="Choose a strong password"
          />
          
          {/* Strength Meter UI */}
          {password && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className={STRENGTH_CONFIG[strength].color}>
                  Strength: {STRENGTH_CONFIG[strength].label}
                </span>
                <span className="text-gray-500">
                  {strength === 'Strong' ? 'Perfect!' : 'Add more numbers/symbols'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    strength === 'Strong' ? 'bg-greenyellow' : 
                    strength === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: STRENGTH_CONFIG[strength].width }}
                ></div>
              </div>
              <div className="bg-greenyellow/5 border border-greenyellow/10 p-3 rounded-lg mt-2">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <span className="text-greenyellow font-bold uppercase block mb-1">Security Guide:</span>
                  For a <span className="text-greenyellow">Strong</span> password, include at least 
                  <span className="text-white"> 8 numbers</span>, 
                  <span className="text-white"> 3 letters</span>, and 
                  <span className="text-white"> 1 special character</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};