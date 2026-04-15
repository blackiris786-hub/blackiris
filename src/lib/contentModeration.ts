import { supabase } from './supabase';

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export interface UserModerationState {
  isBanned: boolean;
  isTimedOut: boolean;
  timeoutUntil?: string | null;
  attempts: number;
  timeoutCount: number;
}

// List of words that trigger moderation
const BANNED_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(fuck|shit|bitch|asshole|bastard)\b/i, label: 'strong profanity' },
  { pattern: /\b(nigger|chink|spic|kike|faggot|tranny)\b/i, label: 'hate speech' },
  { pattern: /\b(hate\s+(blacks|whites|gays|muslims|jews|arabs|asians))\b/i, label: 'hate speech' },
  { pattern: /\b(kill yourself|kys|go die|you are worthless|no one likes you)\b/i, label: 'bullying' },
];

// Check if text contains prohibited content
export function moderateText(input: string): ModerationResult {
  const text = input.toLowerCase();

  for (const { pattern, label } of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason: `Your text appears to contain ${label}. Please rephrase it.`,
      };
    }
  }

  return { allowed: true };
}

// Get moderation status for a user
export async function getUserModerationState(userId: string): Promise<UserModerationState> {
  const result = await supabase
    .from('profiles')
    .select('profanity_attempts, profanity_timeout_until, profanity_timeout_count, is_banned')
    .eq('id', userId)
    .single();

  if (result.error || !result.data) {
    return {
      isBanned: false,
      isTimedOut: false,
      timeoutUntil: undefined,
      attempts: 0,
      timeoutCount: 0,
    };
  }

  const now = new Date();
  const timeoutDate = result.data.profanity_timeout_until as string | null;
  const isTimedOut = !!timeoutDate && new Date(timeoutDate) > now;

  return {
    isBanned: !!result.data.is_banned,
    isTimedOut,
    timeoutUntil: timeoutDate,
    attempts: result.data.profanity_attempts ?? 0,
    timeoutCount: result.data.profanity_timeout_count ?? 0,
  };
}

// Record a bad word attempt and update user status
export async function recordBadWordAttempt(userId: string): Promise<UserModerationState> {
  const current = await getUserModerationState(userId);

  if (current.isBanned || current.isTimedOut) {
    return current;
  }

  let newAttempts = current.attempts + 1;
  let newTimeoutCount = current.timeoutCount;
  let newBanned: boolean = current.isBanned;
  let newTimeoutUntil: string | null | undefined = current.timeoutUntil;
  const now = new Date();

  // After 4 bad attempts, timeout for 15 minutes
  if (newAttempts >= 4) {
    newTimeoutCount += 1;
    newAttempts = 0;

    // After 2 timeouts, ban the user
    if (newTimeoutCount >= 2) {
      newBanned = true;
      newTimeoutUntil = null;
    } else {
      // 15 minute timeout
      const until = new Date(now.getTime() + 15 * 60 * 1000);
      newTimeoutUntil = until.toISOString();
    }
  }

  await supabase
    .from('profiles')
    .update({
      profanity_attempts: newAttempts,
      profanity_timeout_count: newTimeoutCount,
      profanity_timeout_until: newTimeoutUntil ?? null,
      is_banned: newBanned,
    })
    .eq('id', userId);

  const updated: UserModerationState = {
    isBanned: newBanned,
    isTimedOut: !!newTimeoutUntil && new Date(newTimeoutUntil) > now,
    timeoutUntil: newTimeoutUntil,
    attempts: newAttempts,
    timeoutCount: newTimeoutCount,
  };

  return updated;
}


