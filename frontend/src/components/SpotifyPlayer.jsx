import { useState, useEffect, useCallback, useRef } from "react";
import {
  Music, Play, Pause, SkipForward, SkipBack,
  Volume2, Volume1, VolumeX,
  Shuffle, Repeat,
  Maximize2, Minimize2,
  ExternalLink, LogOut, Loader2
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format milliseconds to mm:ss
const formatTime = (ms) => {
  if (!ms || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function SpotifyPlayer({ isHost = false }) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [previousVolume, setPreviousVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);

  // Progress tracking
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const progressInterval = useRef(null);

  // Shuffle & Repeat
  const [shuffleState, setShuffleState] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0=off, 1=context, 2=track

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);

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

          // Extract position, duration, shuffle, repeat from state
          if (!isSeeking) {
            setPosition(state.position);
          }
          setDuration(state.duration);
          setShuffleState(state.shuffle);
          setRepeatMode(state.repeat_mode);
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

  // Progress bar updates
  useEffect(() => {
    if (isPlaying && !isSeeking) {
      progressInterval.current = setInterval(() => {
        setPosition((prev) => Math.min(prev + 1000, duration));
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, isSeeking, duration]);

  // Connect to Spotify
  const connectSpotify = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/spotify/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const width = 450;
        const height = 730;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          data.auth_url,
          "Spotify Login",
          `width=${width},height=${height},left=${left},top=${top}`
        );

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
      setPosition(0);
      setDuration(0);
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

  // Volume controls
  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (player) {
      player.setVolume(newVolume / 100);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
      if (player) player.setVolume(previousVolume / 100);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
      if (player) player.setVolume(0);
    }
  };

  // Seek controls
  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekChange = (value) => {
    setPosition(value[0]);
  };

  const handleSeekCommit = async (value) => {
    const newPosition = value[0];
    setPosition(newPosition);
    setIsSeeking(false);
    if (player) {
      await player.seek(newPosition);
    }
  };

  // Shuffle toggle
  const toggleShuffle = async () => {
    try {
      const token = localStorage.getItem("token");
      const newState = !shuffleState;
      await fetch(`${API_URL}/api/spotify/shuffle?state=${newState}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setShuffleState(newState);
    } catch (error) {
      console.error("Error toggling shuffle:", error);
    }
  };

  // Repeat cycle: off -> context -> track -> off
  const cycleRepeat = async () => {
    try {
      const token = localStorage.getItem("token");
      const states = ["off", "context", "track"];
      const nextMode = (repeatMode + 1) % 3;
      await fetch(`${API_URL}/api/spotify/repeat?state=${states[nextMode]}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRepeatMode(nextMode);
    } catch (error) {
      console.error("Error cycling repeat:", error);
    }
  };

  // Get volume icon based on state
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

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

  // ==================== EXPANDED MODE ====================
  if (isExpanded) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/50 rounded-2xl">
          {/* Header Bar */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                <Music className="w-3 h-3 text-green-500" />
              </div>
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Now Playing</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={disconnectSpotify}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Large Album Art */}
          <div className="p-6 flex justify-center">
            {currentTrack ? (
              <img
                src={currentTrack.album.images[0]?.url}
                alt={currentTrack.name}
                className="w-48 h-48 md:w-56 md:h-56 rounded-xl shadow-2xl shadow-black/50 object-cover"
              />
            ) : (
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Music className="w-16 h-16 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="px-6 text-center">
            <p className="text-lg font-semibold text-white truncate">
              {currentTrack?.name || "No track playing"}
            </p>
            <p className="text-sm text-zinc-400 truncate mt-1">
              {currentTrack?.artists.map((a) => a.name).join(", ") || "Start playing from Spotify"}
            </p>
            {currentTrack?.album?.name && (
              <p className="text-xs text-zinc-500 truncate mt-1">
                {currentTrack.album.name}
              </p>
            )}
          </div>

          {/* Seek Bar */}
          <div className="px-6 pt-5 pb-2">
            <Slider
              value={[position]}
              max={duration || 100}
              step={1000}
              onPointerDown={handleSeekStart}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekCommit}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5 font-mono">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="px-6 py-4 flex items-center justify-center gap-6">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={cn(
                "transition-colors p-1",
                shuffleState ? "text-green-500" : "text-zinc-400 hover:text-white"
              )}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Previous */}
            <button
              onClick={skipPrevious}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Previous track"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 flex items-center justify-center transition-all"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-black" />
              ) : (
                <Play className="w-7 h-7 text-black ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={skipNext}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Next track"
            >
              <SkipForward className="w-6 h-6" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={cn(
                "relative transition-colors p-1",
                repeatMode > 0 ? "text-green-500" : "text-zinc-400 hover:text-white"
              )}
              aria-label="Cycle repeat mode"
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === 2 && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-green-500 text-black rounded-full w-3 h-3 flex items-center justify-center font-bold">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="px-6 pb-5 flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              <VolumeIcon className="w-4 h-4" />
            </button>
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

  // ==================== COMPACT MODE (default) ====================
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
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsExpanded(true)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
            <Button
              onClick={disconnectSpotify}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
            >
              <LogOut className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Current Track */}
        {currentTrack ? (
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentTrack.album.images[0]?.url}
              alt={currentTrack.name}
              className="w-12 h-12 rounded-lg shadow-lg"
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

        {/* Mini Progress Bar */}
        <div className="mb-3">
          <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-1000 ease-linear"
              style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 mt-1 font-mono">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            onClick={toggleShuffle}
            className={cn(
              "transition-colors",
              shuffleState ? "text-green-500" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={skipPrevious}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous track"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
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
            aria-label="Next track"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            onClick={cycleRepeat}
            className={cn(
              "relative transition-colors",
              repeatMode > 0 ? "text-green-500" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Cycle repeat mode"
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 2 && (
              <span className="absolute -top-0.5 -right-0.5 text-[7px] bg-green-500 text-black rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold">
                1
              </span>
            )}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
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
