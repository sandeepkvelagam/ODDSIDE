import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, using fallback auth');
      checkFallbackAuth();
      return;
    }

    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser({
          user_id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          picture: session.user.user_metadata?.avatar_url
        });
        // Sync user to backend
        syncUserToBackend(session);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          setUser({
            user_id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            picture: session.user.user_metadata?.avatar_url
          });
          // Sync user on sign in
          if (event === 'SIGNED_IN') {
            syncUserToBackend(session);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fallback auth check (for when Supabase is not configured)
  const checkFallbackAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync Supabase user to MongoDB backend
  const syncUserToBackend = async (session) => {
    try {
      await axios.post(`${API}/auth/sync-user`, {
        supabase_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        picture: session.user.user_metadata?.avatar_url
      }, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    } catch (error) {
      console.error('Error syncing user:', error);
    }
  };

  // Sign up with email/password
  const signUp = async (email, password, name) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/login`
      }
    });
    
    if (error) throw error;
    return data;
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Return user data for welcome screen
    return {
      user_id: data.user?.id,
      email: data.user?.email,
      name: data.user?.user_metadata?.name || data.user?.email?.split('@')[0]
    };
  };

  // Reset password
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    
    if (error) throw error;
    return data;
  };

  // Sign out
  const signOut = async () => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    
    // Also logout from backend
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      // Ignore backend logout errors
    }
    
    setUser(null);
    setSession(null);
  };

  // Get access token for API calls
  const getAccessToken = () => {
    return session?.access_token || null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      getAccessToken,
      setUser,
      isSupabaseConfigured: isSupabaseConfigured()
    }}>
      {children}
    </AuthContext.Provider>
  );
};
