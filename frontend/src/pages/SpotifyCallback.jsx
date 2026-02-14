import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Connecting to Spotify...");

  useEffect(() => {
    const exchangeToken = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage("Spotify authorization was denied");
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: "SPOTIFY_CALLBACK", error: true }, "*");
            window.close();
          }
        }, 2000);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("No authorization code received");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const redirectUri = sessionStorage.getItem("spotify_redirect_uri") || `${window.location.origin}/spotify/callback`;
        
        const response = await fetch(`${API_URL}/api/spotify/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });

        if (response.ok) {
          setStatus("success");
          setMessage("Successfully connected to Spotify!");
          
          // Notify parent window and close
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: "SPOTIFY_CALLBACK", success: true }, "*");
              window.close();
            } else {
              // If not a popup, redirect to dashboard
              window.location.href = "/dashboard";
            }
          }, 1500);
        } else {
          const data = await response.json();
          setStatus("error");
          setMessage(data.detail || "Failed to connect to Spotify");
        }
      } catch (err) {
        console.error("Error exchanging token:", err);
        setStatus("error");
        setMessage("An error occurred while connecting to Spotify");
      }
    };

    exchangeToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800">
        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-foreground font-medium">{message}</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-foreground font-medium">{message}</p>
            <p className="text-muted-foreground text-sm mt-2">This window will close automatically...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-foreground font-medium">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-foreground transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
