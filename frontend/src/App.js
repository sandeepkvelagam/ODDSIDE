import { useEffect, useState, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AIAssistant from "@/components/AIAssistant";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Groups from "@/pages/Groups";
import GroupHub from "@/pages/GroupHub";
import GameNight from "@/pages/GameNight";
import Settlement from "@/pages/Settlement";
import Profile from "@/pages/Profile";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Press from "@/pages/Press";
import GameHistory from "@/pages/GameHistory";
import Premium from "@/pages/Premium";
import SpotifyCallback from "@/pages/SpotifyCallback";
import Wallet from "@/pages/Wallet";
import Automations from "@/pages/Automations";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.withCredentials = true;

// Setup axios interceptor to add auth token from Supabase
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

axios.interceptors.request.use(
  async (config) => {
    try {
      // Only try to get session if Supabase is configured
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();

        // Add auth token if available
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors with retry
// This handles race conditions where user sync hasn't completed yet
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only retry once, and only for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Wait a moment for user sync to complete, then retry
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get fresh token and retry
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
            return axios(originalRequest);
          }
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }

    return Promise.reject(error);
  }
);

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - isLoading:', isLoading, 'user:', user?.email);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public Route (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/press" element={<Press />} />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/groups" element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            } />
            <Route path="/groups/:groupId" element={
              <ProtectedRoute>
                <GroupHub />
              </ProtectedRoute>
            } />
            <Route path="/games/:gameId" element={
              <ProtectedRoute>
                <GameNight />
              </ProtectedRoute>
            } />
            <Route path="/games/:gameId/settlement" element={
              <ProtectedRoute>
                <Settlement />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <GameHistory />
              </ProtectedRoute>
            } />
            <Route path="/premium" element={
              <ProtectedRoute>
                <Premium />
              </ProtectedRoute>
            } />
            <Route path="/premium/success" element={
              <ProtectedRoute>
                <Premium />
              </ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            } />
            <Route path="/automations" element={
              <ProtectedRoute>
                <Automations />
              </ProtectedRoute>
            } />

            {/* Spotify OAuth Callback */}
            <Route path="/spotify/callback" element={<SpotifyCallback />} />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

// Separate component to access auth context
function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Only show AI assistant for logged-in users
  if (!user) return null;
  
  return <AIAssistant currentPage={location.pathname} />;
}

export default App;
