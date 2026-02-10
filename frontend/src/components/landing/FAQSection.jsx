import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is Kvitt free to use?",
    answer:
      "Yes! Kvitt is completely free for creating groups, tracking games, and settling debts. We may add premium features in the future, but the core experience will always be free.",
  },
  {
    question: "How does the smart settlement work?",
    answer:
      "Our algorithm analyzes all debts within a game and finds the minimum number of transfers needed to settle everyone up. For example, if A owes B $10 and B owes C $10, instead of two payments, A just pays C directly.",
  },
  {
    question: "Can I use Kvitt for games other than poker?",
    answer:
      "Absolutely! While designed with poker nights in mind, Kvitt works great for any home game where you need to track buy-ins and cash-outs: blackjack, board game nights with stakes, fantasy league settlements, and more.",
  },
  {
    question: "How many players can be in a game?",
    answer:
      "There is no hard limit. Kvitt has been tested with groups of 20+ players in a single game and handles it smoothly.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest. We never sell or share your data. Game records are stored with an immutable audit trail so nobody can tamper with the history.",
  },
  {
    question: "Will the AI assistant give financial advice?",
    answer:
      "No. The upcoming AI assistant provides entertainment-only suggestions for beginners learning poker. It is not financial advice. Users must acknowledge this before using the feature.",
  },
  {
    question: "Do all players need an account?",
    answer:
      "Each player needs to sign up with a free account to join a group and see their personal stats. The game host can manage buy-ins and cash-outs on behalf of others if needed.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="scroll-animate text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="scroll-animate text-muted-foreground" style={{ transitionDelay: '100ms' }}>
            Everything you need to know about Kvitt.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2 stagger-children">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="scroll-animate border border-border/30 rounded-xl px-4 data-[state=open]:bg-secondary/30 transition-colors"
            >
              <AccordionTrigger className="text-sm sm:text-base font-semibold hover:no-underline text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
