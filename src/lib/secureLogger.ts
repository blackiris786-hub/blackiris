/**
 * Secure logging - masks sensitive info in dev mode
 */

const isDev = import.meta.env.DEV;

function mask(id: string | undefined): string {
  if (!id || typeof id !== 'string') return '***';
  if (id.length < 8) return '***';
  return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
}

export const secureLog = {
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },

  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },

  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },

  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },

  logUserAction: (action: string, userId?: string, details?: string) => {
    if (!isDev) return;
    const masked = mask(userId);
    console.log(`[${action}] user: ${masked} ${details || ''}`);
  },

  logOperation: (operation: string, fromId?: string, toId?: string) => {
    if (!isDev) return;
    const from = mask(fromId);
    const to = mask(toId);
    console.log(`[${operation}] from: ${from} to: ${to}`);
  },

  logError: (message: string, error: any, userId?: string) => {
    if (!isDev) return;
    const masked = mask(userId);
    console.error(`[ERROR] ${message} (user: ${masked})`, error);
  },
};

// Strip sensitive data from objects
export function stripSensitive(obj: any): any {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  const clean: any = {};
  for (const key in obj) {
    if (key.includes('token') || key.includes('secret') || key.includes('password')) {
      clean[key] = '[REDACTED]';
    } else if (key === 'id' || key.includes('_id')) {
      clean[key] = mask(obj[key]);
    } else {
      clean[key] = obj[key];
    }
  }
  return clean;
}

export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(stripSensitive(obj));
  } catch {
    return '[Unable to stringify]';
  }
}
