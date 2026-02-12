import { useState, useEffect } from "react";
import { Brain, Music, BarChart3, Bell, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmailCapture from "./EmailCapture";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

const items = [
  {
    icon: Brain,
    title: "AI Poker Assistant",
    description:
      "Get intelligent suggestions during your game. Input your cards, get instant analysis.",
    status: "Coming Soon",
    interest: "ai_assistant",
    waitlistKey: "ai_waitlist",
    teaser: "Be first to try our AI",
    spotsLeft: 47,
  },
  {
    icon: Music,
    title: "Music Integration",
    description:
      "Connect Spotify or Apple Music. Host controls the vibe — play tunes right from the game page.",
    status: "Coming Soon",
    interest: "music_integration",
    waitlistKey: "music_waitlist",
    teaser: "Control the soundtrack",
    spotsLeft: 89,
  },
  {
    icon: BarChart3,
    title: "Dashboard Charts",
    description:
      "Visual analytics for your poker performance. Track trends, streaks, and more.",
    status: "In Development",
    interest: "charts",
    waitlistKey: "charts_waitlist",
    teaser: "See your poker journey",
    spotsLeft: 124,
  },
];

export default function ComingSoonSection() {
  const [expandedCard, setExpandedCard] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    axios
      .get(`${API_URL}/api/subscribers/stats`)
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <section className="py-20 sm:py-28 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {/* FOMO badge */}
          <div className="scroll-animate flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              Launching Q1 2026 — Limited beta spots
            </span>
          </div>

          <h2 className="scroll-animate text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            What&apos;s <span className="text-[#EF6E59]">Next</span>
          </h2>
          <p
            className="scroll-animate text-muted-foreground max-w-lg mx-auto"
            style={{ transitionDelay: "100ms" }}
          >
            Join the waitlist to get early access and shape these features.
            <br />
            <strong className="text-foreground">
              Beta testers get lifetime discounts.
            </strong>
          </p>
        </div>

        <div className="scroll-animate grid sm:grid-cols-3 gap-4 sm:gap-6">
          {items.map((item, i) => {
            const isExpanded = expandedCard === i;
            const waitlistCount = stats[item.waitlistKey] || 0;
            const progressPercent =
              stats[`${item.waitlistKey}_percent`] || Math.min(100, (waitlistCount / 500) * 100);

            return (
              <div
                key={i}
                className={`bg-white/60 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                  isExpanded
                    ? "border-[#EF6E59]/50 shadow-lg shadow-[#EF6E59]/10"
                    : "border-border/30 hover:border-[#EF6E59]/30"
                } p-5 sm:p-6 relative`}
              >
                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.status === "In Development"
                        ? "bg-[#EF6E59]/10 text-[#EF6E59]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#EF6E59]" />
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm sm:text-base mb-1.5 text-foreground pr-16">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {waitlistCount > 0 ? waitlistCount : item.spotsLeft} on waitlist
                    </span>
                    <span className="text-[#EF6E59] font-medium">
                      {100 - Math.round(progressPercent)}% spots left
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#EF6E59] to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(15, progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                {!isExpanded ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-[#EF6E59]/30 text-[#EF6E59] hover:bg-[#EF6E59]/10 hover:border-[#EF6E59]"
                    onClick={() => setExpandedCard(i)}
                  >
                    <Bell className="w-3 h-3 mr-1.5" />
                    {item.teaser}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <EmailCapture
                      source={`waitlist_${item.interest}`}
                      interests={[item.interest]}
                      variant="compact"
                      placeholder="your@email.com"
                      buttonText="Notify Me"
                      onSuccess={() => {
                        setTimeout(() => setExpandedCard(null), 2000);
                      }}
                    />
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground w-full"
                      onClick={() => setExpandedCard(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="scroll-animate mt-10 text-center" style={{ transitionDelay: "400ms" }}>
          <p className="text-sm text-muted-foreground mb-4">
            Want all updates? Join our newsletter for the full scoop.
          </p>
          <div className="max-w-sm mx-auto">
            <EmailCapture
              source="coming_soon_newsletter"
              interests={["ai_assistant", "music_integration", "charts", "newsletter"]}
              variant="inline"
              placeholder="your@email.com"
              buttonText="Get All Updates"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
