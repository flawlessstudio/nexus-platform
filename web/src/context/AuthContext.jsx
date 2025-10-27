import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient.js';

export const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => ({ data: null, error: new Error('Supabase is not configured.') }),
  signUp: async () => ({ data: null, error: new Error('Supabase is not configured.') }),
  signOut: async () => ({ error: new Error('Supabase is not configured.') }),
  logout: async () => ({ error: new Error('Supabase is not configured.') }),
});

const createUnavailableError = () => new Error('Supabase client is not configured.');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    const getInitialSession = async () => {
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: createUnavailableError() };
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email, password, userData = {}) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: createUnavailableError() };
    }
    return supabase.auth.signUp({
      email,
      password,
      options: { data: userData },
    });
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return { error: createUnavailableError() };
    }
    return supabase.auth.signOut();
  };

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      logout: signOut,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
