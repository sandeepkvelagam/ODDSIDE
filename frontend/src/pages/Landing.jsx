import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";
import {
  Users, TrendingUp, Shield, Zap, Clock, Lock,
  ChevronRight, Star, Check, ArrowRight,
  BarChart3, CalendarCheck, BellRing, Sparkles
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Group Management",
    description: "Create groups, invite friends, and manage recurring game nights with ease."
  },
  {
    icon: TrendingUp,
    title: "Instant Settlement",
    description: "Smart debt minimization algorithm settles who owes whom in seconds."
  },
  {
    icon: Shield,
    title: "Immutable Ledger",
    description: "Locked records with audit trails. No disputes, no retroactive edits."
  },
  {
    icon: Zap,
    title: "30-Second Logging",
    description: "Log any session in under 30 seconds. Big buttons, minimal clicks."
  },
  {
    icon: Clock,
    title: "Live Game Mode",
    description: "Real-time timer, chip bank tracking, and instant buy-in/cash-out."
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Your data stays yours. No selling, no sharing, no surprises."
  }
];

const testimonials = [
  {
    name: "Mike T.",
    role: "Friday Night Host",
    quote: "Finally, no more spreadsheets and Venmo chaos. Everyone knows who owes what.",
    avatar: "M"
  },
  {
    name: "Sarah K.",
    role: "Weekly Player",
    quote: "The settlement feature alone saved our friend group from so many arguments.",
    avatar: "S"
  },
  {
    name: "James R.",
    role: "Tournament Organizer",
    quote: "We run 20+ player tournaments now. Kvitt handles it all flawlessly.",
    avatar: "J"
  }
];

const comparisons = [
  { feature: "Instant debt settlement", kvitt: true, others: false },
  { feature: "Immutable ledger with audit", kvitt: true, others: false },
  { feature: "30-second session logging", kvitt: true, others: false },
  { feature: "Live game mode with timer", kvitt: true, others: false },
  { feature: "Event-scoped messaging", kvitt: true, others: false },
  { feature: "No spreadsheet required", kvitt: true, others: false },
  { feature: "Free to use", kvitt: true, others: true }
];

const howItWorks = [
  { step: "1", title: "Create Group", description: "Invite your poker buddies" },
  { step: "2", title: "Start Game", description: "One tap to begin tracking" },
  { step: "3", title: "Log Results", description: "Buy-ins & cash-outs in seconds" },
  { step: "4", title: "Auto-Settle", description: "Smart debt minimization" }
];

const upcoming = [
  {
    icon: BarChart3,
    title: "Dashboard Charts",
    description: "Visual analytics for your poker performance.",
    status: "In Development"
  },
  {
    icon: CalendarCheck,
    title: "RSVP Calendar",
    description: "Schedule games and track RSVPs.",
    status: "Planned"
  },
  {
    icon: BellRing,
    title: "Push Notifications",
    description: "Get alerts for game invites and reminders.",
    status: "Planned"
  }
];

// Animation hook for scroll reveal
const useScrollAnimation = () => {
  const ref = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    
    const selectors = '.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale';
    const elements = ref.current?.querySelectorAll(selectors);
    elements?.forEach((el) => observer.observe(el));
    
    return () => observer.disconnect();
  }, []);
  
  return ref;
};

