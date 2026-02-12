import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, FileText, Scale, AlertTriangle, Bot, CreditCard, Ban, Gavel } from "lucide-react";

export default function Terms() {
  const sections = [
    { id: "acceptance", title: "Acceptance of Terms" },
    { id: "eligibility", title: "Eligibility" },
    { id: "description", title: "Description of Service" },
    { id: "accounts", title: "User Accounts" },
    { id: "acceptable-use", title: "Acceptable Use" },
    { id: "ai-terms", title: "AI Features & Limitations" },
    { id: "game-data", title: "Game Data & Records" },
    { id: "payments", title: "Payments & Settlements" },
    { id: "ip", title: "Intellectual Property" },
    { id: "user-content", title: "User Content" },
    { id: "third-party", title: "Third-Party Services" },
    { id: "disclaimers", title: "Disclaimers" },
    { id: "liability", title: "Limitation of Liability" },
    { id: "indemnification", title: "Indemnification" },
    { id: "termination", title: "Termination" },
    { id: "disputes", title: "Dispute Resolution" },
    { id: "general", title: "General Provisions" },
    { id: "contact", title: "Contact Information" },
  ];

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[280px,1fr] gap-12">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">
                On This Page
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-muted-foreground hover:text-foreground py-1.5 transition-colors border-l-2 border-transparent hover:border-primary pl-3"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="max-w-3xl">
            {/* Hero */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
                  <p className="text-muted-foreground">
                    Effective Date: February 12, 2026 | Last Updated: February 12, 2026
                  </p>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 border border-border/30">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Please Read Carefully:</strong> These Terms of Service ("Terms")
                  constitute a legally binding agreement between you and Kvitt, Inc. By accessing or using our Services,
                  you agree to be bound by these Terms. If you do not agree, do not use our Services.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-10">

              {/* 1. Acceptance of Terms */}
              <section id="acceptance">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</span>
                  Acceptance of Terms
                </h2>
                <p className="text-muted-foreground">
                  By creating an account, accessing, or using Kvitt's website, mobile applications, and related services
                  (collectively, the "Services"), you acknowledge that you have read, understood, and agree to be bound by
                  these Terms of Service, our{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and any additional
                  terms and policies referenced herein.
                </p>
                <p className="text-muted-foreground">
                  We may modify these Terms at any time. If we make material changes, we will notify you through the
                  Services or by email. Your continued use of the Services after such notification constitutes acceptance
                  of the modified Terms.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 m-0">
                    <strong>Arbitration Notice:</strong> These Terms contain an arbitration clause and class action waiver
                    in Section 16. Please review carefully.
                  </p>
                </div>
              </section>

              {/* 2. Eligibility */}
              <section id="eligibility">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</span>
                  Eligibility
                </h2>
                <p className="text-muted-foreground">
                  To use our Services, you must:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Be at least 18 years of age (or the age of majority in your jurisdiction)</li>
                  <li>Have the legal capacity to enter into a binding agreement</li>
                  <li>Not be prohibited from using the Services under applicable laws</li>
                  <li>Not have been previously banned or removed from our Services</li>
                  <li>Comply with all applicable local, state, national, and international laws and regulations</li>
                </ul>
                <p className="text-muted-foreground">
                  By using our Services, you represent and warrant that you meet all eligibility requirements. If you are
                  using the Services on behalf of an organization, you represent that you have authority to bind that
                  organization to these Terms.
                </p>
              </section>

              {/* 3. Description of Service */}
              <section id="description">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">3</span>
                  Description of Service
                </h2>
                <p className="text-muted-foreground">
                  Kvitt is a digital ledger platform designed to help friends track buy-ins, cash-outs, and settlements
                  for private social poker games. Our Services include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Group Management:</strong> Create and manage poker groups with friends</li>
                  <li><strong>Game Tracking:</strong> Record buy-ins, cash-outs, and chip counts during games</li>
                  <li><strong>Settlement Calculation:</strong> Automated calculation of who owes whom</li>
                  <li><strong>Payment Facilitation:</strong> Integration with payment processors for settlements</li>
                  <li><strong>AI Features:</strong> Optional AI-powered poker analysis and suggestions</li>
                  <li><strong>Statistics:</strong> Game history and performance analytics</li>
                </ul>

                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-red-800 dark:text-red-200 font-semibold m-0 mb-2">
                        Important Disclaimer
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-200 m-0">
                        Kvitt is a record-keeping tool for private social games among friends. <strong>Kvitt does not
                        operate, facilitate, or endorse gambling activities.</strong> Users are solely responsible for
                        ensuring their activities comply with all applicable laws in their jurisdiction. Many jurisdictions
                        have laws regarding poker and social gaming—please consult local regulations.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. User Accounts */}
              <section id="accounts">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">4</span>
                  User Accounts
                </h2>

                <h3 className="text-lg font-semibold mt-6">4.1 Account Creation</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>You must provide accurate, current, and complete information during registration</li>
                  <li>You must maintain and promptly update your account information</li>
                  <li>Each person may only maintain one account</li>
                  <li>Account sharing is prohibited</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">4.2 Account Security</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>You are responsible for maintaining the confidentiality of your login credentials</li>
                  <li>You must immediately notify us of any unauthorized access or security breach</li>
                  <li>You are responsible for all activities that occur under your account</li>
                  <li>We recommend enabling multi-factor authentication when available</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">4.3 Account Termination</h3>
                <p className="text-muted-foreground">
                  You may delete your account at any time through your account settings or by contacting support. Upon
                  deletion, we will remove your personal information in accordance with our Privacy Policy, though some
                  data may be retained as required by law or for legitimate business purposes.
                </p>
              </section>

              {/* 5. Acceptable Use */}
              <section id="acceptable-use">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">5</span>
                  Acceptable Use Policy
                </h2>
                <p className="text-muted-foreground">
                  You agree to use our Services only for lawful purposes and in accordance with these Terms.
                </p>

                <h3 className="text-lg font-semibold mt-6 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-500" />
                  Prohibited Activities
                </h3>
                <p className="text-muted-foreground">You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Use the Services for commercial gambling operations</li>
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Engage in fraud, money laundering, or other illegal financial activities</li>
                  <li>Harass, abuse, threaten, or intimidate other users</li>
                  <li>Impersonate another person or entity</li>
                  <li>Submit false, misleading, or fraudulent information</li>
                  <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                  <li>Interfere with the proper functioning of the Services</li>
                  <li>Use automated systems, bots, or scripts to access the Services</li>
                  <li>Reverse engineer, decompile, or disassemble any aspect of the Services</li>
                  <li>Circumvent any security measures or access controls</li>
                  <li>Use the Services in a way that could damage, disable, or impair our servers</li>
                  <li>Collect or harvest user information without consent</li>
                  <li>Transmit viruses, malware, or other harmful code</li>
                </ul>
              </section>

              {/* 6. AI Features & Limitations */}
              <section id="ai-terms">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">6</span>
                  AI Features & Limitations
                </h2>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200 m-0">
                      Kvitt incorporates artificial intelligence features. By using AI features, you agree to these
                      additional terms.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6">6.1 AI-Powered Features</h3>
                <p className="text-muted-foreground">
                  Our AI features may include poker hand analysis, strategic suggestions, game insights, and smart
                  notifications. These features are provided for informational and entertainment purposes only.
                </p>

                <h3 className="text-lg font-semibold mt-6">6.2 AI Limitations & Disclaimers</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>No Guarantee of Accuracy:</strong> AI outputs may be incorrect, incomplete, or inappropriate.
                  You should independently verify any information before relying on it.</li>
                  <li><strong>Not Financial Advice:</strong> AI suggestions are not financial, legal, or professional
                  advice. Do not make financial decisions based solely on AI output.</li>
                  <li><strong>No Liability:</strong> We are not liable for any decisions you make based on AI features or
                  any losses resulting from AI use.</li>
                  <li><strong>Continuous Improvement:</strong> AI features may change, be updated, or be discontinued at
                  any time without notice.</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">6.3 Your Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Do not input sensitive personal information into AI features</li>
                  <li>Do not attempt to manipulate AI features for harmful purposes</li>
                  <li>Report any concerning AI outputs to our support team</li>
                  <li>Understand that AI features are tools to assist, not replace, human judgment</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">6.4 Third-Party AI Providers</h3>
                <p className="text-muted-foreground">
                  Some AI features may be powered by third-party providers (such as OpenAI, Anthropic, or others). By
                  using these features, you also agree to comply with their terms of service and acceptable use policies.
                </p>
              </section>

              {/* 7. Game Data & Records */}
              <section id="game-data">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">7</span>
                  Game Data & Records
                </h2>

                <h3 className="text-lg font-semibold mt-6">7.1 Data Integrity</h3>
                <p className="text-muted-foreground">
                  Once a game is settled, records become immutable to ensure integrity and provide a reliable audit trail.
                  This design prevents after-the-fact manipulation and supports fair play.
                </p>

                <h3 className="text-lg font-semibold mt-6">7.2 Host/Admin Responsibilities</h3>
                <p className="text-muted-foreground">
                  Game hosts and group administrators have elevated permissions and responsibilities:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Ensuring accurate recording of buy-ins and cash-outs</li>
                  <li>Managing group membership and access</li>
                  <li>Initiating and confirming settlements</li>
                  <li>Resolving disputes among group members</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">7.3 Data Accuracy</h3>
                <p className="text-muted-foreground">
                  Users are responsible for verifying the accuracy of game data before confirming transactions. While we
                  strive for accuracy in our calculations, users should review settlement amounts before completing
                  payments.
                </p>
              </section>

              {/* 8. Payments & Settlements */}
              <section id="payments">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">8</span>
                  Payments & Settlements
                </h2>
                <div className="flex items-start gap-3 mb-6">
                  <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-muted-foreground m-0">
                    Kvitt integrates with third-party payment processors to facilitate settlements between users.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mt-6">8.1 Payment Processing</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Payments are processed by Stripe, Inc. and are subject to{" "}
                    <a href="https://stripe.com/legal" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      Stripe's Terms of Service
                    </a>
                  </li>
                  <li>We do not store your full payment card information</li>
                  <li>Payment processing fees may apply and will be disclosed before transactions</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">8.2 Settlement Between Users</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Settlements are transactions between users, not with Kvitt</li>
                  <li>Kvitt facilitates the calculation and processing but is not a party to the transaction</li>
                  <li>Users are responsible for resolving disputes regarding settlements</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">8.3 Premium Services</h3>
                <p className="text-muted-foreground">
                  If you subscribe to premium features:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Subscriptions are billed in advance on a recurring basis</li>
                  <li>You may cancel at any time; access continues until the end of the billing period</li>
                  <li>Refunds are provided in accordance with applicable law</li>
                  <li>Prices may change with 30 days' notice</li>
                </ul>
              </section>

              {/* 9. Intellectual Property */}
              <section id="ip">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">9</span>
                  Intellectual Property
                </h2>

                <h3 className="text-lg font-semibold mt-6">9.1 Our Intellectual Property</h3>
                <p className="text-muted-foreground">
                  The Services, including all content, features, functionality, design, text, graphics, logos, icons,
                  images, audio, video, software, and code, are owned by Kvitt, Inc. or our licensors and are protected
                  by copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>

                <h3 className="text-lg font-semibold mt-6">9.2 Limited License</h3>
                <p className="text-muted-foreground">
                  We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the
                  Services for personal, non-commercial purposes in accordance with these Terms.
                </p>

                <h3 className="text-lg font-semibold mt-6">9.3 Restrictions</h3>
                <p className="text-muted-foreground">You may not:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Copy, modify, or distribute any part of the Services</li>
                  <li>Reverse engineer, decompile, or disassemble the Services</li>
                  <li>Remove any copyright, trademark, or other proprietary notices</li>
                  <li>Use our trademarks or branding without permission</li>
                  <li>Create derivative works based on the Services</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">9.4 Feedback</h3>
                <p className="text-muted-foreground">
                  If you provide feedback, suggestions, or ideas about the Services, you grant us the right to use such
                  feedback without compensation or attribution to you.
                </p>
              </section>

              {/* 10. User Content */}
              <section id="user-content">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">10</span>
                  User Content
                </h2>

                <h3 className="text-lg font-semibold mt-6">10.1 Your Content</h3>
                <p className="text-muted-foreground">
                  You retain ownership of content you create or upload ("User Content"), including group names, game
                  titles, messages, and profile information.
                </p>

                <h3 className="text-lg font-semibold mt-6">10.2 License to Kvitt</h3>
                <p className="text-muted-foreground">
                  By submitting User Content, you grant Kvitt a worldwide, non-exclusive, royalty-free license to use,
                  reproduce, modify, and display such content solely to provide and improve the Services.
                </p>

                <h3 className="text-lg font-semibold mt-6">10.3 Content Standards</h3>
                <p className="text-muted-foreground">User Content must not:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Violate any law or regulation</li>
                  <li>Infringe any intellectual property or privacy rights</li>
                  <li>Contain hate speech, harassment, or discriminatory content</li>
                  <li>Contain malware, spam, or deceptive content</li>
                  <li>Contain sexually explicit or violent material</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">10.4 Content Moderation</h3>
                <p className="text-muted-foreground">
                  We reserve the right to remove any User Content that violates these Terms or is otherwise objectionable,
                  at our sole discretion and without notice.
                </p>
              </section>

              {/* 11. Third-Party Services */}
              <section id="third-party">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">11</span>
                  Third-Party Services
                </h2>
                <p className="text-muted-foreground">
                  Our Services may integrate with or contain links to third-party services, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Authentication providers (Google, Apple)</li>
                  <li>Payment processors (Stripe)</li>
                  <li>Music services (Spotify, Apple Music)</li>
                  <li>AI providers</li>
                </ul>
                <p className="text-muted-foreground">
                  Your use of third-party services is governed by their respective terms and privacy policies. We are not
                  responsible for the content, accuracy, or practices of any third-party services.
                </p>
              </section>

              {/* 12. Disclaimers */}
              <section id="disclaimers">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">12</span>
                  Disclaimers
                </h2>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 font-mono text-sm">
                  <p className="text-muted-foreground m-0">
                    THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                    OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                    PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                  </p>
                  <p className="text-muted-foreground mt-4 mb-0">
                    WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS
                    WILL BE CORRECTED. WE DO NOT WARRANT THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY INFORMATION
                    PROVIDED THROUGH THE SERVICES, INCLUDING AI-GENERATED CONTENT.
                  </p>
                </div>
              </section>

              {/* 13. Limitation of Liability */}
              <section id="liability">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">13</span>
                  Limitation of Liability
                </h2>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 font-mono text-sm">
                  <p className="text-muted-foreground m-0">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, KVITT AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND
                    AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                    DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR
                    RELATED TO YOUR USE OF THE SERVICES.
                  </p>
                  <p className="text-muted-foreground mt-4 mb-0">
                    IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO KVITT IN THE
                    TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100).
                  </p>
                </div>
                <p className="text-muted-foreground mt-4">
                  Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so the
                  above limitations may not apply to you.
                </p>
              </section>

              {/* 14. Indemnification */}
              <section id="indemnification">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">14</span>
                  Indemnification
                </h2>
                <p className="text-muted-foreground">
                  You agree to indemnify, defend, and hold harmless Kvitt and its officers, directors, employees, agents,
                  and affiliates from and against any and all claims, damages, losses, costs, and expenses (including
                  reasonable attorneys' fees) arising out of or related to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Your use of the Services</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any rights of another person or entity</li>
                  <li>Your User Content</li>
                  <li>Any dispute between you and other users</li>
                </ul>
              </section>

              {/* 15. Termination */}
              <section id="termination">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">15</span>
                  Termination
                </h2>

                <h3 className="text-lg font-semibold mt-6">15.1 Termination by You</h3>
                <p className="text-muted-foreground">
                  You may terminate your account at any time by deleting your account through the Services or contacting
                  support.
                </p>

                <h3 className="text-lg font-semibold mt-6">15.2 Termination by Us</h3>
                <p className="text-muted-foreground">
                  We may suspend or terminate your access to the Services at any time, with or without cause, with or
                  without notice, including if we reasonably believe you have violated these Terms.
                </p>

                <h3 className="text-lg font-semibold mt-6">15.3 Effect of Termination</h3>
                <p className="text-muted-foreground">
                  Upon termination, your right to use the Services will immediately cease. The following provisions will
                  survive termination: Sections 6, 9, 10, 12-17.
                </p>
              </section>

              {/* 16. Dispute Resolution */}
              <section id="disputes">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">16</span>
                  Dispute Resolution
                </h2>
                <div className="flex items-start gap-3 mb-6">
                  <Gavel className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-muted-foreground m-0">
                    Please read this section carefully—it affects your legal rights.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mt-6">16.1 Informal Resolution</h3>
                <p className="text-muted-foreground">
                  Before filing any claim, you agree to contact us at legal@kvitt.app and attempt to resolve the dispute
                  informally for at least 30 days.
                </p>

                <h3 className="text-lg font-semibold mt-6">16.2 Binding Arbitration</h3>
                <p className="text-muted-foreground">
                  If informal resolution fails, any dispute arising out of or relating to these Terms shall be resolved by
                  binding arbitration administered by JAMS under its Streamlined Arbitration Rules. The arbitration shall
                  take place in San Francisco, California, unless you and Kvitt agree otherwise.
                </p>

                <h3 className="text-lg font-semibold mt-6">16.3 Class Action Waiver</h3>
                <p className="text-muted-foreground">
                  YOU AGREE THAT ANY DISPUTE RESOLUTION WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS,
                  CONSOLIDATED, OR REPRESENTATIVE ACTION. You waive any right to participate in a class action lawsuit or
                  class-wide arbitration.
                </p>

                <h3 className="text-lg font-semibold mt-6">16.4 Exceptions</h3>
                <p className="text-muted-foreground">
                  Either party may seek injunctive relief in court for intellectual property infringement or unauthorized
                  access to the Services.
                </p>

                <h3 className="text-lg font-semibold mt-6">16.5 Opt-Out</h3>
                <p className="text-muted-foreground">
                  You may opt out of the arbitration and class action waiver by sending written notice to legal@kvitt.app
                  within 30 days of first using the Services.
                </p>
              </section>

              {/* 17. General Provisions */}
              <section id="general">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">17</span>
                  General Provisions
                </h2>

                <h3 className="text-lg font-semibold mt-6">17.1 Governing Law</h3>
                <p className="text-muted-foreground">
                  These Terms shall be governed by the laws of the State of California, without regard to conflict of law
                  principles.
                </p>

                <h3 className="text-lg font-semibold mt-6">17.2 Entire Agreement</h3>
                <p className="text-muted-foreground">
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and Kvitt
                  regarding the Services.
                </p>

                <h3 className="text-lg font-semibold mt-6">17.3 Severability</h3>
                <p className="text-muted-foreground">
                  If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in
                  full force and effect.
                </p>

                <h3 className="text-lg font-semibold mt-6">17.4 Waiver</h3>
                <p className="text-muted-foreground">
                  Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.
                </p>

                <h3 className="text-lg font-semibold mt-6">17.5 Assignment</h3>
                <p className="text-muted-foreground">
                  You may not assign these Terms without our prior written consent. We may assign these Terms at any time
                  without notice.
                </p>

                <h3 className="text-lg font-semibold mt-6">17.6 Force Majeure</h3>
                <p className="text-muted-foreground">
                  We are not liable for any failure or delay due to circumstances beyond our reasonable control.
                </p>
              </section>

              {/* 18. Contact Information */}
              <section id="contact">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">18</span>
                  Contact Information
                </h2>
                <p className="text-muted-foreground mb-6">
                  If you have questions about these Terms, please contact us:
                </p>

                <div className="bg-secondary/50 rounded-lg p-4 border border-border/30">
                  <p className="text-sm text-muted-foreground m-0">
                    <strong>Kvitt, Inc.</strong><br />
                    548 Market Street, Suite 35000<br />
                    San Francisco, CA 94104<br />
                    United States<br /><br />
                    Email: <a href="mailto:legal@kvitt.app" className="text-primary hover:underline">legal@kvitt.app</a><br />
                    Support: <a href="mailto:support@kvitt.app" className="text-primary hover:underline">support@kvitt.app</a>
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
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
