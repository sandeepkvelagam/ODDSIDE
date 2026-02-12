import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Logo from "@/components/Logo";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  HelpCircle,
  Shield,
  Building,
  Send,
  Loader2,
  Check,
  MapPin,
  Clock,
  Newspaper,
  Briefcase,
} from "lucide-react";

const contactMethods = [
  {
    icon: HelpCircle,
    title: "General Support",
    description: "Questions about using Kvitt? We're here to help.",
    email: "support@kvitt.app",
    responseTime: "Within 24 hours",
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Data requests, privacy concerns, or security issues.",
    email: "privacy@kvitt.app",
    responseTime: "Within 24 hours",
  },
  {
    icon: Building,
    title: "Business & Partnerships",
    description: "Interested in partnering or enterprise solutions?",
    email: "partnerships@kvitt.app",
    responseTime: "Within 48 hours",
  },
  {
    icon: Newspaper,
    title: "Press & Media",
    description: "Media inquiries, interviews, and press resources.",
    email: "press@kvitt.app",
    responseTime: "Within 24 hours",
  },
  {
    icon: Briefcase,
    title: "Careers",
    description: "Want to join the Kvitt team? We'd love to hear from you.",
    email: "careers@kvitt.app",
    responseTime: "Within 1 week",
  },
  {
    icon: MessageSquare,
    title: "Feedback",
    description: "Ideas, suggestions, or feature requests.",
    email: "feedback@kvitt.app",
    responseTime: "We read every message",
  },
];

const faqs = [
  {
    q: "How do I reset my password?",
    a: "Click 'Forgot password' on the login page and follow the instructions sent to your email.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes, you can delete your account from Profile > Settings > Delete Account, or contact support.",
  },
  {
    q: "How do settlements work?",
    a: "Kvitt calculates optimal payments to minimize transactions. You can settle via Stripe or mark as settled manually.",
  },
  {
    q: "Is Kvitt free?",
    a: "Yes! Core features are free forever. Premium features with advanced analytics are coming soon.",
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "support",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    // Simulate form submission (replace with actual API call)
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", category: "support", message: "" });
    }, 1500);
  };

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
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Contact Us</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            We&apos;d love to hear from you
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you have a question, feedback, or just want to say hi—our team is here to help.
          </p>
        </div>
      </section>

      {/* Contact Methods Grid */}
      <section className="py-16 border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-10">Get in Touch</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactMethods.map((method, i) => (
              <a
                key={i}
                href={`mailto:${method.email}`}
                className="group bg-card rounded-xl border border-border/30 p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <method.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{method.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary font-medium">{method.email}</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {method.responseTime}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold mb-2">Send us a message</h2>
              <p className="text-muted-foreground mb-6">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </p>

              {status === "success" ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                    Message sent!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setStatus("idle")}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Name</label>
                      <Input
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Email</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Category</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="support">General Support</option>
                      <option value="privacy">Privacy & Security</option>
                      <option value="business">Business & Partnerships</option>
                      <option value="press">Press & Media</option>
                      <option value="feedback">Feedback & Suggestions</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject</label>
                    <Input
                      placeholder="What's this about?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Message</label>
                    <Textarea
                      placeholder="Tell us more..."
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Info */}
            <div className="space-y-8">
              {/* Office */}
              <div className="bg-secondary/30 rounded-xl p-6 border border-border/30">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Our Office
                </h3>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">Kvitt, Inc.</p>
                  <p>548 Market Street, Suite 35000</p>
                  <p>San Francisco, CA 94104</p>
                  <p>United States</p>
                </div>
              </div>

              {/* Quick Answers */}
              <div>
                <h3 className="font-semibold mb-4">Quick Answers</h3>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <details key={i} className="group">
                      <summary className="flex items-center justify-between cursor-pointer text-sm font-medium py-2 border-b border-border/30 hover:text-primary transition-colors">
                        {faq.q}
                        <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <p className="text-sm text-muted-foreground py-2">{faq.a}</p>
                    </details>
                  ))}
                </div>
                <Link to="/#faq" className="inline-block mt-4 text-sm text-primary hover:underline">
                  View all FAQs →
                </Link>
              </div>

              {/* Response Time */}
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Response Times
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between">
                    <span>General Support</span>
                    <span className="font-medium text-foreground">Within 24 hours</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Security Issues</span>
                    <span className="font-medium text-foreground">Within 4 hours</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Business Inquiries</span>
                    <span className="font-medium text-foreground">Within 48 hours</span>
                  </li>
                </ul>
              </div>
            </div>
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