export default function Landing() {
  const containerRef = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Logo showTagline={false} />
            <Link to="/login">
              <Button 
                data-testid="get-started-btn"
                className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-4 sm:px-6 text-sm sm:text-base"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-20 left-[10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[15%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6 sm:mb-8 border border-primary/20">
              <Zap className="w-4 h-4" />
              The smarter way to track home games
            </div>
            
            <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-100 ease-out mb-6 sm:mb-8">
              <Logo size="large" showTagline={true} className="justify-center" />
            </div>
            
            <h1 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-200 ease-out text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-foreground">
              Your side, <span className="text-primary">settled.</span>
            </h1>
            <p className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-300 ease-out text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
              The modern way to track poker nights. 
              No spreadsheets. No arguments. Just play.
            </p>
            <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-400 ease-out flex flex-col items-center justify-center gap-4">
              <Link to="/login">
                <Button
                  data-testid="try-kvitt-btn"
                  size="lg"
                  className="bg-[#262626] text-white hover:bg-[#363636] h-12 sm:h-14 px-8 sm:px-10 rounded-full font-semibold tracking-wide transition-all hover:scale-105 text-sm sm:text-base animate-pulse-glow"
                >
                  Try Kvitt free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-20 border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="scroll-animate-scale text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              How It Works
            </h2>
            <p className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-100 ease-out text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              From group creation to settlement in just 4 simple steps.
            </p>
          </div>
          
          {/* 2x2 grid on mobile, 4 cols on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {howItWorks.map((item, idx) => (
              <div 
                key={idx} 
                className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out text-center relative"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-primary text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 text-lg sm:text-2xl font-bold shadow-soft">
                  {item.step}
                </div>
                <h3 className="font-bold text-sm sm:text-lg mb-1 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              Everything You Need
            </h2>
            <p className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-100 ease-out text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Built by poker players, for poker players.
            </p>
          </div>
          
          {/* 2 cols on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out bg-card border-border/30 card-hover group shadow-card"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-lg mb-1 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 sm:line-clamp-none">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kvitt Section */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              Why <span className="text-primary">Kvitt</span>?
            </h2>
          </div>
          
          <div className="max-w-3xl mx-auto scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-200 ease-out">
            <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-card">
              <div className="grid grid-cols-3 bg-secondary/50 p-3 sm:p-4">
                <div className="font-bold text-foreground text-xs sm:text-base">Feature</div>
                <div className="font-bold text-center text-primary text-xs sm:text-base">Kvitt</div>
                <div className="font-bold text-center text-muted-foreground text-xs sm:text-base">Others</div>
              </div>
              {comparisons.map((row, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-3 p-3 sm:p-4 items-center ${idx !== comparisons.length - 1 ? 'border-b border-border/20' : ''}`}
                >
                  <div className="text-xs sm:text-sm text-foreground">{row.feature}</div>
                  <div className="flex justify-center">
                    {row.kvitt ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      </div>
                    ) : (
                      <span className="text-destructive">-</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {row.others ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      </div>
                    ) : (
                      <span className="text-destructive">×</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              Trusted by Players
            </h2>
          </div>
          
          {/* Stack on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card
                key={idx}
                className="scroll-animate-scale transition-all duration-700 ease-out bg-card border-border/30 shadow-card"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic text-sm sm:text-base">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Section */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4 border border-primary/20">
              <Sparkles className="w-4 h-4" />
              Coming Soon
            </div>
            <h2 className="scroll-animate-scale text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              What's <span className="text-primary">Next</span>
            </h2>
          </div>

          {/* Stack on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {upcoming.map((item, idx) => (
              <Card
                key={idx}
                className="scroll-animate-scale transition-all duration-700 ease-out bg-card border-border/30 shadow-card relative"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    item.status === "In Development"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <CardContent className="p-4 sm:p-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base mb-1 text-foreground pr-16">{item.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-24 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out">
            <Logo size="large" showTagline={true} className="justify-center mb-6" />
          </div>
          <h2 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-100 ease-out text-xl sm:text-2xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Ready to up your game?
          </h2>
          <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-300 ease-out mt-8">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-[#262626] text-white hover:bg-[#363636] h-12 sm:h-14 px-8 sm:px-10 rounded-full font-semibold"
              >
                Start Tracking Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="col-span-2">
              <Logo showTagline={true} className="mb-4" />
              <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
                Track buy-ins, settle debts, and keep the peace at your poker nights.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-foreground text-sm">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><Link to="/privacy" className="text-muted-foreground hover:text-primary">Privacy</Link></li>
                <li><Link to="/terms" className="text-muted-foreground hover:text-primary">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-foreground text-sm">Support</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="mailto:support@kvitt.app" className="text-muted-foreground hover:text-primary">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kvitt</p>
            <p className="text-xs text-muted-foreground">Your side, <span className="text-primary">settled.</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
