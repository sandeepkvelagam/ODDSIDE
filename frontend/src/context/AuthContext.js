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

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth loading timeout - setting isLoading to false');
      setIsLoading(false);
    }, 10000);

    // Check for existing Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Sync user to backend and get MongoDB user data (including correct user_id)
        await syncUserToBackend(session);
      }
      setIsLoading(false);
      clearTimeout(timeout);
    }).catch(err => {
      console.error('Error getting session:', err);
      setIsLoading(false);
      clearTimeout(timeout);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          // Sync user to backend and get MongoDB user data (including correct user_id)
          await syncUserToBackend(session);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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

  // Sync Supabase user to MongoDB backend and update user state with MongoDB user_id
  const syncUserToBackend = async (session) => {
    try {
      const response = await axios.post(`${API}/auth/sync-user`, {
        supabase_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        picture: session.user.user_metadata?.avatar_url
      }, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      // Update user state with MongoDB user data (includes correct user_id)
      if (response.data) {
        setUser({
          user_id: response.data.user_id,  // Use MongoDB user_id, not Supabase ID
          email: response.data.email,
          name: response.data.name,
          picture: response.data.picture
        });
      }
    } catch (error) {
      console.error('Error syncing user:', error);
      // Fallback to Supabase data if sync fails
      setUser({
        user_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        picture: session.user.user_metadata?.avatar_url
      });
    }
  };

  // Sign up with email/password
  const signUp = async (email, password, name) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    let signUpData = null;
    let signUpError = null;
    
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      signUpData = result.data;
      signUpError = result.error;
    } catch (err) {
      console.error('Supabase signup error:', err);
      throw new Error(err.message || 'Signup failed. Please try again.');
    }
    
    if (signUpError) {
      throw signUpError;
    }
    
    // Sync new user to MongoDB immediately after signup
    if (signUpData?.user) {
      try {
        await axios.post(`${API}/auth/sync-user`, {
          supabase_id: signUpData.user.id,
          email: signUpData.user.email,
          name: name || signUpData.user.email?.split('@')[0],
          picture: null
        });
        console.log('User synced to MongoDB after signup');
      } catch (syncError) {
        console.error('Error syncing user after signup:', syncError);
        // Don't throw - user is still created in Supabase
      }
    }
    
    return signUpData;
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }
    
    let signInData = null;
    let signInError = null;
    
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });
      signInData = result.data;
      signInError = result.error;
    } catch (err) {
      console.error('Supabase signin error:', err);
      throw new Error(err.message || 'Login failed. Please try again.');
    }
    
    if (signInError) {
      throw signInError;
    }
    
    // Sync user to MongoDB on sign in - MUST await to prevent race condition
    if (signInData?.session) {
      await syncUserToBackend(signInData.session);
    }
    
    // Return user data for welcome screen
    return {
      user_id: signInData?.user?.id,
      email: signInData?.user?.email,
      name: signInData?.user?.user_metadata?.name || signInData?.user?.email?.split('@')[0]
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

  // Resend verification email
  const resendVerification = async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) throw error;
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
      resendVerification,
      getAccessToken,
      setUser,
      isSupabaseConfigured: isSupabaseConfigured()
    }}>
      {children}
    </AuthContext.Provider>
  );
};
