import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

export default function StickyHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Desktop header */}
      <header
        className={cn(
          "hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/90 backdrop-blur-lg border-b border-border/30 shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo showTagline={false} />
            <div className="flex items-center gap-6">
              <a
                href="#how-it-works"
                className={cn(
                  "text-sm font-medium transition-colors",
                  scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"
                )}
              >
                How it Works
              </a>
              <a
                href="#features"
                className={cn(
                  "text-sm font-medium transition-colors",
                  scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"
                )}
              >
                Features
              </a>
              <a
                href="#faq"
                className={cn(
                  "text-sm font-medium transition-colors",
                  scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"
                )}
              >
                FAQ
              </a>
              <Link to="/login">
                <Button className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-6 text-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-transparent"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div
            className={cn(
              "flex items-center transition-all duration-500",
              scrolled ? "h-14 justify-center" : "h-14 justify-between"
            )}
          >
            {/* Normal header when not scrolled */}
            {!scrolled && (
              <>
                <Logo showTagline={false} size="small" />
                <Link to="/login">
                  <Button
                    size="sm"
                    className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-4 text-xs"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}

            {/* Floating pill when scrolled */}
            {scrolled && (
              <Link
                to="/login"
                className="bg-[#262626] text-white rounded-full px-5 py-2.5 shadow-lg flex items-center gap-2 border border-white/10"
              >
                <Logo showText={false} size="small" />
                <span className="text-sm font-bold">Kvitt</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
