import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparkles, Loader2, Brain, Eye, EyeOff, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Valid card values
const validValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Suits
const suits = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
const suitColors = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-foreground", spades: "text-foreground" };

// Card display component
const Card = ({ rank, suit, hidden, onClick, isSelected, isInput }) => {
  if (hidden) {
    return (
      <div className="w-11 h-[58px] sm:w-12 sm:h-[66px] rounded-lg bg-gradient-to-br from-red-500 to-red-600 border border-red-400 shadow-sm flex items-center justify-center">
        <span className="text-white text-xl font-bold">?</span>
      </div>
    );
  }

  if (isInput) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "w-11 h-[58px] sm:w-12 sm:h-[66px] rounded-lg border shadow-sm flex flex-col items-center justify-center cursor-pointer transition-all",
          isSelected
            ? "bg-white border-[#EF6E59] ring-2 ring-[#EF6E59]/30"
            : rank
              ? "bg-white border-border/50 hover:border-zinc-300"
              : "bg-zinc-50 border-dashed border-zinc-300 hover:border-zinc-400"
        )}
      >
        {rank ? (
          <>
            <span className={cn("text-sm font-bold", suitColors[suit] || "text-zinc-400")}>
              {rank}
            </span>
            <span className={cn("text-lg leading-none", suitColors[suit] || "text-zinc-300")}>
              {suit ? suits[suit] : "?"}
            </span>
          </>
        ) : (
          <span className="text-zinc-300 text-[10px]">tap</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-11 h-[58px] sm:w-12 sm:h-[66px] rounded-lg bg-white border border-border/50 shadow-sm flex flex-col items-center justify-center">
      <span className={cn("text-sm font-bold", suitColors[suit])}>
        {rank}
      </span>
      <span className={cn("text-lg leading-none", suitColors[suit])}>
        {suits[suit]}
      </span>
    </div>
  );
};

