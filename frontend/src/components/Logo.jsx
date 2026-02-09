import { cn } from "@/lib/utils";

export const Logo = ({ className, size = "default", showText = true, showTagline = false }) => {
  const sizes = {
    small: { icon: "w-7 h-7", gap: "gap-1.5", text: "text-lg", tagline: "text-[10px]" },
    default: { icon: "w-8 h-8", gap: "gap-1.5", text: "text-xl", tagline: "text-xs" },
    large: { icon: "w-12 h-12", gap: "gap-2", text: "text-3xl", tagline: "text-sm" }
  };

  const { icon, gap, text, tagline } = sizes[size] || sizes.default;

  return (
    <div className={cn("inline-flex items-center", gap, className)}>
      {/* Kvitt Logo - Modern K mark */}
      <div className={cn("relative flex-shrink-0 self-center", icon)}>
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
        <div className="flex flex-col gap-0">
          <span className={cn("font-heading font-extrabold tracking-tight leading-none", text)}>
            Kvitt
          </span>
          {showTagline && (
            <span className={cn("text-muted-foreground leading-none mt-0.5", tagline)}>
              Your side, <span className="text-primary font-medium">settled.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
