import { Check, X } from "lucide-react";

const comparisons = [
  { feature: "Instant debt settlement", kvitt: true, others: false },
  { feature: "Immutable ledger with audit", kvitt: true, others: false },
  { feature: "30-second session logging", kvitt: true, others: false },
  { feature: "Live game mode with timer", kvitt: true, others: false },
  { feature: "Group chat planning", kvitt: true, others: false },
  { feature: "Stripe payments", kvitt: true, others: false },
  { feature: "AI suggestions (soon)", kvitt: true, others: false },
  { feature: "Free to use", kvitt: true, others: true },
];

export default function ComparisonSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 ease-out text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Why <span className="text-[#EF6E59]">Kvitt</span>?
          </h2>
        </div>

        <div className="scroll-animate opacity-0 translate-y-4 transition-all duration-700 delay-200 ease-out">
          <div className="bg-white border border-border/30 rounded-2xl overflow-hidden shadow-card">
            <div className="grid grid-cols-3 p-3 sm:p-4 bg-secondary/50">
              <div className="font-bold text-foreground text-xs sm:text-sm">
                Feature
              </div>
              <div className="font-bold text-center text-[#EF6E59] text-xs sm:text-sm">
                Kvitt
              </div>
              <div className="font-bold text-center text-muted-foreground text-xs sm:text-sm">
                Others
              </div>
            </div>
            {comparisons.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 p-3 sm:p-4 items-center ${
                  i !== comparisons.length - 1
                    ? "border-b border-border/20"
                    : ""
                }`}
              >
                <div className="text-xs sm:text-sm text-foreground">
                  {row.feature}
                </div>
                <div className="flex justify-center">
                  {row.kvitt ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                    </div>
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex justify-center">
                  {row.others ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                    </div>
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
