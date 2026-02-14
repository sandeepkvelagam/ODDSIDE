import { useState, useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const aiPhrases = [
  "analyze my poker night stats",
  "settle debts for our Friday game",
  "track buy-ins across 8 players",
  "show who's up this month",
  "start a new $25 buy-in game",
  "calculate optimal settlements",
];

export default function TypewriterChat({ className }) {
  const [displayText, setDisplayText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const typingSpeed = 50;
  const deletingSpeed = 30;
  const pauseDuration = 2000;

  useEffect(() => {
    const currentPhrase = aiPhrases[currentPhraseIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayText.length < currentPhrase.length) {
            setDisplayText(currentPhrase.slice(0, displayText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentPhraseIndex((prev) => (prev + 1) % aiPhrases.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhraseIndex]);

  return (
    <Link to="/login">
      <div
        className={cn(
          "bg-white rounded-2xl p-4 cursor-pointer transition-all border border-gray-100/50 group",
          "shadow-[8px_8px_16px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-1px_-1px_3px_rgba(0,0,0,0.05)]",
          "hover:shadow-[10px_10px_20px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.95)]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-gray-700 text-base truncate">
              <span className="font-semibold bg-gradient-to-r from-[#EF6E59] to-orange-500 bg-clip-text text-transparent">
                <Sparkles className="w-4 h-4 inline mr-1.5 text-[#EF6E59]" />
                Ask Kvitt AI to{" "}
              </span>
              <span className="text-gray-600">{displayText}</span>
              <span className="inline-block w-0.5 h-5 bg-[#EF6E59] ml-0.5 animate-pulse align-middle" />
            </p>
          </div>
          <button className="w-8 h-8 rounded-full bg-[#EF6E59] flex items-center justify-center shrink-0 group-hover:bg-[#e85d47] transition-colors group-hover:scale-105 shadow-md">
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </Link>
  );
}
