import { Users, Play, Zap } from "lucide-react";

const cards = [
  {
    icon: Users,
    step: "01",
    title: "Create Your Circle",
    description:
      "Set up your poker group in seconds. Invite friends by email or share a link. Plan game nights with built-in group chat.",
  },
  {
    icon: Play,
    step: "02",
    title: "Play & Track Live",
    description:
      "Host starts the game, players join with one tap. Buy-ins, cash-outs, and chip counts tracked in real-time with precision.",
  },
  {
    icon: Zap,
    step: "03",
    title: "Settle Instantly",
    description:
      "Our smart algorithm minimizes the number of payments. Settle up via Stripe in a few clicks — safe and seamless.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            How <span className="text-[#EF6E59]">Kvitt</span> Works
          </h2>
          <p className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-100 ease-out text-muted-foreground max-w-xl mx-auto">
            From group creation to settlement in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {cards.map((card, i) => (
            <div
              key={i}
              className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out relative text-center p-6 sm:p-8 rounded-2xl bg-secondary/30 border border-border/30"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <span
                className="text-6xl font-black absolute top-4 right-6 opacity-5 select-none"
                style={{ color: "#EF6E59" }}
              >
                {card.step}
              </span>
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#EF6E59] to-[#e04a35] flex items-center justify-center shadow-lg">
                <card.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-foreground">
                {card.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
