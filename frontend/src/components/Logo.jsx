import { cn } from "@/lib/utils";

export const Logo = ({ className, size = "default", showText = true }) => {
  const sizes = {
    small: { icon: "w-7 h-7", text: "text-lg" },
    default: { icon: "w-8 h-8", text: "text-xl" },
    large: { icon: "w-12 h-12", text: "text-3xl" }
  };

  const { icon, text } = sizes[size] || sizes.default;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Kvitt Logo - Modern K mark */}
      <div className={cn("relative", icon)}>
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
        <span className={cn("font-heading font-extrabold tracking-tight", text)}>
          Kvitt
        </span>
      )}
    </div>
  );
};

export default Logo;
