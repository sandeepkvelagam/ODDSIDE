import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";

type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  supabase_id: string;
};

type AuthContextType = {
  session: Session | null;
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncUserToBackend = async (s: Session) => {
    try {
      await api.post("/auth/sync-user", {
        supabase_id: s.user.id,
        email: s.user.email,
        name: s.user.user_metadata?.name || s.user.email?.split("@")[0],
        picture: s.user.user_metadata?.avatar_url,
      });
      // Fetch user profile from backend
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (error) {
      console.error("Error syncing user:", error);
    }
  };

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        await syncUserToBackend(s);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s && _event === "SIGNED_IN") {
        await syncUserToBackend(s);
      }
      if (!s) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
