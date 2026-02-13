import { useState, useEffect, useCallback } from "react";
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, ExternalLink, LogOut, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SpotifyPlayer({ isHost = false }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [accessToken, setAccessToken] = useState(null);

  // Check Spotify connection status
  const checkSpotifyStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/spotify/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setSpotifyUser(data.spotify_user);
        setIsPremium(data.is_premium);
        if (data.access_token) {
          setAccessToken(data.access_token);
        }
      }
    } catch (error) {
      console.error("Error checking Spotify status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSpotifyStatus();
  }, [checkSpotifyStatus]);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!isConnected || !isPremium || !accessToken) return;

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Kvitt Poker Night",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.5,
      });

      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("Spotify Player Ready with Device ID:", device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline:", device_id);
      });

      spotifyPlayer.addListener("player_state_changed", (state) => {
        if (state) {
          setCurrentTrack(state.track_window.current_track);
          setIsPlaying(!state.paused);
        }
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [isConnected, isPremium, accessToken]);

  // Connect to Spotify
  const connectSpotify = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/spotify/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Open Spotify auth in popup
        const width = 450;
        const height = 730;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          data.auth_url,
          "Spotify Login",
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Listen for callback
        window.addEventListener("message", async (event) => {
          if (event.data.type === "SPOTIFY_CALLBACK") {
            await checkSpotifyStatus();
          }
        });
      }
    } catch (error) {
      console.error("Error connecting to Spotify:", error);
    }
  };

  // Disconnect from Spotify
  const disconnectSpotify = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/spotify/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (player) {
        player.disconnect();
      }
      
      setIsConnected(false);
      setSpotifyUser(null);
      setAccessToken(null);
      setCurrentTrack(null);
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
    }
  };

  // Playback controls
  const togglePlay = () => {
    if (player) {
      player.togglePlay();
    }
  };

  const skipNext = () => {
    if (player) {
      player.nextTrack();
    }
  };

  const skipPrevious = () => {
    if (player) {
      player.previousTrack();
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (player) {
      player.setVolume(newVolume / 100);
    }
  };

  // Don't show for non-hosts
  if (!isHost) return null;

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-green-500" />
            <span className="text-muted-foreground text-sm">Loading Spotify...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <span className="text-foreground font-medium text-sm">Music Player</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Connect Spotify to play music during your poker night
              </p>
            </div>
            <Button
              onClick={connectSpotify}
              className="bg-green-500 hover:bg-green-600 text-white text-xs px-4"
              size="sm"
            >
              Connect Spotify
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Connected but not premium
  if (!isPremium) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium text-sm">Connected as {spotifyUser}</span>
              </div>
              <p className="text-amber-400 text-xs mt-0.5">
                Spotify Premium required for playback control
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => window.open("https://open.spotify.com", "_blank")}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Spotify
              </Button>
              <Button
                onClick={disconnectSpotify}
                variant="ghost"
                size="sm"
                className="text-xs text-red-400 hover:text-red-300"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full player (Premium connected)
  return (
    <div className="rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
              <Music className="w-3 h-3 text-green-500" />
            </div>
            <span className="text-muted-foreground text-xs">{spotifyUser}</span>
          </div>
          <Button
            onClick={disconnectSpotify}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-red-400 h-6 px-2"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>

        {/* Current Track */}
        {currentTrack ? (
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentTrack.album.images[0]?.url}
              alt={currentTrack.name}
              className="w-12 h-12 rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">
                {currentTrack.name}
              </p>
              <p className="text-muted-foreground text-xs truncate">
                {currentTrack.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Music className="w-6 h-6 text-zinc-600" />
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm">No track playing</p>
              <p className="text-muted-foreground text-xs">
                Start playing from the Spotify app
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            onClick={skipPrevious}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-black" />
            ) : (
              <Play className="w-5 h-5 text-black ml-0.5" />
            )}
          </button>
          <button
            onClick={skipNext}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