// Mobile-friendly card picker component
const CardPicker = ({ currentRank, currentSuit, onSelectRank, onSelectSuit }) => {
  return (
    <div className="p-4 pb-8">
      {/* Rank Selection */}
      <p className="text-xs font-medium text-muted-foreground mb-2">Select Rank</p>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {validValues.map((value) => (
          <button
            key={value}
            onClick={() => onSelectRank(value)}
            className={cn(
              "h-10 rounded-lg text-sm font-bold transition-all",
              currentRank === value
                ? "bg-[#EF6E59] text-white"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Suit Selection */}
      <p className="text-xs font-medium text-muted-foreground mb-2">Select Suit</p>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(suits).map(([key, symbol]) => (
          <button
            key={key}
            onClick={() => onSelectSuit(key)}
            className={cn(
              "h-12 rounded-lg text-2xl transition-all",
              currentSuit === key
                ? "bg-white ring-2 ring-[#EF6E59] shadow-sm"
                : "bg-secondary hover:bg-secondary/80",
              suitColors[key]
            )}
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function PokerAIAssistant({ gameId = null }) {
  const [open, setOpen] = useState(false);
  const [showHand, setShowHand] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null); // "hand-0", "hand-1", "comm-0", etc.
  
  // Cards state
  const [hand, setHand] = useState([
    { rank: "", suit: null },
    { rank: "", suit: null },
  ]);
  const [community, setCommunity] = useState([
    { rank: "", suit: null },
    { rank: "", suit: null },
    { rank: "", suit: null },
    { rank: "", suit: null },
    { rank: "", suit: null },
  ]);
  
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch stats when dialog opens
  useEffect(() => {
    if (open) {
      axios.get(`${API}/poker/stats`).then(res => setStats(res.data)).catch(() => {});
    }
  }, [open]);

  // Handle card selection
  const handleCardClick = (type, index) => {
    setSelectedCard(`${type}-${index}`);
    setPickerOpen(true); // Open bottom sheet for mobile
  };

  // Get current rank of selected card
  const getCurrentRank = () => {
    if (!selectedCard) return null;
    const [type, idx] = selectedCard.split("-");
    const index = parseInt(idx);
    return type === "hand" ? hand[index].rank : community[index].rank;
  };

  // Handle value selection from picker
  const handleValueSelect = (value) => {
    if (!selectedCard) return;
    const [type, idx] = selectedCard.split("-");
    const index = parseInt(idx);

    if (type === "hand") {
      const newHand = [...hand];
      newHand[index].rank = value;
      setHand(newHand);
    } else {
      const newComm = [...community];
      newComm[index].rank = value;
      setCommunity(newComm);
    }
    setSuggestion(null);
  };

  // Track if waiting for "0" to complete "10"
  const [waitingForTen, setWaitingForTen] = useState(false);

  // Handle keyboard input when card is selected
  const handleKeyDown = (e) => {
    if (!selectedCard) return;

    const key = e.key.toUpperCase();
    const [type, idx] = selectedCard.split("-");
    const index = parseInt(idx);

    // Handle backspace - clear the card
    if (e.key === "Backspace") {
      e.preventDefault();
      setWaitingForTen(false);
      if (type === "hand") {
        const newHand = [...hand];
        newHand[index].rank = "";
        newHand[index].suit = null;
        setHand(newHand);
      } else {
        const newComm = [...community];
        newComm[index].rank = "";
        newComm[index].suit = null;
        setCommunity(newComm);
      }
      setSuggestion(null);
      return;
    }

    // Handle "10" input
    if (key === "1") {
      e.preventDefault();
      setWaitingForTen(true);
      // Show "10" preview immediately
      if (type === "hand") {
        const newHand = [...hand];
        newHand[index].rank = "10";
        setHand(newHand);
      } else {
        const newComm = [...community];
        newComm[index].rank = "10";
        setCommunity(newComm);
      }
      return;
    }

    if (key === "0" && waitingForTen) {
      e.preventDefault();
      setWaitingForTen(false);
      // Already set to "10", just confirm
      return;
    }

    // Handle other valid keys (A, 2-9, J, Q, K)
    if (validValues.includes(key) && key !== "10") {
      e.preventDefault();
      setWaitingForTen(false);
      if (type === "hand") {
        const newHand = [...hand];
        newHand[index].rank = key;
        setHand(newHand);
      } else {
        const newComm = [...community];
        newComm[index].rank = key;
        setCommunity(newComm);
      }
      setSuggestion(null);
    }
  };

  // Handle suit selection
  const handleSuitSelect = (suit) => {
    if (!selectedCard) return;
    
    const [type, idx] = selectedCard.split("-");
    const index = parseInt(idx);
    
    if (type === "hand") {
      const newHand = [...hand];
      newHand[index].suit = suit;
      setHand(newHand);
    } else {
      const newComm = [...community];
      newComm[index].suit = suit;
      setCommunity(newComm);
    }
    setSuggestion(null);
  };

  const getSelectedSuit = () => {
    if (!selectedCard) return null;
    const [type, idx] = selectedCard.split("-");
    const index = parseInt(idx);
    return type === "hand" ? hand[index].suit : community[index].suit;
  };

  // Check validity
  const isCardValid = (card) => card.rank && card.suit && validValues.includes(card.rank);
  const filledHand = hand.filter(isCardValid);
  const filledCommunity = community.filter(isCardValid);

  // Check for duplicate cards (same rank + suit)
  const getDuplicateCards = () => {
    const allCards = [...hand, ...community].filter(isCardValid);
    const seen = new Map();
    const duplicates = [];

    allCards.forEach(card => {
      const key = `${card.rank}-${card.suit}`;
      if (seen.has(key)) {
        duplicates.push(`${card.rank}${suits[card.suit]}`);
      } else {
        seen.set(key, true);
      }
    });

    return duplicates;
  };

  const duplicateCards = getDuplicateCards();
  const hasDuplicates = duplicateCards.length > 0;

  // Validation: need 2 hand cards + at least 3 community cards (flop)
  const canAnalyze = filledHand.length === 2 && filledCommunity.length >= 3 && agreed && !hasDuplicates;

  const resetAll = () => {
    setHand([{ rank: "", suit: null }, { rank: "", suit: null }]);
    setCommunity([
      { rank: "", suit: null },
      { rank: "", suit: null },
      { rank: "", suit: null },
      { rank: "", suit: null },
      { rank: "", suit: null },
    ]);
    setSuggestion(null);
    setSelectedCard(null);
  };

  const getAnalysis = async () => {
    if (!canAnalyze) return;

    setLoading(true);
    setSuggestion(null);

    try {
      const response = await axios.post(`${API}/poker/analyze`, {
        your_hand: filledHand.map(c => `${c.rank} of ${c.suit}`),
        community_cards: filledCommunity.map(c => `${c.rank} of ${c.suit}`),
        game_id: gameId  // Link to game for analytics
      });
      setSuggestion(response.data);
    } catch (error) {
      setSuggestion({
        action: "Error",
        potential: "unknown",
        reasoning: error.response?.data?.detail || "Failed to analyze. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10 shadow-[0_0_10px_rgba(239,110,89,0.3)] hover:shadow-[0_0_15px_rgba(239,110,89,0.5)] transition-all"
        >
          <Brain className="w-4 h-4" />
          <span className="text-xs sm:text-sm">AI Help</span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-white rounded animate-pulse">BETA</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent
        className="sm:max-w-4xl bg-white border-border p-0 gap-0"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-start p-4 sm:p-5 md:p-6">
          {/* Left Side - Text (centered, top-aligned) */}
          <div className="order-2 md:order-1 text-center md:text-left flex flex-col justify-start">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-xs font-medium mb-2 mx-auto md:mx-0 w-fit">
              <Brain className="w-3.5 h-3.5" />
              AI Poker Assistant
              <span className="bg-[#EF6E59] text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                Beta
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-foreground">
              Your AI Game Companion
            </h2>
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed hidden sm:block">
              New to poker? Enter your cards and see what a basic strategy model would suggest—check, raise, call, or fold.
            </p>
            <p className="text-xs text-muted-foreground/80 mb-2 leading-relaxed hidden md:block">
              Designed to help beginners understand common decision patterns and learn the game.
            </p>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] sm:text-xs text-amber-800 leading-relaxed mb-2">
              <strong>Disclaimer:</strong> Suggestions are educational and for entertainment only. They do not guarantee outcomes.
            </div>

            {/* Stats Section - Collapsible */}
            {stats?.total_analyses > 0 && (
              <div className="hidden sm:block">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mx-auto md:mx-0"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {showStats ? "Hide" : "Show"} Your Stats ({stats.total_analyses} hands)
                  {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showStats && (
                  <div className="mt-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your AI Analysis Stats</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white rounded">
                        <span className="text-muted-foreground text-[10px]">Most Common</span>
                        <p className="font-semibold text-primary">{stats.most_common_action || "—"}</p>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <span className="text-muted-foreground text-[10px]">High Potential</span>
                        <p className="font-semibold text-green-600">{stats.potential_percentages?.High || 0}%</p>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <span className="text-muted-foreground text-[10px]">Raise Rate</span>
                        <p className="font-semibold">{stats.action_percentages?.RAISE || 0}%</p>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <span className="text-muted-foreground text-[10px]">Fold Rate</span>
                        <p className="font-semibold text-destructive">{stats.action_percentages?.FOLD || 0}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Card Input */}
          <div className="order-1 md:order-2">
            <div className="relative rounded-xl border border-border/50 shadow-sm overflow-hidden bg-white">
              {/* Beta badge */}
              <div className="absolute top-2 right-2 z-20">
                <span className="text-[9px] font-semibold bg-[#EF6E59] text-white px-2 py-0.5 rounded-full">
                  Beta
                </span>
              </div>

              <div className="p-3 sm:p-4">
                {/* Header - Compact */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#EF6E59] to-[#e04a35] flex items-center justify-center">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground">AI Assistant</p>
                    <p className="text-[9px] text-muted-foreground">Tap card → type value → pick suit</p>
                  </div>
                </div>

                {/* Your Hand - Compact */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Your Hand</p>
                    <button
                      onClick={() => setShowHand(!showHand)}
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                    >
                      {showHand ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {hand.map((card, i) => (
                      <Card
                        key={`hand-${i}`}
                        rank={card.rank}
                        suit={card.suit}
                        hidden={!showHand && card.rank}
                        isInput
                        isSelected={selectedCard === `hand-${i}`}
                        onClick={() => handleCardClick("hand", i)}
                      />
                    ))}
                  </div>
                </div>

                {/* Community Cards - Compact */}
                <div className="mb-3">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Community Cards</p>
                  <div className="flex gap-1.5">
                    {community.map((card, i) => (
                      <Card
                        key={`comm-${i}`}
                        rank={card.rank}
                        suit={card.suit}
                        isInput
                        isSelected={selectedCard === `comm-${i}`}
                        onClick={() => handleCardClick("comm", i)}
                      />
                    ))}
                  </div>
                </div>

                {/* Suit Selector - Compact */}
                {selectedCard && (
                  <div className="mb-3 p-2 bg-secondary/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground mb-1.5">Type A, 2-10, J, Q, K then pick suit:</p>
                    <div className="flex gap-1.5">
                      {Object.entries(suits).map(([key, symbol]) => (
                        <button
                          key={key}
                          onClick={() => handleSuitSelect(key)}
                          className={cn(
                            "w-8 h-8 rounded-md text-xl flex items-center justify-center transition-all",
                            getSelectedSuit() === key
                              ? `${suitColors[key]} bg-white ring-2 ring-[#EF6E59]/30 shadow-sm`
                              : `${suitColors[key]} opacity-50 hover:opacity-100 hover:bg-white/50`
                          )}
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings - Compact */}
                {hasDuplicates && (
                  <div className="mb-2 p-1.5 rounded-md bg-red-50 border border-red-200 text-[10px] text-red-700">
                    <strong>Duplicate:</strong> {duplicateCards.join(", ")}
                  </div>
                )}

                {/* Suggestion - Compact */}
                <div className="min-h-[60px]">
                  {loading && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                      <Sparkles className="w-3 h-3 text-[#EF6E59] animate-pulse" />
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1 h-1 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1 h-1 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  {suggestion && !loading && (
                    <div className="p-2 rounded-lg bg-[#EF6E59]/5 border border-[#EF6E59]/15">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#EF6E59]" />
                          <span className="text-[10px] font-semibold text-[#EF6E59]">
                            {suggestion.action}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-medium px-1 py-0.5 rounded",
                          suggestion.potential === "High" ? "bg-green-100 text-green-700" :
                          suggestion.potential === "Medium" ? "bg-amber-100 text-amber-700" :
                          "bg-zinc-100 text-zinc-600"
                        )}>
                          {suggestion.potential}
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground leading-relaxed">
                        <span className="text-muted-foreground">Why:</span> {suggestion.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Consent + Validation - Compact */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
                  <button
                    onClick={() => setAgreed(!agreed)}
                    className={cn(
                      "w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                      agreed ? "bg-[#EF6E59] border-[#EF6E59]" : "border-zinc-300 bg-white hover:border-zinc-400"
                    )}
                  >
                    {agreed && <span className="text-[8px] text-white font-bold">✓</span>}
                  </button>
                  <span className={cn("text-[9px]", agreed ? "text-foreground" : "text-muted-foreground")}>
                    AI suggestions only — I decide my actions
                  </span>
                </div>

                {/* Validation hint */}
                <div className="mt-1.5 h-4">
                  {!agreed && <p className="text-[10px] text-muted-foreground">Please confirm before generating suggestions</p>}
                  {agreed && !hasDuplicates && filledHand.length < 2 && (
                    <p className="text-[10px] text-amber-600">Need {2 - filledHand.length} more hand card{2 - filledHand.length > 1 ? 's' : ''}</p>
                  )}
                  {agreed && !hasDuplicates && filledHand.length === 2 && filledCommunity.length < 3 && (
                    <p className="text-[10px] text-amber-600">Need {3 - filledCommunity.length} more community card{3 - filledCommunity.length > 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Actions - Compact */}
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={resetAll} className="flex-1 h-7 text-[10px]">
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-[10px] bg-[#EF6E59] hover:bg-[#e04a35] disabled:opacity-50"
                    onClick={getAnalysis}
                    disabled={!canAnalyze || loading}
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    Get Suggestion
                  </Button>
                </div>

                {/* Micro text */}
                <p className="text-[8px] text-muted-foreground/50 text-center mt-1.5">For learning and practice only</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Mobile Card Picker Sheet */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">
              {selectedCard?.startsWith("hand") ? "Your Hand" : "Community"} Card {selectedCard?.split("-")[1] ? parseInt(selectedCard.split("-")[1]) + 1 : ""}
            </SheetTitle>
          </SheetHeader>
          <CardPicker
            currentRank={getCurrentRank()}
            currentSuit={getSelectedSuit()}
            onSelectRank={handleValueSelect}
            onSelectSuit={(suit) => {
              handleSuitSelect(suit);
              setPickerOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}
