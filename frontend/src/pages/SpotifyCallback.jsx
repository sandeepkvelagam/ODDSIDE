import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      // Redirect back to dashboard with error
      navigate("/dashboard?spotify_error=" + error);
      return;
    }

    if (code) {
      // The state contains the encoded return URL or game ID
      // For now, redirect back to dashboard with the code in sessionStorage
      sessionStorage.setItem("spotify_auth_code", code);
      
      // Try to decode state to get return URL
      try {
        const returnPath = state ? atob(state) : "/dashboard";
        // Append code as query param for the page to handle
        navigate(returnPath + "?spotify_code=" + code);
      } catch {
        navigate("/dashboard?spotify_code=" + code);
      }
    } else {
      navigate("/dashboard");
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Connecting to Spotify...</p>
      </div>
    </div>
  );
}
