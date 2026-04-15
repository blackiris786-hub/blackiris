/**
 * Rate limiter for login attempts and other actions
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private MAX_ATTEMPTS = 5;
  private WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private BLOCK_MS = 30 * 60 * 1000; // 30 minute block

  checkLimit(key: string): { allowed: boolean; remainingTime: number; message: string } {
    const now = Date.now();
    const entry = this.store.get(key);

    // New key
    if (!entry) {
      this.store.set(key, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: 0,
      });
      return { allowed: true, remainingTime: 0, message: '' };
    }

    // Check if blocked
    if (entry.blocked && now < entry.blockedUntil) {
      const remaining = entry.blockedUntil - now;
      return {
        allowed: false,
        remainingTime: Math.ceil(remaining / 1000),
        message: `Too many attempts. Try again in ${Math.ceil(remaining / 60000)} minutes.`,
      };
    }

    // Reset if window expired
    if (now - entry.firstAttempt > this.WINDOW_MS) {
      this.store.set(key, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
        blockedUntil: 0,
      });
      return { allowed: true, remainingTime: 0, message: '' };
    }

    entry.attempts += 1;
    entry.lastAttempt = now;

    // Block if over limit
    if (entry.attempts > this.MAX_ATTEMPTS) {
      entry.blocked = true;
      entry.blockedUntil = now + this.BLOCK_MS;
      return {
        allowed: false,
        remainingTime: Math.ceil(this.BLOCK_MS / 1000),
        message: `Too many attempts. Try again in ${Math.ceil(this.BLOCK_MS / 60000)} minutes.`,
      };
    }

    const left = this.MAX_ATTEMPTS - entry.attempts;
    return {
      allowed: true,
      remainingTime: left <= 2 ? Math.ceil((entry.firstAttempt + this.WINDOW_MS - now) / 1000) : 0,
      message: left <= 2 ? `${left} attempts left` : '',
    };
  }

  clear(key: string): void {
    this.store.delete(key);
  }

  getStatus(key: string): RateLimitEntry | null {
    return this.store.get(key) || null;
  }

  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.lastAttempt > this.WINDOW_MS + 5 * 60 * 1000) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.store.delete(key));
  }
}

export const loginRateLimiter = new RateLimiter();

export function generateRateLimitKey(email: string, action: string = 'login'): string {
  return `${action}:${email.toLowerCase()}`;
}

export function generateIPRateLimitKey(ip: string, action: string = 'login'): string {
  return `${action}:ip:${ip}`;
}

setInterval(() => {
  loginRateLimiter.cleanup();
}, 5 * 60 * 1000);
