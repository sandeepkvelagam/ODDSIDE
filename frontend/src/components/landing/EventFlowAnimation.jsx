import { useState, useEffect, Fragment } from "react";
import { Users, Play, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { icon: Users, title: "Create Group", description: "Invite friends" },
  { icon: Play, title: "Start Game", description: "One tap to begin" },
  { icon: Clock, title: "Log Results", description: "Buy-ins & cash-outs" },
  { icon: Zap, title: "Auto-Settle", description: "Smart minimization" },
];

export default function EventFlowAnimation() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, index) => (
        <Fragment key={index}>
          <div className="flex flex-col items-center transition-all duration-500">
            <div
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-500",
                index === activeStep
                  ? "bg-[#EF6E59] shadow-lg shadow-[#EF6E59]/30 scale-110"
                  : "bg-white/10"
              )}
            >
              <step.icon
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-500",
                  index === activeStep ? "text-white" : "text-white/40"
                )}
              />
            </div>
            <p
              className={cn(
                "text-[10px] sm:text-xs font-medium text-center max-w-[80px] transition-colors duration-500",
                index === activeStep ? "text-white" : "text-white/40"
              )}
            >
              {step.title}
            </p>
            <p
              className={cn(
                "text-[9px] sm:text-[10px] text-center max-w-[80px] transition-colors duration-500",
                index === activeStep ? "text-gray-400" : "text-white/20"
              )}
            >
              {step.description}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-6 sm:w-10 h-[2px] mx-0.5 transition-all duration-500 mb-6",
                index < activeStep ? "bg-[#EF6E59]" : "bg-white/15"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
