import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { logGoogleSignInStatus } from '../lib/googleSignInSetup';
import { secureLog } from '../lib/secureLogger';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signInWithGoogle: () => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: (email: string, password: string) => Promise<{ error: unknown }>;
  accounts: StoredAccount[];
  switchAccount: (accountId: string) => Promise<{ error: unknown }>;
  removeAccount: (accountId: string) => void;
}

interface StoredAccount {
  id: string;
  email: string | undefined;
  username: string | undefined;
  avatar_url: string | null | undefined;
  lastActiveAt: string;
  access_token: string | null;
  refresh_token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  const ACCOUNTS_KEY = 'blackiris_accounts';

  // Load stored accounts from localStorage
  const loadStoredAccounts = () => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as StoredAccount[];
    } catch {
      return [];
    }
  };

  // Save accounts to localStorage
  const saveStoredAccounts = (list: StoredAccount[]) => {
    setAccounts(list);
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
    } catch {
      // Ignore storage errors
    }
  };

  // Initialize auth on app load
  useEffect(() => {
    let mounted = true;

    logGoogleSignInStatus();

    // Timeout in case session load takes too long
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 10000);

    setAccounts(loadStoredAccounts());

    const prodUrl = 'https://black-iris-org.web.app';
    const isProd = window.location.origin === prodUrl;

    // Handle OAuth redirect
    const processRedirect = async () => {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('error')) {
        try {
          const { data, error } = await supabase.auth.getSessionFromUrl();
          if (error) {
            console.error('OAuth redirect error:', error);
          } else if (data?.session?.user) {
            secureLog.debug('[Auth] OAuth session established');
            setUser(data.session.user);
            await loadProfile(data.session.user.id);
          }

          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

          // Redirect localhost to production for OAuth security
          if (!isProd && window.location.origin.includes('localhost')) {
            window.location.replace(`${prodUrl}${window.location.pathname}${window.location.search}`);
            return;
          }
        } catch (redirectError) {
          secureLog.error('[Auth] Error processing OAuth redirect', redirectError);
        }
      }
    };

    processRedirect().then(() => {
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
        if (!mounted) return;

        clearTimeout(timeout);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          secureLog.debug('[Auth] No session');
          setLoading(false);
        }
      }).catch((error: unknown) => {
        secureLog.error('[Auth] Error getting session', error);
        if (mounted) {
          setLoading(false);
        }
      });
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      secureLog.debug('[Auth] Auth state changed');
      if (!mounted) return;

      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const currentUser = session.user;
          await loadProfile(currentUser.id);

          // Store account locally for fast switching
          const existing = loadStoredAccounts();
          const now = new Date().toISOString();
          const updated: StoredAccount[] = [
            {
              id: currentUser.id,
              email: currentUser.email,
              username: profile?.username,
              avatar_url: profile?.avatar_url,
              lastActiveAt: now,
              access_token: session?.access_token ?? null,
              refresh_token: session?.refresh_token ?? null,
            },
            ...existing.filter((a) => a.id !== currentUser.id),
          ];
          saveStoredAccounts(updated);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [profile?.avatar_url, profile?.username]);

  // Load user profile from database
  const loadProfile = async (userId: string) => {
    try {
      secureLog.debug('[Auth] Loading user profile');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        // If table doesn't exist or JWT error, use default profile
        if (error.code === 'PGRST116' || error.message?.includes('relation "public.profiles" does not exist') || error.message?.includes('JWT')) {
          console.log('Using default profile');
          setProfile({
            id: userId,
            username: 'User',
            points: 0,
            bio: '',
            avatar_url: null,
            created_at: new Date().toISOString()
          });
        } else {
          console.error('Database error:', error);
          setProfile({
            id: userId,
            username: 'User',
            points: 0,
            bio: '',
            avatar_url: null,
            created_at: new Date().toISOString()
          });
        }
      } else if (data) {
        secureLog.debug('[Auth] Profile loaded');
        setProfile(data);
      } else {
        secureLog.debug('[Auth] No profile found, using default');
        setProfile({
          id: userId,
          username: 'User',
          points: 0,
          bio: '',
          avatar_url: null,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback profile
      setProfile({
        id: userId,
        username: 'User',
        points: 0,
        bio: '',
        avatar_url: null,
        created_at: new Date().toISOString()
      });
    } finally {
      secureLog.debug('[Auth] Loading done');
      setLoading(false);
    }
  };

  // Register new user
  const signUp = async (email: string, password: string, username: string) => {
    try {
      secureLog.debug('[Auth] Sign up started');
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (result.error) {
        console.error('Sign up error:', result.error);
        return { error: result.error };
      }

      console.log('Sign up successful');

      if (result.data.user) {
        // Check if profile was created by trigger
        try {
          console.log('Checking profile...');
          const existing = await supabase
            .from('profiles')
            .select('*')
            .eq('id', result.data.user.id)
            .maybeSingle();

          if (existing.error && existing.error.code !== 'PGRST116') {
            console.error('Error checking profile:', existing.error);
          }

          if (!existing.data) {
            // Create profile manually if not created by trigger
            console.log('Creating profile manually');
            const create = await supabase.from('profiles').insert({
              id: result.data.user.id,
              username,
              points: 0,
            });

            if (create.error) {
              console.error('Profile creation failed:', create.error);
              // Don't return error - auth still succeeded
            } else {
              console.log('Profile created');
            }
          }
        } catch (profileErr) {
          console.error('Profile error:', profileErr);
          // Continue - not critical
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  // Login with email/password
  const signIn = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanPassword) {
        return { error: new Error('Email and password required') };
      }

      console.log('Signing in with email:', cleanEmail);
      const result = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (result.error) {
        console.error('Sign in error:', result.error);
        // Better error message
        const msg = /invalid login credentials/i.test(result.error.message || '')
          ? 'Invalid email or password'
          : result.error.message || 'Unable to sign in';
        return { error: new Error(msg) };
      }

      console.log('Sign in successful');

      // Store this account locally
      if (!result.error && result.data?.user && result.data.session) {
        const now = new Date().toISOString();
        const existing = loadStoredAccounts();
        const updated: StoredAccount[] = [
          {
            id: result.data.user.id,
            email: result.data.user.email,
            username: undefined,
            avatar_url: undefined,
            lastActiveAt: now,
            access_token: result.data.session.access_token ?? null,
            refresh_token: result.data.session.refresh_token ?? null,
          },
          ...existing.filter((a) => a.id !== result.data.user.id),
        ];
        saveStoredAccounts(updated);
      }

      return { error: result.error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      console.log('Google Sign-In initiated from:', window.location.origin);
      
      // Always use production redirect for OAuth security
      const redirectUrl = 'https://black-iris-org.web.app' || import.meta.env.VITE_SUPABASE_REDIRECT_URL;
      console.log('OAuth redirect URL:', redirectUrl);

      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (result.error) {
        console.error('Google sign-in error:', result.error);
        return { error: result.error };
      }

      return { error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error };
    }
  };

  // Logout
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Switch to a different stored account
  const switchAccount = async (accountId: string) => {
    try {
      const existing = loadStoredAccounts();
      const target = existing.find((a) => a.id === accountId);
      if (!target || !target.refresh_token || !target.access_token) {
        return { error: new Error('No saved session for this account') };
      }

      const result = await supabase.auth.setSession({
        access_token: target.access_token,
        refresh_token: target.refresh_token,
      });

      if (result.error) {
        console.error('Error setting session:', result.error);
        return { error: result.error };
      }

      // Update last active time
      const now = new Date().toISOString();
      const updated = existing.map((a) =>
        a.id === accountId ? { ...a, lastActiveAt: now } : a
      );
      saveStoredAccounts(updated);

      return { error: null };
    } catch (err) {
      console.error('Switch account error:', err);
      return { error: err };
    }
  };

  // Remove stored account
  const removeAccount = (accountId: string) => {
    const existing = loadStoredAccounts();
    const updated = existing.filter((a) => a.id !== accountId);
    saveStoredAccounts(updated);
  };

  // Delete user account completely
  const deleteAccount = async (email: string, password: string) => {
    try {
      if (!user) {
        return { error: 'Not authenticated' };
      }

      // Verify email matches
      if (email !== user.email) {
        return { error: 'Email does not match your account' };
      }

      // Verify password
      const verify = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (verify.error) {
        return { error: 'Incorrect password' };
      }

      // Delete user data (in correct order for foreign keys)
      try {
        // Delete messages
        await supabase
          .from('messages')
          .delete()
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

        // Delete follows
        await supabase
          .from('followers')
          .delete()
          .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

        // Delete comments
        await supabase
          .from('comments')
          .delete()
          .eq('user_id', user.id);

        // Delete posts
        await supabase
          .from('posts')
          .delete()
          .eq('user_id', user.id);

        // Delete profile
        await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        // Sign out
        await supabase.auth.signOut();

      } catch (dataErr) {
        secureLog.error('[Auth] Data deletion failed', dataErr);
        return { error: 'Failed to delete account data' };
      }

      return { error: null };
    } catch (error) {
      secureLog.error('[Auth] Account deletion failed', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  // Refresh profile data from database
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        deleteAccount,
        accounts,
        switchAccount,
        removeAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext) as AuthContextType | undefined;
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
