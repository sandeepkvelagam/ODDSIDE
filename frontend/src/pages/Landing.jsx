import { Button } from "@/components/ui/button";
import { Play, Users, TrendingUp, Shield } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const handleLogin = () => {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1674645164141-00b6ef3047b2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwcGxheWluZyUyMHBva2VyJTIwaG9tZSUyMGdhbWUlMjBtb29keXxlbnwwfHx8fDE3NzAzMzA3ODJ8MA&ixlib=rb-4.1.0&q=85')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="font-heading text-2xl font-bold tracking-tight">POKERNIGHT</span>
          </div>
          <Button 
            data-testid="login-btn"
            onClick={handleLogin}
            variant="outline"
            className="border-white/20 hover:bg-white/10"
          >
            Sign In
          </Button>
        </header>

        {/* Hero */}
        <main className="pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-heading text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6">
              Your Home Game.<br />
              <span className="text-primary">Your Ledger.</span><br />
              Your Edge.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Track buy-ins, settle debts, and surface insights across your poker nights. 
              No more spreadsheets, no more arguments.
            </p>
            <Button 
              data-testid="get-started-btn"
              onClick={handleLogin}
              size="lg"
              className="bg-primary text-black hover:bg-primary/90 h-14 px-10 rounded-full font-bold tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all hover:scale-105 text-lg"
            >
              Get Started Free
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
            <div className="p-8 rounded-xl bg-card border border-border/50 card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">GROUP MANAGEMENT</h3>
              <p className="text-muted-foreground">
                Create groups, invite friends, and manage recurring game nights with ease.
              </p>
            </div>
            <div className="p-8 rounded-xl bg-card border border-border/50 card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">INSTANT SETTLEMENT</h3>
              <p className="text-muted-foreground">
                Smart debt minimization algorithm settles who owes whom in seconds.
              </p>
            </div>
            <div className="p-8 rounded-xl bg-card border border-border/50 card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">IMMUTABLE LEDGER</h3>
              <p className="text-muted-foreground">
                Locked records with audit trails. No disputes, no retroactive edits.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-border/30 text-center text-muted-foreground text-sm">
          <p>Built for poker nights, not casinos.</p>
        </footer>
      </div>
    </div>
  );
}
