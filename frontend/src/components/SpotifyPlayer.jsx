import { Music } from "lucide-react";

export default function SpotifyPlayer({ isHost = false }) {
  // Don't show for non-hosts
  if (!isHost) return null;

  return (
    <div className="rounded-2xl overflow-hidden">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium text-sm">Music Player</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/20 text-primary rounded-full">
                COMING SOON
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Spotify integration for your poker nights
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
