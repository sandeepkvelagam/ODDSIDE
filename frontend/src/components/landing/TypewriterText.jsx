import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const defaultPhrases = [
  "Create a group for Friday night poker",
  "Track buy-ins for our $20 game",
  "Settle who owes what instantly",
  "Check my win rate across 50+ sessions",
  "Start a live game with 8 players",
];

export default function TypewriterText({
  phrases = defaultPhrases,
  typingSpeed = 45,
  deletingSpeed = 25,
  pauseDuration = 1500,
  className,
}) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];

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
            setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <div className={cn("font-mono text-base md:text-lg", className)}>
      <span className="text-gray-400">&quot;</span>
      <span className="text-gray-300">{displayText}</span>
      <span className="typewriter-cursor" />
      <span className="text-gray-400">&quot;</span>
    </div>
  );
}
