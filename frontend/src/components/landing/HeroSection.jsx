import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import TypewriterText from "./TypewriterText";
import EventFlowAnimation from "./EventFlowAnimation";
import FeaturePills from "./FeaturePills";

export default function HeroSection() {
  return (
    <section className="bg-dark-hero relative overflow-hidden min-h-screen flex items-center">
      {/* Glowing orbs */}
      <div
        className="glow-orb w-[350px] h-[350px] bg-[#EF6E59]/15 top-[10%] left-[5%] animate-glow-pulse"
        aria-hidden="true"
      />
      <div
        className="glow-orb w-[250px] h-[250px] bg-[#EF6E59]/10 bottom-[15%] right-[10%] animate-glow-pulse"
        style={{ animationDelay: "2s" }}
        aria-hidden="true"
      />
      <div
        className="glow-orb w-[180px] h-[180px] bg-[#EF6E59]/8 top-[55%] left-[45%] animate-float"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center py-24 sm:py-32 w-full">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="large" showTagline={false} className="justify-center" />
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6">
          Your side, <span className="text-[#EF6E59]">settled.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed px-4">
          The modern way to track poker nights. No spreadsheets. No arguments.
          Just play.
        </p>

        {/* Typewriter */}
        <TypewriterText className="mb-10" />

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link to="/login">
            <Button className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-12 px-8 rounded-full font-semibold text-base transition-all hover:scale-105">
              Try Kvitt free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <button
            onClick={() =>
              document
                .getElementById("how-it-works")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="h-12 px-6 rounded-full font-medium text-white/70 border border-white/20 hover:bg-white/10 transition-all text-sm inline-flex items-center gap-2"
          >
            See how it works
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Flow animation */}
        <EventFlowAnimation />

        {/* Feature pills */}
        <FeaturePills />
      </div>
    </section>
  );
}
