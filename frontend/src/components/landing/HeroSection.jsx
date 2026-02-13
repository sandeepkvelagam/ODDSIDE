import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Clock, Trophy, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import Logo from "@/components/Logo";
import TypewriterText from "./TypewriterText";
import EventFlowAnimation from "./EventFlowAnimation";
import FeaturePills from "./FeaturePills";
import EmailCapture from "./EmailCapture";

export default function HeroSection() {
  const [showEmailCapture, setShowEmailCapture] = useState(false);

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
        {/* Urgency banner */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EF6E59]/20 to-amber-500/20 border border-[#EF6E59]/30 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-white/90 font-medium">
              <strong className="text-[#EF6E59]">127+ players</strong> joined this week
            </span>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-8">
          <Logo size="large" showTagline={false} dark className="justify-center" />
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

        {/* CTA Buttons or Email Capture */}
        {!showEmailCapture ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link to="/login">
              <Button className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-12 px-8 rounded-full font-semibold text-base transition-all hover:scale-105">
                Try Kvitt free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <button
              onClick={() => setShowEmailCapture(true)}
              className="h-12 px-6 rounded-full font-medium text-white/70 border border-white/20 hover:bg-white/10 transition-all text-sm inline-flex items-center gap-2"
            >
              Get early access updates
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mb-6 max-w-lg mx-auto">
            <EmailCapture
              source="hero"
              interests={["newsletter"]}
              variant="dark"
              placeholder="your@email.com"
              buttonText="Get Early Access"
              showStats={true}
              showBadge={true}
              badgeText="🎁 Early supporters get exclusive perks"
            />
            <button
              onClick={() => setShowEmailCapture(false)}
              className="mt-3 text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              ← Back to sign up
            </button>
          </div>
        )}

        {/* Trusted by players */}
        <div className="flex justify-center mb-8">
          <div className="border-white/20 rounded-full flex items-center gap-1.5 border p-1 shadow-sm shadow-black/5 bg-white/5 backdrop-blur-sm">
            <AvatarGroup>
              <Avatar className="size-7 border-2 border-white/10">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1542595913-85d69b0edbaf?w=96&h=96&dpr=2&q=80"
                  alt="Liam Thompson"
                />
                <AvatarFallback>LT</AvatarFallback>
              </Avatar>
              <Avatar className="size-7 border-2 border-white/10">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80"
                  alt="Nick Johnson"
                />
                <AvatarFallback>NJ</AvatarFallback>
              </Avatar>
              <Avatar className="size-7 border-2 border-white/10">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1620075225255-8c2051b6c015?w=96&h=96&dpr=2&q=80"
                  alt="Maria Garcia"
                />
                <AvatarFallback>MG</AvatarFallback>
              </Avatar>
              <Avatar className="size-7 border-2 border-white/10">
                <AvatarImage
                  src="https://github.com/leerob.png"
                  alt="@leerob"
                />
                <AvatarFallback>CH</AvatarFallback>
              </Avatar>
            </AvatarGroup>

            <p className="text-white/60 me-1.5 text-xs">
              Trusted by <span className="text-white font-semibold">100K+</span>{" "}
              players.
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-16 text-xs sm:text-sm text-white/50">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            30-second setup
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            Used by 500+ groups
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            Bank-grade security
          </span>
        </div>

        {/* Flow animation */}
        <EventFlowAnimation />

        {/* Feature pills */}
        <FeaturePills />
      </div>
    </section>
  );
}
