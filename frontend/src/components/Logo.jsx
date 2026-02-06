import { cn } from "@/lib/utils";

export const Logo = ({ className, size = "default", showText = true, showTagline = false }) => {
  const sizes = {
    small: { icon: "w-7 h-7", iconMargin: "mt-0.5", text: "text-lg", tagline: "text-xs" },
    default: { icon: "w-8 h-8", iconMargin: "mt-0.5", text: "text-xl", tagline: "text-sm" },
    large: { icon: "w-12 h-12", iconMargin: "mt-1", text: "text-3xl", tagline: "text-base" }
  };

  const { icon, iconMargin, text, tagline } = sizes[size] || sizes.default;

  return (
    <div className={cn("flex items-start gap-2", className)}>
      {/* Kvitt Logo - Modern K mark */}
      <div className={cn("relative", icon, iconMargin)}>
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
        <div className="flex flex-col">
          <span className={cn("font-heading font-extrabold tracking-tight leading-none", text)}>
            Kvitt
          </span>
          {showTagline && (
            <span className={cn("text-muted-foreground leading-tight", tagline)}>
              Your side, <span className="text-primary font-medium">settled.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
