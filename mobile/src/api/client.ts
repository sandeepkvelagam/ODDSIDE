import axios from "axios";
import { supabase } from "../lib/supabase";

const apiUrl = process.env.EXPO_PUBLIC_API_URL!;

if (!apiUrl) {
  throw new Error("Missing EXPO_PUBLIC_API_URL in .env");
}

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
});

// Add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting session for API request:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized request - token may be expired");
      // Could trigger logout here if needed
    }
    return Promise.reject(error);
  }
);
