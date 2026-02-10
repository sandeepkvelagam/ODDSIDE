import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

export default function CTASection() {
  return (
    <section className="bg-dark-cta py-20 sm:py-28 relative overflow-hidden">
      {/* Subtle glow */}
      <div
        className="glow-orb w-[300px] h-[300px] bg-[#EF6E59]/10 top-[20%] right-[10%] animate-glow-pulse"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="scroll-animate">
          <Logo size="large" showTagline={false} dark className="justify-center mb-6" />
        </div>
        <h2 className="scroll-animate text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight" style={{ transitionDelay: '100ms' }}>
          Ready to up your game?
        </h2>
        <p className="scroll-animate text-gray-400 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed" style={{ transitionDelay: '200ms' }}>
          Join players who&apos;ve ditched spreadsheets for Kvitt. Track,
          settle, play — all in one place.
        </p>
        <div className="scroll-animate" style={{ transitionDelay: '300ms' }}>
          <Link to="/login">
            <Button className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-12 sm:h-14 px-8 sm:px-10 rounded-full font-semibold text-base transition-all hover:scale-105">
              Start Tracking Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-gray-500 text-sm mt-4">No credit card required</p>
        </div>
      </div>
    </section>
  );
}
