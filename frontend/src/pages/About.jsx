import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Target,
  Heart,
  Zap,
  Shield,
  Globe,
  Award,
  Lightbulb,
  Rocket,
} from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Players First",
    description:
      "Every feature we build starts with one question: does this make game night better? We obsess over the player experience.",
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    description:
      "Your data is yours. We're transparent about how we use it, and we never sell your information. Period.",
  },
  {
    icon: Zap,
    title: "Simplicity",
    description:
      "Poker nights should be about fun, not fumbling with apps. We relentlessly simplify so you can focus on the game.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "From AI-powered insights to instant settlements, we're always exploring new ways to enhance your game.",
  },
];

const milestones = [
  {
    year: "2024",
    title: "The Idea",
    description:
      "Born from a frustrating poker night where no one could remember who owed what. There had to be a better way.",
  },
  {
    year: "2025",
    title: "Launch",
    description:
      "Kvitt launches with core tracking, settlements, and group management. Early adopters fall in love with the simplicity.",
  },
  {
    year: "2025",
    title: "Growth",
    description:
      "500+ groups created. Real-time features, Stripe integration, and mobile apps join the platform.",
  },
  {
    year: "2026",
    title: "AI Era",
    description:
      "AI Poker Assistant launches in beta. Music integration and advanced analytics on the roadmap.",
  },
];

const stats = [
  { value: "500+", label: "Poker Groups" },
  { value: "$2.1M+", label: "Settled Between Friends" },
  { value: "10K+", label: "Games Tracked" },
  { value: "98%", label: "Satisfaction Rate" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <Logo />
            </Link>
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">About Kvitt</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Making poker nights
            <br />
            <span className="text-primary">actually fun again</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe the best moments happen around a poker table with friends. Our mission is to
            remove the friction so you can focus on what matters: the game, the laughs, and the memories.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  It started with a messy poker night. Five friends, a whiteboard full of scribbled IOUs, and an
                  argument about whether Mike actually bought in twice or just once.
                </p>
                <p>
                  We&apos;ve all been there. The awkward "so who owes who?" conversation at the end of the night.
                  The spreadsheets that nobody updates. The Venmo requests that get lost in the shuffle.
                </p>
                <p>
                  We built Kvitt because we wanted poker nights to end with high-fives, not headaches. A simple,
                  beautiful app that tracks everything in real-time, calculates settlements instantly, and lets
                  everyone settle up with a tap.
                </p>
                <p className="font-medium text-foreground">
                  Today, Kvitt is used by thousands of poker groups around the world. And we&apos;re just getting
                  started.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🃏</div>
                  <p className="text-xl font-bold text-primary">Your side, settled.</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do—from the features we build to how we treat our community.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <div
                key={i}
                className="bg-background rounded-2xl border border-border/30 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our Journey</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From a frustrated poker night to a platform used by thousands.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-12">
              {milestones.map((milestone, i) => (
                <div
                  key={i}
                  className={`relative flex items-start gap-6 md:gap-12 ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1/2 mt-1.5" />

                  {/* Content */}
                  <div className={`flex-1 pl-10 md:pl-0 ${i % 2 === 0 ? "md:text-right md:pr-12" : "md:pl-12"}`}>
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-2">
                      {milestone.year}
                    </span>
                    <h3 className="text-xl font-bold mb-2">{milestone.title}</h3>
                    <p className="text-muted-foreground">{milestone.description}</p>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-2xl border border-border/30 p-6 text-center">
                  <Rocket className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">AI-Powered</h4>
                  <p className="text-xs text-muted-foreground">Smart insights for better play</p>
                </div>
                <div className="bg-background rounded-2xl border border-border/30 p-6 text-center">
                  <Globe className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">Global</h4>
                  <p className="text-xs text-muted-foreground">Players in 50+ countries</p>
                </div>
                <div className="bg-background rounded-2xl border border-border/30 p-6 text-center">
                  <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">Trusted</h4>
                  <p className="text-xs text-muted-foreground">Millions settled securely</p>
                </div>
                <div className="bg-background rounded-2xl border border-border/30 p-6 text-center">
                  <Target className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">Focused</h4>
                  <p className="text-xs text-muted-foreground">Built for poker players</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Where We&apos;re Going</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We&apos;re building the future of social gaming—and poker is just the beginning.
                </p>
                <p>
                  Our vision is a world where tracking, settling, and enhancing your game nights is effortless.
                  Where AI helps you play better, not replace the human connection. Where every game ends with
                  clarity and everyone leaves happy.
                </p>
                <p>
                  Music integration, advanced analytics, tournament modes, and features we haven&apos;t even
                  dreamed of yet. We&apos;re building this with our community, one game night at a time.
                </p>
              </div>

              <Link to="/login" className="inline-block mt-6">
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                  Join the Journey
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-foreground text-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to transform your game nights?</h2>
          <p className="text-background/70 mb-8 max-w-xl mx-auto">
            Join thousands of poker players who&apos;ve already made the switch. Setup takes 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90 text-white h-12 px-8 rounded-full font-semibold">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-background/30 text-background hover:bg-background/10 h-12 px-8 rounded-full">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
              <Link to="/press" className="hover:text-foreground transition-colors">
                Press
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Kvitt, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
