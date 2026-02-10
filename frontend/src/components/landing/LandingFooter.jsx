import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/30 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-between">
          <Logo showTagline={false} />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a
              href="mailto:support@kvitt.app"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy;{new Date().getFullYear()} Kvitt. All rights reserved.
          </p>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex flex-col items-center gap-4">
          <Logo showTagline={false} />
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a
              href="mailto:support@kvitt.app"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy;{new Date().getFullYear()} Kvitt. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
