/**
 * Email validation
 */

export function isValidEmail(email: string): { isValid: boolean; reason?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, reason: 'Invalid email format' };
  }

  // Reject disposable/temp email domains
  const disposable = [
    'tempmail.com', 'temp-mail.org', '10minutemail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.io', 'guerrillamail.com', 'maildrop.cc',
    'fakeinbox.com', 'yopmail.com', 'sharklasers.com', 'test.com', 'example.com',
    'test.org', 'temp.com', 'spam.com', 'fake.com', 'emailondeck.com', 'grr.la',
    'trashmail.com', '33mail.com', 'getnada.com', 'mail.tm', 'temp-mail.com',
    'tempmail.us', 'mytrashmail.com', 'inbox.lv'
  ];

  const domain = email.toLowerCase().split('@')[1];
  if (disposable.includes(domain)) {
    return { isValid: false, reason: 'Please use a real email address' };
  }

  // Check for obviously fake patterns
  const fakeyPatterns = ['test', 'fake', 'demo', 'dummy', 'admin', 'user123', 'temp', 'spam', 'trash'];
  const local = email.toLowerCase().split('@')[0];
  
  if (fakeyPatterns.some(p => local.includes(p))) {
    return { isValid: false, reason: 'Please use a real email address' };
  }

  // Length checks
  if (email.length < 5) {
    return { isValid: false, reason: 'Email is too short' };
  }

  if (email.length > 254) {
    return { isValid: false, reason: 'Email is too long' };
  }

  // Check TLD
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  
  if (!/^[a-z]{2,}$/i.test(tld)) {
    return { isValid: false, reason: 'Invalid email format' };
  }

  return { isValid: true };
}
