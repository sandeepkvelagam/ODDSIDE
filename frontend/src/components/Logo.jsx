import { cn } from "@/lib/utils";

export const Logo = ({ className, size = "default", showText = true, showTagline = false }) => {
  const sizes = {
    small: { icon: "w-6 h-6", gap: "gap-1", text: "text-lg", tagline: "text-[10px]" },
    default: { icon: "w-7 h-7", gap: "gap-1.5", text: "text-xl", tagline: "text-[11px]" },
    large: { icon: "w-10 h-10", gap: "gap-1.5", text: "text-2xl", tagline: "text-xs" }
  };

  const { icon, gap, text, tagline } = sizes[size] || sizes.default;

  return (
    <div className={cn("inline-flex items-center", gap, showTagline && "pb-4", className)}>
      {/* Kvitt Logo - Modern K mark */}
      <div className={cn("relative flex-shrink-0", icon)}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Rounded square background */}
          <rect
            x="2" y="2"
            width="36" height="36"
            rx="8"
            fill="#262626"
          />
          {/* K letter stylized */}
          <path
            d="M12 10V30M12 20L24 10M12 20L24 30"
            stroke="#EF6E59"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="relative text-left">
          <span className={cn("font-heading font-extrabold tracking-tight leading-none", text)}>
            Kvitt
          </span>
          {showTagline && (
            <span className={cn("absolute left-0 top-full mt-0.5 whitespace-nowrap text-muted-foreground leading-none", tagline)}>
              Your side, <span className="text-primary font-medium">settled.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
