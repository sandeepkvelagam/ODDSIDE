import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Bot, Mail } from "lucide-react";

export default function Privacy() {
  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "information-collected", title: "Information We Collect" },
    { id: "how-we-use", title: "How We Use Information" },
    { id: "ai-features", title: "AI-Powered Features" },
    { id: "data-sharing", title: "Data Sharing & Disclosure" },
    { id: "data-retention", title: "Data Retention" },
    { id: "data-security", title: "Data Security" },
    { id: "international", title: "International Data Transfers" },
    { id: "your-rights", title: "Your Privacy Rights" },
    { id: "ccpa", title: "California Privacy Rights (CCPA)" },
    { id: "gdpr", title: "European Privacy Rights (GDPR)" },
    { id: "cookies", title: "Cookies & Tracking" },
    { id: "children", title: "Children's Privacy" },
    { id: "changes", title: "Changes to This Policy" },
    { id: "contact", title: "Contact Us" },
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
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
                  <p className="text-muted-foreground">
                    Effective Date: February 12, 2026 | Last Updated: February 12, 2026
                  </p>
                </div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 border border-border/30">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Our Commitment:</strong> At Kvitt, we believe your privacy is fundamental.
                  This policy explains how we collect, use, protect, and share your information when you use our platform.
                  We are committed to transparency and giving you control over your personal data.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-10">

              {/* 1. Introduction */}
              <section id="introduction">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</span>
                  Introduction
                </h2>
                <p className="text-muted-foreground">
                  Kvitt, Inc. ("Kvitt," "we," "us," or "our") operates the Kvitt platform, including our website at kvitt.app,
                  mobile applications, and related services (collectively, the "Services"). This Privacy Policy describes how we
                  collect, use, disclose, and protect information that applies to our Services, and your choices about the
                  collection and use of your information.
                </p>
                <p className="text-muted-foreground">
                  By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by
                  this Privacy Policy. If you do not agree with this policy, please do not access or use our Services.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 m-0">
                    <strong>Important:</strong> Kvitt is designed for recreational game tracking among friends. We do not
                    operate or facilitate gambling services. Users are responsible for compliance with local laws regarding
                    private social games.
                  </p>
                </div>
              </section>

              {/* 2. Information We Collect */}
              <section id="information-collected">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</span>
                  Information We Collect
                </h2>

                <h3 className="text-lg font-semibold mt-6 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  2.1 Information You Provide Directly
                </h3>
                <ul className="list-none space-y-3 text-muted-foreground pl-0">
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Account Information:</strong> When you create an account, we collect your email address, name, and
                    profile picture (if provided). If you use social login (Google, Apple), we receive basic profile information
                    from those services.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Game Data:</strong> Buy-in amounts, cash-out amounts, chip counts, game results, settlement
                    calculations, and game history associated with your account.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Group Information:</strong> Group names, membership data, roles (admin/member), and invitation
                    records.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Communications:</strong> Messages sent through game threads, support inquiries, and feedback you
                    provide.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Payment Information:</strong> When processing payments through our payment processor (Stripe), we
                    receive transaction confirmations but do not store your full payment card details.</span>
                  </li>
                </ul>

                <h3 className="text-lg font-semibold mt-6 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  2.2 Information Collected Automatically
                </h3>
                <ul className="list-none space-y-3 text-muted-foreground pl-0">
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Device Information:</strong> Device type, operating system, unique device identifiers, browser
                    type, and mobile network information.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Log Data:</strong> IP address, access times, pages viewed, app features used, referring URL, and
                    other system activity.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Usage Analytics:</strong> Feature usage patterns, session duration, interaction data, and
                    performance metrics to improve our Services.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Location Information:</strong> General location data derived from IP address (country/region level
                    only). We do not collect precise GPS location.</span>
                  </li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">2.3 Information from Third Parties</h3>
                <ul className="list-none space-y-3 text-muted-foreground pl-0">
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Authentication Providers:</strong> If you sign in via Google or Apple, we receive your name, email,
                    and profile picture as authorized by you.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Payment Processors:</strong> Stripe provides us with transaction status and limited payment
                    information necessary to process settlements.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span><strong>Music Services:</strong> If you connect Spotify or Apple Music, we receive playback control
                    permissions and playlist information as authorized.</span>
                  </li>
                </ul>
              </section>

              {/* 3. How We Use Your Information */}
              <section id="how-we-use">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">3</span>
                  How We Use Your Information
                </h2>
                <p className="text-muted-foreground">
                  We use the information we collect for the following purposes:
                </p>

                <h3 className="text-lg font-semibold mt-6">3.1 Providing and Improving Services</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Create and manage your account</li>
                  <li>Track game sessions, calculate settlements, and maintain game history</li>
                  <li>Process payments and facilitate financial settlements between players</li>
                  <li>Send notifications about game activity, invitations, and settlements</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Analyze usage patterns to improve features and user experience</li>
                  <li>Develop new products, services, and features</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">3.2 Safety and Security</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Detect, prevent, and address fraud, abuse, and security issues</li>
                  <li>Verify user identity and prevent unauthorized access</li>
                  <li>Enforce our Terms of Service and other policies</li>
                  <li>Protect the rights, property, and safety of our users and the public</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">3.3 Communications</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Send transactional emails (account verification, password resets, game notifications)</li>
                  <li>Send marketing communications (with your consent, where required)</li>
                  <li>Respond to your comments, questions, and requests</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">3.4 Legal Compliance</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Comply with applicable laws, regulations, and legal processes</li>
                  <li>Respond to lawful requests from public authorities</li>
                  <li>Establish, exercise, or defend legal claims</li>
                </ul>
              </section>

              {/* 4. AI-Powered Features */}
              <section id="ai-features">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">4</span>
                  AI-Powered Features
                </h2>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200 m-0">
                      Kvitt incorporates artificial intelligence features to enhance your experience. This section explains how
                      AI is used and how your data interacts with these systems.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mt-6">4.1 AI Features We Offer</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>AI Poker Assistant:</strong> Analyzes card combinations and provides strategic suggestions</li>
                  <li><strong>Smart Notifications:</strong> AI-optimized timing and relevance of notifications</li>
                  <li><strong>Settlement Optimization:</strong> Algorithmic calculation of optimal payment paths</li>
                  <li><strong>Game Insights:</strong> Pattern analysis and performance statistics</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">4.2 Data Used by AI</h3>
                <p className="text-muted-foreground">
                  Our AI features may process:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Card information you voluntarily input for hand analysis</li>
                  <li>Game statistics and historical performance data</li>
                  <li>Aggregated, anonymized usage patterns to improve AI models</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">4.3 AI Data Handling Principles</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>No Training on Personal Data:</strong> We do not use your personal game data to train AI models
                  without explicit consent</li>
                  <li><strong>Transparency:</strong> AI-generated suggestions are clearly labeled as such</li>
                  <li><strong>Human Oversight:</strong> Critical decisions (settlements, payments) require human confirmation</li>
                  <li><strong>Opt-Out:</strong> You can disable AI features in your account settings</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">4.4 Third-Party AI Services</h3>
                <p className="text-muted-foreground">
                  We may use third-party AI services (such as OpenAI or Anthropic) to power certain features. When we do:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Data is transmitted securely using industry-standard encryption</li>
                  <li>We have data processing agreements in place with these providers</li>
                  <li>These providers are contractually prohibited from using your data to train their models</li>
                  <li>Queries are processed in real-time and not stored by third parties beyond temporary processing</li>
                </ul>
              </section>

              {/* 5. Data Sharing & Disclosure */}
              <section id="data-sharing">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">5</span>
                  Data Sharing & Disclosure
                </h2>
                <p className="text-muted-foreground">
                  <strong>We do not sell your personal information.</strong> We may share information in the following
                  circumstances:
                </p>

                <h3 className="text-lg font-semibold mt-6">5.1 With Other Users</h3>
                <p className="text-muted-foreground">
                  Within your groups, other members can see your name, profile picture, game participation, buy-ins, cash-outs,
                  and settlement obligations. This sharing is necessary for the core functionality of the service.
                </p>

                <h3 className="text-lg font-semibold mt-6">5.2 Service Providers</h3>
                <p className="text-muted-foreground">
                  We work with trusted third-party companies that perform services on our behalf:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Supabase:</strong> Authentication and database services</li>
                  <li><strong>MongoDB:</strong> Data storage and processing</li>
                  <li><strong>Stripe:</strong> Payment processing</li>
                  <li><strong>Resend:</strong> Email delivery</li>
                  <li><strong>Vercel/Cloud Providers:</strong> Hosting and infrastructure</li>
                  <li><strong>Analytics Providers:</strong> Usage analytics and error tracking</li>
                </ul>
                <p className="text-muted-foreground">
                  These providers are bound by contractual obligations to keep personal information confidential and use it only
                  for the purposes for which we disclose it to them.
                </p>

                <h3 className="text-lg font-semibold mt-6">5.3 Legal Requirements</h3>
                <p className="text-muted-foreground">
                  We may disclose information if required to do so by law or in response to valid legal process, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Court orders, subpoenas, or other legal requests</li>
                  <li>Requests from law enforcement or government agencies</li>
                  <li>To protect the rights, property, or safety of Kvitt, our users, or others</li>
                  <li>To detect, prevent, or address fraud, security, or technical issues</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">5.4 Business Transfers</h3>
                <p className="text-muted-foreground">
                  If Kvitt is involved in a merger, acquisition, or sale of assets, your information may be transferred as part
                  of that transaction. We will provide notice before your information becomes subject to a different privacy
                  policy.
                </p>

                <h3 className="text-lg font-semibold mt-6">5.5 With Your Consent</h3>
                <p className="text-muted-foreground">
                  We may share information with third parties when you give us explicit consent to do so.
                </p>
              </section>

              {/* 6. Data Retention */}
              <section id="data-retention">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">6</span>
                  Data Retention
                </h2>
                <p className="text-muted-foreground">
                  We retain your information for as long as necessary to fulfill the purposes outlined in this policy:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Account Data:</strong> Retained while your account is active and for up to 30 days after deletion
                  request to allow for account recovery</li>
                  <li><strong>Game History:</strong> Retained for 7 years after game completion to support financial record-keeping
                  and dispute resolution</li>
                  <li><strong>Transaction Records:</strong> Retained for 7 years as required by financial regulations</li>
                  <li><strong>Log Data:</strong> Retained for 90 days for security and troubleshooting purposes</li>
                  <li><strong>Marketing Preferences:</strong> Retained until you update your preferences or delete your account</li>
                </ul>
                <p className="text-muted-foreground">
                  After the applicable retention period, we securely delete or anonymize your information. Some information may
                  be retained in anonymized form for analytics purposes.
                </p>
              </section>

              {/* 7. Data Security */}
              <section id="data-security">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">7</span>
                  Data Security
                </h2>
                <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                  <Lock className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <p className="text-sm text-green-800 dark:text-green-200 m-0">
                    We implement industry-standard security measures to protect your data from unauthorized access, alteration,
                    disclosure, or destruction.
                  </p>
                </div>

                <h3 className="text-lg font-semibold mt-6">Security Measures Include:</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                  <li><strong>Authentication:</strong> Secure authentication via Supabase with support for multi-factor
                  authentication</li>
                  <li><strong>Access Controls:</strong> Role-based access controls and principle of least privilege</li>
                  <li><strong>Infrastructure:</strong> Hosted on SOC 2 Type II certified cloud infrastructure</li>
                  <li><strong>Monitoring:</strong> 24/7 security monitoring and automated threat detection</li>
                  <li><strong>Audits:</strong> Regular security assessments and penetration testing</li>
                  <li><strong>Incident Response:</strong> Documented incident response procedures</li>
                </ul>
                <p className="text-muted-foreground">
                  While we strive to protect your information, no method of transmission over the Internet or electronic storage
                  is 100% secure. We cannot guarantee absolute security.
                </p>
              </section>

              {/* 8. International Data Transfers */}
              <section id="international">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">8</span>
                  International Data Transfers
                </h2>
                <div className="flex items-start gap-3 mb-6">
                  <Globe className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-muted-foreground m-0">
                    Kvitt is headquartered in the United States. Your information may be transferred to, stored, and processed in
                    the United States or other countries where our service providers operate.
                  </p>
                </div>
                <p className="text-muted-foreground">
                  When we transfer data internationally, we implement appropriate safeguards:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Standard Contractual Clauses:</strong> EU-approved contractual terms for data transfers</li>
                  <li><strong>Data Processing Agreements:</strong> Binding agreements with all service providers</li>
                  <li><strong>Adequacy Decisions:</strong> We consider EU adequacy decisions when selecting service providers</li>
                  <li><strong>Privacy Shield Successor:</strong> We monitor and comply with evolving transatlantic data transfer
                  frameworks</li>
                </ul>
              </section>

              {/* 9. Your Privacy Rights */}
              <section id="your-rights">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">9</span>
                  Your Privacy Rights
                </h2>
                <p className="text-muted-foreground">
                  Depending on your location, you may have the following rights regarding your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                  <li><strong>Restriction:</strong> Request that we limit how we use your data</li>
                  <li><strong>Objection:</strong> Object to processing of your data for certain purposes</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
                </ul>
                <p className="text-muted-foreground">
                  To exercise these rights, please contact us at{" "}
                  <a href="mailto:privacy@kvitt.app" className="text-primary hover:underline">
                    privacy@kvitt.app
                  </a>
                  . We will respond to your request within 30 days.
                </p>
              </section>

              {/* 10. California Privacy Rights (CCPA) */}
              <section id="ccpa">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">10</span>
                  California Privacy Rights (CCPA/CPRA)
                </h2>
                <p className="text-muted-foreground">
                  If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA)
                  and California Privacy Rights Act (CPRA):
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Right to Know:</strong> You can request information about the categories and specific pieces of
                  personal information we have collected</li>
                  <li><strong>Right to Delete:</strong> You can request deletion of your personal information</li>
                  <li><strong>Right to Correct:</strong> You can request correction of inaccurate personal information</li>
                  <li><strong>Right to Opt-Out of Sale:</strong> We do not sell personal information, so this right does not
                  apply</li>
                  <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your
                  privacy rights</li>
                  <li><strong>Right to Limit Use of Sensitive Information:</strong> You can limit how we use sensitive personal
                  information</li>
                </ul>
                <p className="text-muted-foreground">
                  To exercise these rights, contact us at{" "}
                  <a href="mailto:privacy@kvitt.app" className="text-primary hover:underline">
                    privacy@kvitt.app
                  </a>
                  {" "}or call us at 1-800-KVITT-APP. You may designate an authorized agent to make a request on your behalf.
                </p>
              </section>

              {/* 11. European Privacy Rights (GDPR) */}
              <section id="gdpr">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">11</span>
                  European Privacy Rights (GDPR)
                </h2>
                <p className="text-muted-foreground">
                  If you are in the European Economic Area (EEA), United Kingdom, or Switzerland, you have rights under the
                  General Data Protection Regulation (GDPR):
                </p>

                <h3 className="text-lg font-semibold mt-6">Legal Bases for Processing</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Contract:</strong> Processing necessary to perform our contract with you (providing the Services)</li>
                  <li><strong>Legitimate Interests:</strong> Processing for our legitimate business interests (security, fraud
                  prevention, service improvement)</li>
                  <li><strong>Consent:</strong> Processing based on your consent (marketing communications)</li>
                  <li><strong>Legal Obligation:</strong> Processing required to comply with legal obligations</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">Your GDPR Rights</h3>
                <p className="text-muted-foreground">
                  In addition to the rights listed above, you have the right to lodge a complaint with your local data protection
                  authority if you believe we have violated your privacy rights.
                </p>

                <h3 className="text-lg font-semibold mt-6">Data Protection Officer</h3>
                <p className="text-muted-foreground">
                  For GDPR-related inquiries, contact our Data Protection Officer at{" "}
                  <a href="mailto:dpo@kvitt.app" className="text-primary hover:underline">
                    dpo@kvitt.app
                  </a>
                </p>
              </section>

              {/* 12. Cookies & Tracking */}
              <section id="cookies">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">12</span>
                  Cookies & Tracking Technologies
                </h2>
                <p className="text-muted-foreground">
                  We use cookies and similar technologies to provide, secure, and improve our Services:
                </p>

                <h3 className="text-lg font-semibold mt-6">Types of Cookies We Use</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Essential Cookies:</strong> Required for basic functionality (authentication, security, session
                  management)</li>
                  <li><strong>Functional Cookies:</strong> Remember your preferences (theme, language)</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Services</li>
                  <li><strong>Performance Cookies:</strong> Monitor and improve site performance</li>
                </ul>

                <h3 className="text-lg font-semibold mt-6">Managing Cookies</h3>
                <p className="text-muted-foreground">
                  You can control cookies through your browser settings. Note that disabling certain cookies may affect the
                  functionality of our Services. We honor "Do Not Track" browser signals.
                </p>

                <h3 className="text-lg font-semibold mt-6">Third-Party Tracking</h3>
                <p className="text-muted-foreground">
                  We do not allow third-party advertising networks to track you on our platform. We may use analytics services
                  (such as Google Analytics) with IP anonymization enabled.
                </p>
              </section>

              {/* 13. Children's Privacy */}
              <section id="children">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">13</span>
                  Children's Privacy
                </h2>
                <p className="text-muted-foreground">
                  Our Services are not directed to children under 18 years of age. We do not knowingly collect personal
                  information from children under 18. If we learn that we have collected personal information from a child under
                  18, we will take steps to delete such information promptly.
                </p>
                <p className="text-muted-foreground">
                  If you believe we have inadvertently collected information from a child, please contact us immediately at{" "}
                  <a href="mailto:privacy@kvitt.app" className="text-primary hover:underline">
                    privacy@kvitt.app
                  </a>
                </p>
              </section>

              {/* 14. Changes to This Policy */}
              <section id="changes">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">14</span>
                  Changes to This Policy
                </h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
                  requirements, or other factors. When we make material changes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>We will update the "Last Updated" date at the top of this policy</li>
                  <li>We will notify you via email or in-app notification for significant changes</li>
                  <li>We may ask for your consent if required by applicable law</li>
                </ul>
                <p className="text-muted-foreground">
                  We encourage you to review this policy periodically. Your continued use of our Services after any changes
                  constitutes acceptance of the updated policy.
                </p>
              </section>

              {/* 15. Contact Us */}
              <section id="contact">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">15</span>
                  Contact Us
                </h2>
                <p className="text-muted-foreground mb-6">
                  If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please
                  contact us:
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4 border border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">General Privacy Inquiries</h4>
                    </div>
                    <a href="mailto:privacy@kvitt.app" className="text-primary hover:underline text-sm">
                      privacy@kvitt.app
                    </a>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-4 border border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Data Protection Officer</h4>
                    </div>
                    <a href="mailto:dpo@kvitt.app" className="text-primary hover:underline text-sm">
                      dpo@kvitt.app
                    </a>
                  </div>
                </div>

                <div className="mt-6 bg-secondary/50 rounded-lg p-4 border border-border/30">
                  <h4 className="font-semibold text-sm mb-2">Mailing Address</h4>
                  <p className="text-sm text-muted-foreground m-0">
                    Kvitt, Inc.<br />
                    Attn: Privacy Team<br />
                    548 Market Street, Suite 35000<br />
                    San Francisco, CA 94104<br />
                    United States
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
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
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
