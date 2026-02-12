import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import {
  ArrowLeft,
  Download,
  Mail,
  ExternalLink,
  FileText,
  Image,
  Calendar,
  Quote,
  TrendingUp,
  Users,
  DollarSign,
  Smartphone,
} from "lucide-react";

const pressReleases = [
  {
    date: "February 12, 2026",
    title: "Kvitt Launches AI-Powered Poker Assistant",
    excerpt:
      "New feature brings intelligent hand analysis and strategy suggestions to home poker players.",
    link: "#",
  },
  {
    date: "January 15, 2026",
    title: "Kvitt Surpasses 500 Active Poker Groups",
    excerpt:
      "Milestone marks rapid growth as platform becomes go-to solution for poker night organization.",
    link: "#",
  },
  {
    date: "November 8, 2025",
    title: "Kvitt Introduces Instant Settlements with Stripe",
    excerpt:
      "Players can now settle debts instantly with integrated payment processing.",
    link: "#",
  },
  {
    date: "August 22, 2025",
    title: "Kvitt Launches to Public",
    excerpt:
      "After successful beta testing, Kvitt officially launches its poker tracking platform.",
    link: "#",
  },
];

const mediaFeatures = [
  {
    outlet: "TechCrunch",
    quote: "Kvitt is doing for poker nights what Splitwise did for dinner bills.",
    logo: "TC",
  },
  {
    outlet: "Product Hunt",
    quote: "A beautifully designed app that solves a real problem for poker players everywhere.",
    logo: "PH",
  },
  {
    outlet: "Poker News Daily",
    quote: "Finally, an app that understands what home poker players actually need.",
    logo: "PN",
  },
];

const stats = [
  { icon: Users, value: "10,000+", label: "Active Users" },
  { icon: TrendingUp, value: "500+", label: "Poker Groups" },
  { icon: DollarSign, value: "$2.1M+", label: "Settled" },
  { icon: Smartphone, value: "50+", label: "Countries" },
];

const brandAssets = [
  {
    title: "Logo Pack",
    description: "Primary logos in various formats (SVG, PNG, PDF)",
    icon: Image,
    filename: "kvitt-logo-pack.zip",
  },
  {
    title: "Brand Guidelines",
    description: "Colors, typography, and usage guidelines",
    icon: FileText,
    filename: "kvitt-brand-guidelines.pdf",
  },
  {
    title: "Product Screenshots",
    description: "High-resolution app screenshots and mockups",
    icon: Image,
    filename: "kvitt-screenshots.zip",
  },
  {
    title: "Founder Photos",
    description: "Professional headshots for media use",
    icon: Image,
    filename: "kvitt-team-photos.zip",
  },
];

export default function Press() {
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
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Press & Media</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Kvitt in the News
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Resources for journalists, bloggers, and anyone interested in covering Kvitt.
            For press inquiries, contact us at{" "}
            <a href="mailto:press@kvitt.app" className="text-primary hover:underline">
              press@kvitt.app
            </a>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="mailto:press@kvitt.app">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Mail className="w-4 h-4" />
                Contact Press Team
              </Button>
            </a>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Press Kit
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-border/30 bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">About Kvitt</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Kvitt</strong> is a modern platform designed
                  to simplify the organization and settlement of home poker games. Founded in 2024,
                  Kvitt eliminates the friction of tracking buy-ins, calculating settlements, and
                  managing payments between friends.
                </p>
                <p>
                  The platform features real-time game tracking, automatic settlement calculations,
                  integrated payments via Stripe, and AI-powered poker analysis tools. Kvitt is used
                  by thousands of poker groups across 50+ countries.
                </p>
                <p>
                  Headquartered in San Francisco, California, Kvitt is backed by leading investors
                  and is on a mission to make poker nights fun again by removing the administrative
                  burden that often accompanies friendly games.
                </p>
              </div>

              <div className="mt-8 p-4 bg-secondary/50 rounded-xl border border-border/30">
                <h4 className="font-semibold mb-2">Key Facts</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Founded:</strong> 2024</li>
                  <li><strong>Headquarters:</strong> San Francisco, CA</li>
                  <li><strong>Founders:</strong> [Founder Names]</li>
                  <li><strong>Category:</strong> Social Gaming, FinTech</li>
                  <li><strong>Website:</strong> kvitt.app</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">Brand Assets</h2>
              <p className="text-muted-foreground mb-6">
                Download official Kvitt brand assets for use in your coverage. Please follow our
                brand guidelines when using these materials.
              </p>

              <div className="space-y-3">
                {brandAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/30 hover:border-primary/30 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <asset.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{asset.title}</h4>
                      <p className="text-xs text-muted-foreground">{asset.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 gap-1">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <h4 className="font-semibold text-sm mb-2">Brand Colors</h4>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EF6E59]" />
                    <span className="text-xs font-mono">#EF6E59</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#262626]" />
                    <span className="text-xs font-mono">#262626</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F3EF] border" />
                    <span className="text-xs font-mono">#F5F3EF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Coverage */}
      <section className="py-16 sm:py-20 bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Featured Coverage</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              What the media is saying about Kvitt
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {mediaFeatures.map((feature, i) => (
              <div
                key={i}
                className="bg-background rounded-xl border border-border/30 p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">{feature.logo}</span>
                </div>
                <Quote className="w-5 h-5 text-primary/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground italic mb-4">"{feature.quote}"</p>
                <p className="font-semibold text-sm">{feature.outlet}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">Press Releases</h2>

          <div className="space-y-4">
            {pressReleases.map((release, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-card rounded-xl border border-border/30 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Calendar className="w-4 h-4" />
                  {release.date}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {release.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{release.excerpt}</p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1 self-start sm:self-center">
                  Read More
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="py-16 sm:py-20 bg-foreground text-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Media Inquiries</h2>
          <p className="text-background/70 mb-8 max-w-xl mx-auto">
            For press inquiries, interview requests, or additional information, please contact our
            communications team.
          </p>

          <div className="bg-background/10 rounded-xl p-6 mb-8 inline-block">
            <p className="text-sm text-background/70 mb-2">Press Contact</p>
            <a
              href="mailto:press@kvitt.app"
              className="text-xl font-semibold text-primary hover:underline"
            >
              press@kvitt.app
            </a>
            <p className="text-sm text-background/50 mt-2">Response within 24 hours</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:press@kvitt.app">
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                <Mail className="w-4 h-4" />
                Email Press Team
              </Button>
            </a>
            <Link to="/contact">
              <Button
                variant="outline"
                className="border-background/30 text-background hover:bg-background/10 gap-2"
              >
                General Contact
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
              <Link to="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact
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
