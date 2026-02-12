import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, Clock, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import EmailCapture from "./EmailCapture";

export default function CTASection() {
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  return (
    <section className="bg-dark-cta py-20 sm:py-28 relative overflow-hidden">
      {/* Subtle glow */}
      <div
        className="glow-orb w-[300px] h-[300px] bg-[#EF6E59]/10 top-[20%] right-[10%] animate-glow-pulse"
        aria-hidden="true"
      />
      <div
        className="glow-orb w-[200px] h-[200px] bg-[#EF6E59]/8 bottom-[10%] left-[15%] animate-glow-pulse"
        style={{ animationDelay: "1.5s" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Urgency banner */}
        <div className="scroll-animate mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-[#EF6E59]/20 border border-amber-500/30">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-white/90">
              <strong className="text-amber-400">Free forever</strong> for early adopters
            </span>
          </div>
        </div>

        <div className="scroll-animate">
          <Logo size="large" showTagline={false} dark className="justify-center mb-6" />
        </div>

        <h2
          className="scroll-animate text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight"
          style={{ transitionDelay: "100ms" }}
        >
          Ready to up your game?
        </h2>

        <p
          className="scroll-animate text-gray-400 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed"
          style={{ transitionDelay: "200ms" }}
        >
          Join <strong className="text-white">500+ poker groups</strong> who&apos;ve ditched
          spreadsheets for Kvitt. Track, settle, play — all in one place.
        </p>

        {/* Stats row */}
        <div
          className="scroll-animate flex flex-wrap items-center justify-center gap-6 mb-8 text-sm text-white/60"
          style={{ transitionDelay: "250ms" }}
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <strong className="text-white">2,847</strong> active players
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            <strong className="text-white">$127K</strong> settled this month
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <strong className="text-white">30 sec</strong> average setup
          </span>
        </div>

        <div className="scroll-animate" style={{ transitionDelay: "300ms" }}>
          {!showEmailCapture ? (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                <Link to="/login">
                  <Button className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-12 sm:h-14 px-8 sm:px-10 rounded-full font-semibold text-base transition-all hover:scale-105">
                    Start Tracking Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-gray-500 text-sm">
                No credit card required •{" "}
                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="text-[#EF6E59] hover:underline"
                >
                  Or get updates first
                </button>
              </p>
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <EmailCapture
                source="cta"
                interests={["newsletter"]}
                variant="dark"
                placeholder="your@email.com"
                buttonText="Notify Me at Launch"
                showStats={true}
                showBadge={true}
                badgeText="🚀 Be first to know about new features"
              />
              <button
                onClick={() => setShowEmailCapture(false)}
                className="mt-4 text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                ← I&apos;m ready to sign up now
              </button>
            </div>
          )}
        </div>

        {/* Social proof ticker */}
        <div
          className="scroll-animate mt-12 pt-8 border-t border-white/10"
          style={{ transitionDelay: "400ms" }}
        >
          <p className="text-xs text-white/40 mb-3">Recent activity</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Mike from LA just settled $45
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              "High Rollers #7" started a game
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              3 new groups created today
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
