import { cn } from "@/lib/utils";

export const Logo = ({ className, size = "default", showText = true }) => {
  const sizes = {
    small: { icon: "w-8 h-8", text: "text-xl" },
    default: { icon: "w-10 h-10", text: "text-2xl" },
    large: { icon: "w-14 h-14", text: "text-4xl" }
  };

  const { icon, text } = sizes[size] || sizes.default;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Sharp geometric logo - two overlapping diamonds with orange */}
      <div className={cn("relative", icon)}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Background diamond */}
          <path 
            d="M20 2L38 20L20 38L2 20L20 2Z" 
            fill="#FF7043"
          />
          {/* Inner cut - creating depth */}
          <path 
            d="M20 8L32 20L20 32L8 20L20 8Z" 
            className="fill-background"
          />
          {/* Center accent */}
          <path 
            d="M20 14L26 20L20 26L14 20L20 14Z" 
            fill="#FF7043"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-heading font-bold tracking-tight", text)}>
          ODDSIDE
        </span>
      )}
    </div>
  );
};

export default Logo;
