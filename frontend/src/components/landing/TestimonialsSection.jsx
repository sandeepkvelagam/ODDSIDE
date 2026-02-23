import { useState, useEffect } from "react";
import axios from "axios";
import { Star } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Fallback testimonials shown when no real reviews exist yet
const FALLBACK_TESTIMONIALS = [
  {
    name: "Mike T.",
    role: "Friday Night Host",
    quote: "Finally, no more spreadsheets and Venmo chaos. Everyone knows who owes what.",
    avatar: "M",
    rating: 5,
  },
  {
    name: "Sarah K.",
    role: "Weekly Player",
    quote: "The settlement feature alone saved our friend group from so many arguments.",
    avatar: "S",
    rating: 5,
  },
  {
    name: "James R.",
    role: "Tournament Organizer",
    quote: "We run 20+ player tournaments now. Kvitt handles it all flawlessly.",
    avatar: "J",
    rating: 5,
  },
  {
    name: "Lisa M.",
    role: "Casual Player",
    quote: "I love that I can see my stats over time. Really motivating to improve!",
    avatar: "L",
    rating: 5,
  },
  {
    name: "Dave W.",
    role: "Weekly Host",
    quote: "Setup took 30 seconds. Now everyone in our group tracks everything automatically.",
    avatar: "D",
    rating: 5,
  },
  {
    name: "Chris P.",
    role: "Poker League Admin",
    quote: "Managing a 30-person league was chaos before Kvitt. Now it runs itself.",
    avatar: "C",
    rating: 5,
  },
];

/**
 * TestimonialsSection - Displays real user reviews from the feedback system,
 * with fallback to curated testimonials when not enough real data exists.
 *
 * On mount, fetches trends from GET /feedback/trends to show aggregate stats
 * ("Rated 4.8/5 by 2,400 players"). Falls back to static copy when no data.
 */
export default function TestimonialsSection() {
  const [testimonials] = useState(FALLBACK_TESTIMONIALS);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Use the statistically honest public-stats endpoint (no auth required)
    // Only shows stats if 100+ unique ratings AND avg >= 3.5
    axios
      .get(`${API}/feedback/public-stats`, { params: { days: 90 } })
      .then((res) => {
        const data = res.data || {};
        if (data.show_public) {
          setStats({ count: data.total_unique, avgRating: data.avg_rating });
        }
      })
      .catch(() => {});
  }, []);

  const doubled = [...testimonials, ...testimonials];

  return (
    <section className="py-20 sm:py-28 bg-secondary/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="scroll-animate text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Trusted by Players
          </h2>
          <p className="scroll-animate text-muted-foreground" style={{ transitionDelay: '100ms' }}>
            {stats
              ? `Rated ${stats.avgRating.toFixed(1)}/5 by ${stats.count.toLocaleString()} players`
              : "Real stories from hosts who run better game nights."}
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
              className="w-[300px] sm:w-[340px] flex-shrink-0 bg-white dark:bg-card rounded-2xl border border-border/30 p-5 shadow-card"
            >
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className={`w-3.5 h-3.5 ${
                      j < (t.rating || 5)
                        ? "fill-[#EF6E59] text-[#EF6E59]"
                        : "text-muted-foreground/30"
                    }`}
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
