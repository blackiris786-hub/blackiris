export type PasswordStrength = 'Weak' | 'Medium' | 'Strong';

export const getPasswordStrength = (password: string): PasswordStrength => {
  const numCount = (password.match(/\d/g) || []).length;
  const letterCount = (password.match(/[a-zA-Z]/g) || []).length;
  const symbolCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;

  // Strong: 8 numbers, 3 letters, 1 sign
  if (numCount >= 8 && letterCount >= 3 && symbolCount >= 1) {
    return 'Strong';
  }

  // Medium: At least 8 characters total and a mix of at least two types
  const hasVariety = (numCount > 0 ? 1 : 0) + (letterCount > 0 ? 1 : 0) + (symbolCount > 0 ? 1 : 0) >= 2;
  if (password.length >= 8 && hasVariety) {
    return 'Medium';
  }

  return 'Weak';
};

export const STRENGTH_CONFIG = {
  Weak: { color: 'text-red-500', width: '33%', label: 'Weak' },
  Medium: { color: 'text-yellow-500', width: '66%', label: 'Medium' },
  Strong: { color: 'text-greenyellow', width: '100%', label: 'Strong' }
};