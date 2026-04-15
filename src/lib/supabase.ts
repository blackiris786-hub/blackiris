// @ts-ignore
import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const url = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key: string) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // fail silently for quota issues
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // fail silently
        }
      },
    },
    flowType: 'implicit',
  },
  cookies: {
    name: 'sb-auth',
    lifetime: 3600,
    domain: window.location.hostname,
    path: '/',
    sameSite: 'lax',
  },
});

export interface Profile {
  id: string;
  username: string;
  points: number;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  // Moderation-related fields (optional in case older rows don't have them yet)
  profanity_attempts?: number | null;
  profanity_timeout_until?: string | null;
  profanity_timeout_count?: number | null;
  is_banned?: boolean | null;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url: string;
  points_awarded: number;
  created_at: string;
  profiles?: Profile;
  likes_count?: number;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Follower {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  message_iv?: string;
  read_at?: string;
  updated_at?: string;
  profiles?: {
    sender?: Profile;
    recipient?: Profile;
  };
}
