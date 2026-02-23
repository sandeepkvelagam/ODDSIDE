import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StarRating - Interactive star rating component.
 *
 * Props:
 * - rating: number (0-5)
 * - onRatingChange: (rating: number) => void
 * - size: "sm" | "md" | "lg"
 * - readonly: boolean
 * - showLabel: boolean
 */

const LABELS = ["", "Terrible", "Bad", "Okay", "Good", "Amazing"];

const SIZES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function StarRating({
  rating = 0,
  onRatingChange,
  size = "md",
  readonly = false,
  showLabel = false,
  className,
}) {
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onRatingChange?.(star)}
            className={cn(
              "transition-transform duration-100",
              !readonly && "hover:scale-110 active:scale-95 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClass,
                star <= rating
                  ? "fill-[#EF6E59] text-[#EF6E59]"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && rating > 0 && (
        <span className="text-sm font-medium text-primary">
          {LABELS[rating]}
        </span>
      )}
    </div>
  );
}
