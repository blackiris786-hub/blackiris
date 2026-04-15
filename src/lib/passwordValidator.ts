/**
 * Password validation
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function isValidPassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Must be at least 8 chars
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  // Not 6+ consecutive numbers
  if (/(\d)(\d)(\d)(\d)(\d)(\d)/.test(password)) {
    const nums = password.match(/(\d{6,})/);
    if (nums && /^[\d]{6,}$/.test(nums[0])) {
      errors.push('Password cannot contain 6+ consecutive numbers');
    }
  }

  // Not 6+ sequential letters
  if (/([a-z])([a-z])([a-z])([a-z])([a-z])([a-z])/i.test(password)) {
    const letters = password.match(/([a-z]{6,})/i);
    if (letters && /^[a-z]{6,}$/i.test(letters[0])) {
      const text = letters[0].toLowerCase();
      let sequential = true;
      for (let i = 0; i < text.length - 1; i++) {
        if (text.charCodeAt(i + 1) - text.charCodeAt(i) !== 1) {
          sequential = false;
          break;
        }
      }
      if (sequential) {
        errors.push('Password cannot contain 6+ sequential letters');
      }
    }
  }

  // Not 6+ same characters in a row
  if (/(.)\1{5,}/.test(password)) {
    errors.push('Password cannot contain 6+ repeated characters');
  }

  // Avoid common patterns
  const common = ['password', 'qwerty', 'asdfgh', 'zxcvbn', '123123', '111111', '000000'];
  if (common.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password uses a common pattern');
  }

  // Check for character variety
  let types = 0;
  if (/[a-z]/.test(password)) types++;
  if (/[A-Z]/.test(password)) types++;
  if (/\d/.test(password)) types++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) types++;

  if (types < 2) {
    errors.push('Password needs a mix of character types');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
