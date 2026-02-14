import { useState, useEffect, useRef } from "react";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const suits = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
const suitColors = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-foreground", spades: "text-foreground" };

const scenarios = [
  {
    hand: [
      { rank: "K", suit: "hearts" },
      { rank: "Q", suit: "hearts" },
    ],
    community: [
      { rank: "10", suit: "hearts" },
      { rank: "7", suit: "clubs" },
      { rank: "2", suit: "spades" },
    ],
    suggestion: "You have a strong flush draw. Consider raising to build the pot.",
    action: "Raise",
    confidence: "High potential",
  },
  {
    hand: [
      { rank: "8", suit: "clubs" },
      { rank: "8", suit: "diamonds" },
    ],
    community: [
      { rank: "A", suit: "spades" },
      { rank: "K", suit: "hearts" },
      { rank: "3", suit: "clubs" },
    ],
    suggestion: "Mid pair with high community cards. Consider checking to see more cards.",
    action: "Check",
    confidence: "Moderate hand",
  },
  {
    hand: [
      { rank: "2", suit: "spades" },
      { rank: "7", suit: "diamonds" },
    ],
    community: [
      { rank: "A", suit: "hearts" },
      { rank: "K", suit: "clubs" },
      { rank: "Q", suit: "hearts" },
    ],
    suggestion: "Weak hand against strong community cards. Consider folding this round.",
    action: "Fold",
    confidence: "Low potential",
  },
];

const Card = ({ rank, suit }) => (
  <div className="w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg bg-white border border-border/50 shadow-sm flex flex-col items-center justify-center">
    <span className={cn("text-sm sm:text-base font-bold", suitColors[suit])}>
      {rank}
    </span>
    <span className={cn("text-lg sm:text-xl leading-none", suitColors[suit])}>
      {suits[suit]}
    </span>
  </div>
);

export default function AIAssistantDemo() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [phase, setPhase] = useState("dealing"); // dealing | thinking | suggestion
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const clearTimeouts = () => timeoutsRef.current.forEach(clearTimeout);

    const runDemo = () => {
      clearTimeouts();
      timeoutsRef.current = [];
      setPhase("dealing");

      const thinking = setTimeout(() => setPhase("thinking"), 1500);
      timeoutsRef.current.push(thinking);

      const suggestion = setTimeout(() => setPhase("suggestion"), 3000);
      timeoutsRef.current.push(suggestion);

      const next = setTimeout(() => {
        setCurrentScenario((prev) => (prev + 1) % scenarios.length);
        runDemo();
      }, 7000);
      timeoutsRef.current.push(next);
    };

    runDemo();
    return clearTimeouts;
  }, [isVisible]);

  const scenario = scenarios[currentScenario];

  return (
    <section ref={sectionRef} className="demo-section py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text */}
          <div className="order-2 md:order-1">
            <div className="scroll-animate-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-sm font-medium mb-4">
                <Brain className="w-4 h-4" />
                AI Poker Assistant
                <span className="bg-[#EF6E59] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  Soon
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Your AI game companion
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                New to poker? Input your cards with a simple UI and get instant
                suggestions — stay, raise, check, or fold. Perfect for
                beginners learning the game.
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                <strong>Disclaimer:</strong> AI suggestions are for entertainment
                purposes only and do not constitute financial advice. Always use
                your best judgment when playing.
              </div>
            </div>
          </div>

          {/* Demo card */}
          <div className="order-1 md:order-2 scroll-animate-scale">
            <div className="relative rounded-2xl border-2 border-dashed border-gray-200/60 overflow-hidden bg-white/95 shadow-lg md:shadow-[6px_6px_16px_rgba(0,0,0,0.05),-4px_-4px_12px_rgba(255,255,255,0.85),inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-1px_-1px_2px_rgba(0,0,0,0.02)]">
              {/* Coming Soon badge */}
              <div className="absolute top-3 right-3 z-20">
                <span className="text-[10px] font-semibold bg-[#EF6E59] text-white px-2.5 py-1 rounded-full shadow-sm">
                  Coming Soon
                </span>
              </div>

              <div className="p-5">
                {/* Header */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EF6E59] to-[#e04a35] flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      AI Assistant
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Analyzing your hand...
                    </p>
                  </div>
                </div>

                {/* Cards display */}
                <div className="mb-5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                    Your Hand
                  </p>
                  <div className="flex gap-2 mb-4">
                    {scenario.hand.map((card, i) => (
                      <div
                        key={`hand-${currentScenario}-${i}`}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 150}ms` }}
                      >
                        <Card rank={card.rank} suit={card.suit} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                    Community Cards
                  </p>
                  <div className="flex gap-2">
                    {scenario.community.map((card, i) => (
                      <div
                        key={`comm-${currentScenario}-${i}`}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${(i + 2) * 150}ms` }}
                      >
                        <Card rank={card.rank} suit={card.suit} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI suggestion */}
                <div className="h-[80px] overflow-hidden">
                  {phase === "thinking" && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
                      <Sparkles className="w-4 h-4 text-[#EF6E59] animate-pulse" />
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  {phase === "suggestion" && (
                    <div className="p-3 rounded-xl bg-[#EF6E59]/5 border border-[#EF6E59]/15 animate-fade-in-up">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#EF6E59]" />
                          <span className="text-[10px] font-semibold text-[#EF6E59]">
                            Suggestion: {scenario.action}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {scenario.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {scenario.suggestion}
                      </p>
                    </div>
                  )}
                </div>

                {/* Consent line */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
                  <div className="w-3.5 h-3.5 rounded border border-border/50 bg-white flex items-center justify-center">
                    <span className="text-[8px] text-[#EF6E59]">✓</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    I understand these are suggestions only
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
