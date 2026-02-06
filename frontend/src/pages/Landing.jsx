import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  Users, TrendingUp, Shield, Zap, Clock, Lock,
  ChevronRight, Star, Check, ArrowRight, Play
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/login">
                <Button 
                  data-testid="login-btn"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button 
                  data-testid="signup-btn"
                  className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-6"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8 border border-primary/20">
              <Zap className="w-4 h-4" />
              The smarter way to track home games
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 text-foreground">
              Your side, <span className="text-primary">settled.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The modern ledger for home poker games. 
              No spreadsheets. No arguments. Just poker.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button 
                  data-testid="get-started-btn"
                  size="lg"
                  className="bg-[#262626] text-white hover:bg-[#363636] h-14 px-10 rounded-full font-semibold tracking-wide transition-all hover:scale-105 text-base"
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
      <section className="py-20 border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From group creation to settlement in just 4 simple steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((item, idx) => (
              <div key={idx} className="text-center relative">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-soft">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
                {idx < howItWorks.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-6 -right-4 w-8 h-8 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built by poker players, for poker players. Every feature designed to eliminate friction.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className="bg-card border-border/30 card-hover group shadow-card"
              >
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kvitt Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              Why <span className="text-primary">Kvitt</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how we stack up against spreadsheets, group chats, and other tracking methods.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-card">
              {/* Header */}
              <div className="grid grid-cols-3 bg-secondary/50 p-4">
                <div className="font-bold text-foreground">Feature</div>
                <div className="font-bold text-center text-primary">Kvitt</div>
                <div className="font-bold text-center text-muted-foreground">Spreadsheets</div>
              </div>
              {/* Rows */}
              {comparisons.map((row, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-3 p-4 items-center ${idx !== comparisons.length - 1 ? 'border-b border-border/20' : ''}`}
                >
                  <div className="text-sm text-foreground">{row.feature}</div>
                  <div className="flex justify-center">
                    {row.kvitt ? (
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center">
                        <span className="text-destructive">-</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {row.others ? (
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-destructive/10 rounded-full flex items-center justify-center">
                        <span className="text-destructive text-lg">×</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">
              Trusted by Players
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of poker enthusiasts who've simplified their home games.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="bg-card border-border/30 shadow-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Logo size="large" className="justify-center mb-8" />
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Ready to up your game?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join the platform that takes the hassle out of home games.
          </p>
          <Link to="/signup">
            <Button 
              size="lg"
              className="bg-[#262626] text-white hover:bg-[#363636] h-14 px-10 rounded-full font-semibold tracking-wide transition-all hover:scale-105 text-base"
            >
              Start Tracking Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Logo className="mb-4" />
              <p className="text-muted-foreground text-sm max-w-sm">
                The modern ledger for home poker games. Track buy-ins, settle debts, 
                and keep the peace at your poker nights.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-bold mb-4 text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#privacy" className="text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-muted-foreground hover:text-primary transition-colors">
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a href="#cookies" className="text-muted-foreground hover:text-primary transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-foreground">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#help" className="text-muted-foreground hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="border-t border-border/30 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Kvitt. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built for poker nights, not casinos.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
