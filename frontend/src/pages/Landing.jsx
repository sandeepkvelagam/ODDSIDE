import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  Users, TrendingUp, Shield, Zap, Clock, Lock,
  ChevronRight, Star, Check, ArrowRight
} from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const handleLogin = () => {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

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
    quote: "We run 20+ player tournaments now. ODDSIDE handles it all flawlessly.",
    avatar: "J"
  }
];

const comparisons = [
  { feature: "Instant debt settlement", oddside: true, others: false },
  { feature: "Immutable ledger with audit", oddside: true, others: false },
  { feature: "30-second session logging", oddside: true, others: false },
  { feature: "Live game mode with timer", oddside: true, others: false },
  { feature: "Event-scoped messaging", oddside: true, others: false },
  { feature: "No spreadsheet required", oddside: true, others: false },
  { feature: "Free to use", oddside: true, others: true }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button 
                data-testid="login-btn"
                onClick={handleLogin}
                variant="outline"
                className="border-border hover:bg-secondary"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background - adapts to theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent dark:from-primary/5 dark:via-background dark:to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              The smarter way to track home games
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6">
              Track. Settle.
              <span className="text-primary block">Dominate.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The behavioral ledger for serious home game players. 
              No spreadsheets. No arguments. Just poker.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                data-testid="get-started-btn"
                onClick={handleLogin}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 rounded-full font-bold tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all hover:scale-105 text-lg"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built by poker players, for poker players. Every feature designed to eliminate friction.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className="bg-card border-border/50 card-hover group"
              >
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why ODDSIDE Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              WHY ODDSIDE?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how we stack up against spreadsheets, group chats, and other tracking methods.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-secondary/50 p-4">
                <div className="font-heading font-bold">Feature</div>
                <div className="font-heading font-bold text-center text-primary">ODDSIDE</div>
                <div className="font-heading font-bold text-center text-muted-foreground">Spreadsheets</div>
              </div>
              {/* Rows */}
              {comparisons.map((row, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-3 p-4 items-center ${idx !== comparisons.length - 1 ? 'border-b border-border/30' : ''}`}
                >
                  <div className="text-sm">{row.feature}</div>
                  <div className="flex justify-center">
                    {row.oddside ? (
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
                      <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center">
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
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              TRUSTED BY PLAYERS
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of poker enthusiasts who've simplified their home games.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="bg-card border-border/50">
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
                      <p className="font-medium">{testimonial.name}</p>
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
          <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to up your game?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join the platform that takes the hassle out of home games.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 rounded-full font-bold tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all hover:scale-105 text-lg"
          >
            Start Tracking Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Logo className="mb-4" />
              <p className="text-muted-foreground text-sm max-w-sm">
                The behavioral ledger for home poker games. Track buy-ins, settle debts, 
                and gain insights across your poker nights.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-heading font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a href="#cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-heading font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#help" className="text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ODDSIDE. All rights reserved.
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
