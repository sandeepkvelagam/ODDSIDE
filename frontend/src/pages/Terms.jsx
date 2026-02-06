import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Terms of Use</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Kvitt, you agree to be bound by these Terms of Use. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Kvitt is a digital ledger application designed to help track buy-ins, cash-outs, 
              and settlements for home poker games. It is intended for recreational use only 
              and does not facilitate real-money gambling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be at least 18 years old to use Kvitt</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use Kvitt for illegal gambling activities</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for any fraudulent purpose</li>
              <li>Interfere with the proper functioning of the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">5. Game Data and Records</h2>
            <p className="text-muted-foreground">
              Once a game is settled, records become immutable to ensure integrity. 
              The host/admin has control over game management decisions. 
              Settlement calculations are performed automatically but users are responsible 
              for verifying accuracy before confirming.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Kvitt is provided "as is" without warranties of any kind. We are not responsible 
              for any financial disputes between users. Our settlement calculations are suggestions 
              and users are responsible for their own financial transactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of Kvitt are owned by us and protected 
              by intellectual property laws. You may not copy, modify, or distribute our 
              content without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">8. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violations of these terms. 
              You may delete your account at any time by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Continued use of Kvitt after 
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">10. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Use, please contact us at{" "}
              <a href="mailto:support@kvitt.app" className="text-primary hover:underline">
                support@kvitt.app
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Kvitt. Your side, <span className="text-primary">settled.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
