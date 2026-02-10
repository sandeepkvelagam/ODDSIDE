import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Mike T.",
    role: "Friday Night Host",
    quote:
      "Finally, no more spreadsheets and Venmo chaos. Everyone knows who owes what.",
    avatar: "M",
  },
  {
    name: "Sarah K.",
    role: "Weekly Player",
    quote:
      "The settlement feature alone saved our friend group from so many arguments.",
    avatar: "S",
  },
  {
    name: "James R.",
    role: "Tournament Organizer",
    quote:
      "We run 20+ player tournaments now. Kvitt handles it all flawlessly.",
    avatar: "J",
  },
  {
    name: "Lisa M.",
    role: "Casual Player",
    quote:
      "I love that I can see my stats over time. Really motivating to improve!",
    avatar: "L",
  },
  {
    name: "Dave W.",
    role: "Weekly Host",
    quote:
      "Setup took 30 seconds. Now everyone in our group tracks everything automatically.",
    avatar: "D",
  },
  {
    name: "Chris P.",
    role: "Poker League Admin",
    quote:
      "Managing a 30-person league was chaos before Kvitt. Now it runs itself.",
    avatar: "C",
  },
];

const doubled = [...testimonials, ...testimonials];

export default function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="scroll-animate text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Trusted by Players
          </h2>
          <p className="scroll-animate text-muted-foreground" style={{ transitionDelay: '100ms' }}>
            Real stories from hosts who run better game nights.
          </p>
        </div>
      </div>

      <div className="train-scroll">
        <div
          className="train-track flex gap-5 animate-scroll-train"
          style={{ width: "max-content" }}
        >
          {doubled.map((t, i) => (
            <div
              key={i}
              className="w-[300px] sm:w-[340px] flex-shrink-0 bg-white rounded-2xl border border-border/30 p-5 shadow-card"
            >
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="w-3.5 h-3.5 fill-[#EF6E59] text-[#EF6E59]"
                  />
                ))}
              </div>
              <p className="text-foreground text-sm italic mb-4 leading-relaxed">
                &quot;{t.quote}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#EF6E59]/15 flex items-center justify-center font-bold text-[#EF6E59] text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
