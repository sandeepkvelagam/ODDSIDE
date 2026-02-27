import React, { createContext, useContext, useState, ReactNode } from "react";

type Card = { rank: string; suit: string } | null;

type PokerAIContextType = {
  handCards: Card[];
  setHandCards: (cards: Card[]) => void;
  communityCards: Card[];
  setCommunityCards: (cards: Card[]) => void;
  consentChecked: boolean;
  setConsentChecked: (checked: boolean) => void;
  suggestion: any | null;
  setSuggestion: (s: any | null) => void;
  showHand: boolean;
  setShowHand: (show: boolean) => void;
  resetAll: () => void;
};

const PokerAIContext = createContext<PokerAIContextType | undefined>(undefined);

export function PokerAIProvider({ children }: { children: ReactNode }) {
  const [handCards, setHandCards] = useState<Card[]>([null, null]);
  const [communityCards, setCommunityCards] = useState<Card[]>([null, null, null, null, null]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [suggestion, setSuggestion] = useState<any | null>(null);
  const [showHand, setShowHand] = useState(false);

  const resetAll = () => {
    setHandCards([null, null]);
    setCommunityCards([null, null, null, null, null]);
    setConsentChecked(false);
    setSuggestion(null);
    setShowHand(false);
  };

  return (
    <PokerAIContext.Provider
      value={{
        handCards,
        setHandCards,
        communityCards,
        setCommunityCards,
        consentChecked,
        setConsentChecked,
        suggestion,
        setSuggestion,
        showHand,
        setShowHand,
        resetAll,
      }}
    >
      {children}
    </PokerAIContext.Provider>
  );
}

export function usePokerAI() {
  const context = useContext(PokerAIContext);
  if (!context) {
    throw new Error("usePokerAI must be used within PokerAIProvider");
  }
  return context;
}
