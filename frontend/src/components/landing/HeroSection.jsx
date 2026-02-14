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
import TypewriterChat from "./TypewriterChat";
import EventFlowAnimation from "./EventFlowAnimation";
import CompactFeatureCards from "./CompactFeatureCards";
import EmailCapture from "./EmailCapture";

export default function HeroSection() {
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  return (
    <section className="bg-dark-hero relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      {/* Glowing orbs - hidden on mobile for performance */}
      <div
        className="glow-orb hidden md:block w-[300px] h-[300px] bg-[#EF6E59]/12 top-[10%] left-[5%] animate-glow-pulse"
        aria-hidden="true"
      />
      <div
        className="glow-orb hidden md:block w-[200px] h-[200px] bg-[#EF6E59]/8 bottom-[20%] right-[5%] animate-glow-pulse"
        style={{ animationDelay: "2s" }}
        aria-hidden="true"
      />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* LEFT COLUMN: Text content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Urgency banner */}
            <div className="mb-4 flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EF6E59]/20 to-amber-500/20 border border-[#EF6E59]/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm text-white/90 font-medium">
                  <strong className="text-[#EF6E59]">127+</strong> players joined
                  this week
                </span>
              </div>
            </div>

            {/* Logo */}
            <div className="mb-4 flex justify-center lg:justify-start">
              <Logo size="large" showTagline={false} dark />
            </div>

            {/* Main headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4">
              Your side, <span className="text-[#EF6E59]">settled.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 mb-6 leading-relaxed">
              The modern way to track poker nights. No spreadsheets. No
              arguments. Just play.
            </p>

            {/* TypewriterChat - AI-style input card */}
            <div className="mb-6 max-w-md mx-auto lg:mx-0">
              <TypewriterChat />
            </div>

            {/* CTA Buttons or Email Capture */}
            {!showEmailCapture ? (
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-4">
                <Link to="/login">
                  <Button className="bg-[#EF6E59] hover:bg-[#e85d47] text-white h-12 px-8 rounded-full font-semibold text-base transition-all hover:scale-105 shadow-lg">
                    Try Kvitt free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="h-12 px-6 rounded-full font-medium text-white/70 border border-white/20 hover:bg-white/10 transition-all text-base inline-flex items-center gap-2"
                >
                  Get early access
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mb-4 max-w-md mx-auto lg:mx-0">
                <EmailCapture
                  source="hero"
                  interests={["newsletter"]}
                  variant="dark"
                  placeholder="your@email.com"
                  buttonText="Get Early Access"
                  showStats={true}
                  showBadge={true}
                  badgeText="Early supporters get exclusive perks"
                />
                <button
                  onClick={() => setShowEmailCapture(false)}
                  className="mt-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  Back to sign up
                </button>
              </div>
            )}

            {/* Trusted by players */}
            <div className="flex justify-center lg:justify-start">
              <div className="border-white/20 rounded-full flex items-center gap-2 border p-1.5 shadow-sm shadow-black/5 bg-white/5 backdrop-blur-sm">
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
                <p className="text-white/60 me-2 text-xs">
                  Trusted by{" "}
                  <span className="text-white font-semibold">100K+</span> players.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Animation + Feature Cards */}
          <div className="flex-1 w-full max-w-md lg:max-w-lg">
            {/* EventFlowAnimation */}
            <div className="mb-6">
              <EventFlowAnimation />
            </div>

            {/* Compact Feature Cards */}
            <CompactFeatureCards />
          </div>
        </div>
      </div>

      {/* Trust badges at bottom */}
      <div className="absolute bottom-4 left-0 right-0 z-10">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-white/40">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            30-second setup
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            500+ groups
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Bank-grade security
          </span>
        </div>
      </div>
    </section>
  );
}
