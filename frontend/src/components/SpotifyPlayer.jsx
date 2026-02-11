import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  Search,
  X,
  Loader2,
  ExternalLink,
  Wifi,
  WifiOff,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Format milliseconds to mm:ss
const formatTime = (ms) => {
  if (!ms) return "0:00";
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function SpotifyPlayer({ isHost = false }) {
  const [connected, setConnected] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accessToken, setAccessToken] = useState(null);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const progressInterval = useRef(null);

  // Check connection status on mount
  useEffect(() => {
    checkSpotifyStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && window.location.pathname.includes("/game/")) {
      handleSpotifyCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken || !isPremium) return;

    // Load Spotify Web Playback SDK
    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Kvitt Poker Night",
        getOAuthToken: (cb) => cb(accessToken),
        volume: volume / 100,
      });

      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("Spotify SDK Ready with Device ID:", device_id);
        setDeviceId(device_id);
        setSdkReady(true);
        toast.success("Spotify player ready!");
      });

      spotifyPlayer.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline:", device_id);
        setSdkReady(false);
      });

      spotifyPlayer.addListener("player_state_changed", (state) => {
        if (!state) return;
        setPlayerState({
          is_playing: !state.paused,
          item: state.track_window.current_track,
          progress_ms: state.position,
          duration_ms: state.duration,
        });
        setProgress(state.position);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    // If SDK already loaded
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken, isPremium]);

  // Progress bar update
  useEffect(() => {
    if (playerState?.is_playing) {
      progressInterval.current = setInterval(() => {
        setProgress((prev) => prev + 1000);
      }, 1000);
    } else {
      clearInterval(progressInterval.current);
    }

    return () => clearInterval(progressInterval.current);
  }, [playerState?.is_playing]);

  const checkSpotifyStatus = async () => {
    try {
      const response = await axios.get(`${API}/spotify/status`);
      setConnected(response.data.connected);
      setIsPremium(response.data.is_premium);
      setSpotifyUser(response.data.spotify_user);

      if (response.data.connected) {
        // Get stored token for SDK
        const tokenRes = await axios.post(`${API}/spotify/refresh`, {
          refresh_token: localStorage.getItem("spotify_refresh_token"),
        }).catch(() => null);
        
        if (tokenRes?.data?.access_token) {
          setAccessToken(tokenRes.data.access_token);
        }
        
        fetchPlaybackState();
      }
    } catch (error) {
      console.error("Failed to check Spotify status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotifyCallback = async (code) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/spotify/token`, {
        code,
        redirect_uri: window.location.origin + window.location.pathname,
      });

      setConnected(true);
      setIsPremium(response.data.is_premium);
      setSpotifyUser(response.data.spotify_user);
      setAccessToken(response.data.access_token);
      
      // Store refresh token locally
      if (response.data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", response.data.refresh_token);
      }

      toast.success(`Connected as ${response.data.spotify_user}`);
      fetchPlaybackState();
    } catch (error) {
      toast.error("Failed to connect Spotify");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const connectSpotify = async () => {
    try {
      const response = await axios.get(`${API}/spotify/auth-url`);
      // Redirect to Spotify auth
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start Spotify auth");
    }
  };

  const disconnectSpotify = async () => {
    try {
      await axios.delete(`${API}/spotify/disconnect`);
      setConnected(false);
      setPlayerState(null);
      setAccessToken(null);
      if (player) {
        player.disconnect();
      }
      toast.success("Spotify disconnected");
    } catch (error) {
      toast.error("Failed to disconnect");
    }
  };

  const fetchPlaybackState = async () => {
    try {
      const response = await axios.get(`${API}/spotify/playback`);
      if (response.data.item) {
        setPlayerState(response.data);
        setProgress(response.data.progress_ms || 0);
      }
    } catch (error) {
      // Token might be expired
      console.error("Playback state error:", error);
    }
  };

  const handlePlay = async () => {
    try {
      if (player && deviceId) {
        await player.resume();
      } else {
        await axios.put(`${API}/spotify/play`, { device_id: deviceId });
      }
      fetchPlaybackState();
    } catch (error) {
      toast.error("Failed to play");
    }
  };

  const handlePause = async () => {
    try {
      if (player) {
        await player.pause();
      } else {
        await axios.put(`${API}/spotify/pause`, null, {
          params: { device_id: deviceId },
        });
      }
      fetchPlaybackState();
    } catch (error) {
      toast.error("Failed to pause");
    }
  };

  const handleNext = async () => {
    try {
      if (player) {
        await player.nextTrack();
      } else {
        await axios.post(`${API}/spotify/next`, null, {
          params: { device_id: deviceId },
        });
      }
      setTimeout(fetchPlaybackState, 300);
    } catch (error) {
      toast.error("Failed to skip");
    }
  };

  const handlePrevious = async () => {
    try {
      if (player) {
        await player.previousTrack();
      } else {
        await axios.post(`${API}/spotify/previous`, null, {
          params: { device_id: deviceId },
        });
      }
      setTimeout(fetchPlaybackState, 300);
    } catch (error) {
      toast.error("Failed to go back");
    }
  };

  const handleVolumeChange = async (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    try {
      if (player) {
        await player.setVolume(newVolume / 100);
      } else {
        await axios.put(`${API}/spotify/volume`, {
          volume_percent: newVolume,
          device_id: deviceId,
        });
      }
    } catch (error) {
      console.error("Volume error:", error);
    }
  };

  const handleSeek = async (value) => {
    const position = value[0];
    setProgress(position);

    try {
      if (player) {
        await player.seek(position);
      } else {
        await axios.put(`${API}/spotify/seek`, null, {
          params: { position_ms: position, device_id: deviceId },
        });
      }
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  const searchTracks = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await axios.get(`${API}/spotify/search`, {
        params: { q: searchQuery, type: "track", limit: 10 },
      });
      setSearchResults(response.data.tracks?.items || []);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const playTrack = async (track) => {
    try {
      await axios.put(`${API}/spotify/play`, {
        track_uri: track.uri,
        device_id: deviceId,
      });
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      setTimeout(fetchPlaybackState, 500);
      toast.success(`Playing: ${track.name}`);
    } catch (error) {
      toast.error("Failed to play track");
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      handleVolumeChange([50]);
    } else {
      handleVolumeChange([0]);
    }
  };

  // Non-host view - just show what's playing
  if (!isHost && connected && playerState?.item) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <img
            src={playerState.item.album?.images?.[0]?.url || playerState.item.album?.images?.[1]?.url}
            alt={playerState.item.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate text-sm">
              {playerState.item.name}
            </p>
            <p className="text-zinc-400 text-xs truncate">
              {playerState.item.artists?.map((a) => a.name).join(", ")}
            </p>
          </div>
          <Music className="w-5 h-5 text-green-500" />
        </div>
      </div>
    );
  }

  // Host view
  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 p-6">
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading Spotify...</span>
        </div>
      </div>
    );
  }

  if (!isHost) {
    return null;
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs font-medium tracking-widest uppercase">
            Music Player
          </span>
          <Music className="w-4 h-4 text-zinc-500" />
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            {sdkReady ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-500" />
            )}
            <span className="text-xs text-zinc-500">{spotifyUser}</span>
          </div>
        )}
      </div>

      {!connected ? (
        /* Connect State */
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <Music className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">Connect Spotify</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Play music during your poker night. Requires Spotify Premium.
          </p>
          <Button
            onClick={connectSpotify}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect Spotify
          </Button>
        </div>
      ) : !isPremium ? (
        /* Premium Required */
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Music className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">Premium Required</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Spotify Premium is required for playback control.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectSpotify}
              className="border-zinc-700"
            >
              Disconnect
            </Button>
            <Button
              size="sm"
              onClick={() => window.open("https://spotify.com/premium", "_blank")}
              className="bg-green-500 hover:bg-green-600 text-black"
            >
              Get Premium
            </Button>
          </div>
        </div>
      ) : (
        /* Player */
        <div className="p-4">
          {/* Album Art & Track Info */}
          <div className="flex gap-4 mb-4">
            <div className="w-24 h-24 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
              {playerState?.item?.album?.images?.[0] ? (
                <img
                  src={playerState.item.album.images[0].url}
                  alt={playerState.item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-8 h-8 text-zinc-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-white font-semibold truncate">
                {playerState?.item?.name || "No track playing"}
              </p>
              <p className="text-zinc-400 text-sm truncate">
                {playerState?.item?.artists?.map((a) => a.name).join(", ") || "—"}
              </p>
              <p className="text-zinc-500 text-xs truncate mt-1">
                {playerState?.item?.album?.name || ""}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[progress]}
              max={playerState?.item?.duration_ms || playerState?.duration_ms || 100}
              step={1000}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(playerState?.item?.duration_ms || playerState?.duration_ms)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="text-zinc-400 hover:text-white"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              onClick={playerState?.is_playing ? handlePause : handlePlay}
              className="w-12 h-12 rounded-full bg-white hover:bg-zinc-200 text-black"
            >
              {playerState?.is_playing ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="text-zinc-400 hover:text-white"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white h-8 w-8"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          {/* Search Toggle */}
          <div className="border-t border-zinc-800 pt-4">
            {showSearch ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchTracks()}
                      placeholder="Search songs..."
                      className="pl-9 bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <Button onClick={searchTracks} disabled={searching} size="sm">
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchResults([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {searchResults.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => playTrack(track)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                        >
                          <img
                            src={track.album.images[2]?.url || track.album.images[0]?.url}
                            alt={track.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{track.name}</p>
                            <p className="text-zinc-400 text-xs truncate">
                              {track.artists.map((a) => a.name).join(", ")}
                            </p>
                          </div>
                          <span className="text-zinc-500 text-xs">
                            {formatTime(track.duration_ms)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowSearch(true)}
                className="w-full border-zinc-700 text-zinc-400 hover:text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                Search songs
              </Button>
            )}
          </div>

          {/* Disconnect */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectSpotify}
              className="text-zinc-500 hover:text-zinc-300 w-full"
            >
              Disconnect Spotify
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
