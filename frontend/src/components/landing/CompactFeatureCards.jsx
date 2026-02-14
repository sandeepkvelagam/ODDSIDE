import { Users, Play, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Users,
    title: "Group Play",
    desc: "Invite your poker crew",
  },
  {
    icon: Play,
    title: "Live Tracking",
    desc: "Real-time game updates",
  },
  {
    icon: Zap,
    title: "Auto-Settle",
    desc: "Smart debt minimization",
  },
  {
    icon: Brain,
    title: "AI Assistant",
    desc: "Your poker companion",
    badge: "Soon",
  },
];

export default function CompactFeatureCards({ className }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {features.map((feature, i) => (
        <div
          key={i}
          className={cn(
            "bg-white/10 rounded-2xl p-4 border border-white/20 transition-all hover:bg-white/15 hover:border-white/30",
            "shadow-lg md:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.1),inset_-2px_-2px_4px_rgba(0,0,0,0.2),4px_4px_12px_rgba(0,0,0,0.3)]",
            feature.badge && "relative overflow-hidden"
          )}
        >
          {feature.badge && (
            <span className="absolute top-2 right-2 text-[9px] bg-[#EF6E59] text-white px-2 py-0.5 rounded-full font-semibold shadow-sm">
              {feature.badge}
            </span>
          )}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#EF6E59]/20 flex items-center justify-center shadow-inner">
              <feature.icon className="w-4 h-4 text-[#EF6E59]" />
            </div>
            <span className="text-sm font-semibold text-white">
              {feature.title}
            </span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            {feature.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
