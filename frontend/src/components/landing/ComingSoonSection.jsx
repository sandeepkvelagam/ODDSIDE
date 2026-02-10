import { Brain, Music, BarChart3 } from "lucide-react";

const items = [
  {
    icon: Brain,
    title: "AI Poker Assistant",
    description:
      "Get intelligent suggestions during your game. Input your cards, get instant analysis.",
    status: "Coming Soon",
  },
  {
    icon: Music,
    title: "Music Integration",
    description:
      "Connect Spotify or Apple Music. Host controls the vibe — play tunes right from the game page.",
    status: "Coming Soon",
  },
  {
    icon: BarChart3,
    title: "Dashboard Charts",
    description:
      "Visual analytics for your poker performance. Track trends, streaks, and more.",
    status: "In Development",
  },
];

export default function ComingSoonSection() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="scroll-animate text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            What&apos;s <span className="text-[#EF6E59]">Next</span>
          </h2>
          <p className="scroll-animate text-muted-foreground max-w-lg mx-auto" style={{ transitionDelay: '100ms' }}>
            We&apos;re building features to make your game nights even better.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="scroll-animate-scale bg-white/60 backdrop-blur-sm rounded-2xl border border-border/30 p-5 sm:p-6 relative"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
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
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-[#EF6E59]" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1.5 text-foreground pr-16">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
