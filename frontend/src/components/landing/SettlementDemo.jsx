import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const beforeDebts = [
  { from: "Mike", to: "Sarah", amount: 15 },
  { from: "Mike", to: "James", amount: 10 },
  { from: "Sarah", to: "Alex", amount: 20 },
  { from: "James", to: "You", amount: 25 },
  { from: "Alex", to: "Mike", amount: 5 },
  { from: "You", to: "Sarah", amount: 10 },
  { from: "Alex", to: "James", amount: 8 },
];

const afterDebts = [
  { from: "Mike", to: "James", amount: 10 },
  { from: "Sarah", to: "You", amount: 15 },
  { from: "Alex", to: "James", amount: 7 },
];

export default function SettlementDemo() {
  const [phase, setPhase] = useState("before");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const clearTimeouts = () => timeoutsRef.current.forEach(clearTimeout);

    const runDemo = () => {
      clearTimeouts();
      timeoutsRef.current = [];
      setPhase("before");

      const calcPhase = setTimeout(() => setPhase("calculating"), 3000);
      timeoutsRef.current.push(calcPhase);

      const afterPhase = setTimeout(() => setPhase("after"), 4500);
      timeoutsRef.current.push(afterPhase);

      const reset = setTimeout(runDemo, 10000);
      timeoutsRef.current.push(reset);
    };

    runDemo();
    return clearTimeouts;
  }, [isVisible]);

  const currentDebts = phase === "after" ? afterDebts : beforeDebts;

  return (
    <section ref={sectionRef} className="demo-section py-20 sm:py-28 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text */}
          <div className="order-2 md:order-1">
            <div className="scroll-animate-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Smart Settlement
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                7 payments become 3
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Our debt minimization algorithm finds the fewest possible
                transfers to settle everyone up. Then pay instantly via Stripe —
                safe, secure, done.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#EF6E59]" />
                  One-click Stripe payments
                </li>
                <li className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#EF6E59]" />
                  Secure, audited transactions
                </li>
              </ul>
              <Link to="/login">
                <Button className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-6">
                  Try Settlement
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo card */}
          <div className="order-1 md:order-2 scroll-animate-scale">
            <div className="bg-white rounded-2xl border border-gray-100/50 overflow-hidden shadow-lg md:shadow-[8px_8px_20px_rgba(0,0,0,0.06),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-1px_-1px_3px_rgba(0,0,0,0.03)]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  {phase === "before"
                    ? "Before Kvitt"
                    : phase === "calculating"
                      ? "Optimizing..."
                      : "After Kvitt"}
                </h3>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-0.5 rounded-full",
                    phase === "after"
                      ? "bg-green-100 text-green-700"
                      : "bg-[#EF6E59]/10 text-[#EF6E59]"
                  )}
                >
                  {phase === "before"
                    ? `${beforeDebts.length} payments`
                    : phase === "after"
                      ? `${afterDebts.length} payments`
                      : "..."}
                </span>
              </div>

              {/* Debts list */}
              <div className="p-4 h-[340px] overflow-hidden">
                {phase === "calculating" ? (
                  <div className="flex flex-col items-center justify-center h-[250px] gap-3">
                    <div className="w-10 h-10 border-[3px] border-[#EF6E59] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Kvitt is optimizing...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentDebts.map((debt, i) => (
                      <div
                        key={`${phase}-${i}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 animate-fade-in-up"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-16 font-medium text-foreground truncate">
                            {debt.from}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#EF6E59] flex-shrink-0" />
                          <span className="w-16 font-medium text-foreground truncate">
                            {debt.to}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sm text-foreground">
                          ${debt.amount}
                        </span>
                      </div>
                    ))}

                    {phase === "after" && (
                      <div className="mt-4 pt-3 border-t border-border/20">
                        <button className="w-full py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#5851db] transition-colors">
                          <CreditCard className="w-3.5 h-3.5" />
                          Pay with Stripe
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
