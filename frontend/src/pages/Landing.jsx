import { useEffect, useRef } from "react";
import StickyHeader from "@/components/landing/StickyHeader";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import GroupDemo from "@/components/landing/GroupDemo";
import LiveGameDemo from "@/components/landing/LiveGameDemo";
import SettlementDemo from "@/components/landing/SettlementDemo";
import AIAssistantDemo from "@/components/landing/AIAssistantDemo";
import ComingSoonSection from "@/components/landing/ComingSoonSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

const useScrollAnimation = () => {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const selectors =
      ".scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale";
    const elements = ref.current?.querySelectorAll(selectors);
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
};

export default function Landing() {
  const containerRef = useScrollAnimation();

  return (
    <div className="min-h-screen" ref={containerRef}>
      <StickyHeader />
      <HeroSection />
      <HowItWorksSection />
      <GroupDemo />
      <LiveGameDemo />
      <SettlementDemo />
      <AIAssistantDemo />
      <ComingSoonSection />
      <ComparisonSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
