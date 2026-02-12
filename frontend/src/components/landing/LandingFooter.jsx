import { Link } from "react-router-dom";
import { Twitter, Instagram, Mail } from "lucide-react";
import Logo from "@/components/Logo";
import EmailCapture from "./EmailCapture";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/30 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-6 sm:pb-8">
        {/* Newsletter section */}
        <div className="max-w-xl mx-auto text-center mb-10 pb-10 border-b border-border/30">
          <h3 className="text-lg font-bold text-foreground mb-2">
            Stay in the loop
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get tips, updates, and exclusive offers. No spam, ever.
          </p>
          <EmailCapture
            source="footer"
            interests={["newsletter"]}
            variant="inline"
            placeholder="your@email.com"
            buttonText="Subscribe"
          />
          <p className="text-xs text-muted-foreground mt-3">
            Join <strong>500+</strong> poker enthusiasts getting our weekly digest
          </p>
        </div>

        {/* Main footer content */}
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo showTagline={false} />
            <p className="mt-3 text-sm text-muted-foreground">
              The modern way to track poker nights.
            </p>
            {/* Social links */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://twitter.com/kvittapp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/kvittapp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@kvitt.app"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() =>
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="hover:text-foreground transition-colors"
                >
                  How it Works
                </button>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1">
                  AI Assistant
                  <span className="text-[10px] bg-[#EF6E59]/10 text-[#EF6E59] px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-1">
                  Music Integration
                  <span className="text-[10px] bg-[#EF6E59]/10 text-[#EF6E59] px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                </span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/press" className="hover:text-foreground transition-colors">
                  Press
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Kvitt. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with ♥️ for poker players everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
