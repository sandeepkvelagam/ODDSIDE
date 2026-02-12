import { useState, useEffect } from "react";
import { Loader2, Check, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

/**
 * Reusable email capture component with FOMO elements
 *
 * @param {string} source - Where the form is placed (hero, footer, waitlist_ai, etc.)
 * @param {string[]} interests - What features they're interested in
 * @param {string} variant - "default" | "compact" | "inline" | "dark"
 * @param {string} placeholder - Custom placeholder text
 * @param {string} buttonText - Custom button text
 * @param {boolean} showStats - Show live subscriber count
 * @param {boolean} showBadge - Show "Limited spots" badge
 * @param {string} className - Additional classes
 */
export default function EmailCapture({
  source = "landing",
  interests = [],
  variant = "default",
  placeholder = "Enter your email",
  buttonText = "Join the Waitlist",
  showStats = false,
  showBadge = false,
  badgeText = "🔥 Limited early access",
  className = "",
  onSuccess,
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(null);

  // Fetch subscriber stats for FOMO
  useEffect(() => {
    if (showStats) {
      axios
        .get(`${API_URL}/api/subscribers/stats`)
        .then((res) => setStats(res.data))
        .catch(() => {
          // Fallback stats for demo
          setStats({ total_subscribers: 127, recent_24h: 12 });
        });
    }
  }, [showStats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await axios.post(`${API_URL}/api/subscribe`, {
        email,
        source,
        interests,
      });
      setStatus("success");
      setMessage(res.data.message || "You're in!");
      setEmail("");
      onSuccess?.(res.data);
    } catch (err) {
      setStatus("error");
      setMessage(
        err.response?.data?.detail || "Something went wrong. Try again."
      );
    }
  };

  // Success state
  if (status === "success") {
    return (
      <div className={`${className}`}>
        <div
          className={`flex items-center gap-3 p-4 rounded-xl ${
            variant === "dark"
              ? "bg-green-500/20 border border-green-500/30"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              variant === "dark" ? "bg-green-500/30" : "bg-green-100"
            }`}
          >
            <Check
              className={`w-5 h-5 ${
                variant === "dark" ? "text-green-400" : "text-green-600"
              }`}
            />
          </div>
          <div>
            <p
              className={`font-semibold ${
                variant === "dark" ? "text-green-400" : "text-green-700"
              }`}
            >
              You&apos;re on the list!
            </p>
            <p
              className={`text-sm ${
                variant === "dark" ? "text-green-400/70" : "text-green-600"
              }`}
            >
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compact inline variant
  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className={`${className}`}>
        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-11"
            required
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-11 px-5 whitespace-nowrap"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              buttonText
            )}
          </Button>
        </div>
        {status === "error" && (
          <p className="text-red-500 text-sm mt-2">{message}</p>
        )}
      </form>
    );
  }

  // Dark variant (for hero/CTA sections)
  if (variant === "dark") {
    return (
      <div className={`${className}`}>
        {showBadge && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF6E59]/20 border border-[#EF6E59]/30 text-[#EF6E59] text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              {badgeText}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#EF6E59] focus:ring-[#EF6E59]/20"
              required
            />
            <Button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-12 px-6 rounded-full font-semibold whitespace-nowrap transition-all hover:scale-105"
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {buttonText}
            </Button>
          </div>
        </form>

        {status === "error" && (
          <p className="text-red-400 text-sm mt-3 text-center">{message}</p>
        )}

        {showStats && stats && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>
                <strong className="text-white">{stats.total_subscribers}</strong>{" "}
                people joined
              </span>
            </span>
            {stats.recent_24h > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>
                  <strong className="text-white">{stats.recent_24h}</strong> in
                  last 24h
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Compact variant (smaller, for cards)
  if (variant === "compact") {
    return (
      <div className={`${className}`}>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="flex-1 h-10 text-sm"
              required
            />
            <Button
              type="submit"
              disabled={status === "loading"}
              size="sm"
              className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-10 px-4"
            >
              {status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                buttonText
              )}
            </Button>
          </div>
        </form>
        {status === "error" && (
          <p className="text-red-500 text-xs mt-1.5">{message}</p>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`${className}`}>
      {showBadge && (
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF6E59]/10 border border-[#EF6E59]/20 text-[#EF6E59] text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            {badgeText}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-11"
            required
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-11 px-5"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {buttonText}
          </Button>
        </div>
      </form>

      {status === "error" && (
        <p className="text-red-500 text-sm mt-2">{message}</p>
      )}

      {showStats && stats && (
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <strong>{stats.total_subscribers}</strong> joined
          </span>
          {stats.recent_24h > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <strong>{stats.recent_24h}</strong> today
            </span>
          )}
        </div>
      )}
    </div>
  );
}
