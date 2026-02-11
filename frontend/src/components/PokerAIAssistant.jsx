import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Brain, Eye, EyeOff, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Valid card values
const validValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Suits
const suits = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
const suitColors = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-foreground", spades: "text-foreground" };

// Card display component (same as demo)
const Card = ({ rank, suit, hidden, onClick, isSelected, isInput }) => {
  if (hidden) {
    return (
      <div className="w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg bg-gradient-to-br from-red-500 to-red-600 border border-red-400 shadow-sm flex items-center justify-center">
        <span className="text-white text-2xl font-bold">?</span>
      </div>
    );
  }
  
  if (isInput) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg border shadow-sm flex flex-col items-center justify-center cursor-pointer transition-all",
          isSelected 
            ? "bg-white border-[#EF6E59] ring-2 ring-[#EF6E59]/30" 
            : rank 
              ? "bg-white border-border/50 hover:border-zinc-300"
              : "bg-zinc-50 border-dashed border-zinc-300 hover:border-zinc-400"
        )}
      >
        {rank ? (
          <>
            <span className={cn("text-sm sm:text-base font-bold", suitColors[suit] || "text-zinc-400")}>
              {rank}
            </span>
            <span className={cn("text-lg sm:text-xl leading-none", suitColors[suit] || "text-zinc-300")}>
              {suit ? suits[suit] : "?"}
            </span>
          </>
        ) : (
          <span className="text-zinc-300 text-xs">tap</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg bg-white border border-border/50 shadow-sm flex flex-col items-center justify-center">
      <span className={cn("text-sm sm:text-base font-bold", suitColors[suit])}>
        {rank}
      </span>
      <span className={cn("text-lg sm:text-xl leading-none", suitColors[suit])}>
        {suits[suit]}
      </span>
    </div>
  );
};

export default function PokerAIAssistant({ gameId = null }) {
  const [open, setOpen] = useState(false);
  const [showHand, setShowHand] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null); // "hand-0", "hand-1", "comm-0", etc.
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
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

  // Fetch user stats when dialog opens
  useEffect(() => {
    if (open && !stats && !loadingStats) {
      fetchStats();
    }
  }, [open]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await axios.get(`${API}/poker/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Handle card selection
  const handleCardClick = (type, index) => {
    setSelectedCard(`${type}-${index}`);
  };

  // Handle keyboard input when card is selected
  const handleKeyDown = (e) => {
    if (!selectedCard) return;

    const key = e.key.toUpperCase();

    // Handle backspace - clear the card
    if (e.key === "Backspace") {
      e.preventDefault();
      const [type, idx] = selectedCard.split("-");
      const index = parseInt(idx);

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

    // Handle number keys and letter keys for card values
    if (validValues.includes(key) || key === "1" || key === "0") {
      e.preventDefault();
      const [type, idx] = selectedCard.split("-");
      const index = parseInt(idx);

      // Handle "10" input - if typing "1" then "0"
      if (key === "1") {
        if (type === "hand") {
          const newHand = [...hand];
          newHand[index].rank = "1";
          setHand(newHand);
        } else {
          const newComm = [...community];
          newComm[index].rank = "1";
          setCommunity(newComm);
        }
      } else if (key === "0") {
        // If previous char was "1", make it "10"
        if (type === "hand" && hand[index].rank === "1") {
          const newHand = [...hand];
          newHand[index].rank = "10";
          setHand(newHand);
        } else if (type === "comm" && community[index].rank === "1") {
          const newComm = [...community];
          newComm[index].rank = "10";
          setCommunity(newComm);
        }
      } else {
        if (type === "hand") {
          const newHand = [...hand];
          newHand[index].rank = key;
          setHand(newHand);
        } else {
          const newComm = [...community];
          newComm[index].rank = key;
          setCommunity(newComm);
        }
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
      // Refresh stats after successful analysis
      fetchStats();
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
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Brain className="w-4 h-4" />
          AI Assistant
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/20 rounded">BETA</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent
        className="sm:max-w-5xl bg-white border-border p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center p-6 md:p-8">
          {/* Left Side - Text (centered) */}
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              AI Poker Assistant
              <span className="bg-[#EF6E59] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                Beta
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Your AI game companion
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              New to poker? Enter your cards with a simple UI and get instant suggestions—stay, raise, check, or fold. Perfect for beginners learning the game.
            </p>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed mb-4">
              <strong>Disclaimer:</strong> AI suggestions are for entertainment purposes only and do not constitute financial advice. Always use your best judgment when playing.
            </div>

            {/* Stats Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {showStats ? "Hide" : "View"} Your Stats
              {stats?.total_analyses > 0 && (
                <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">
                  {stats.total_analyses} hands
                </span>
              )}
            </button>

            {/* Stats Display */}
            {showStats && stats && stats.total_analyses > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Your AI Analysis Stats
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-muted-foreground text-[10px]">Most Common</p>
                    <p className="font-bold text-[#EF6E59]">{stats.most_common_suggestion || "—"}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-muted-foreground text-[10px]">High Potential</p>
                    <p className="font-bold text-green-600">{stats.potential_percentages?.High || 0}%</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-muted-foreground text-[10px]">Raise Rate</p>
                    <p className="font-bold">{stats.action_percentages?.RAISE || 0}%</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <p className="text-muted-foreground text-[10px]">Fold Rate</p>
                    <p className="font-bold">{stats.action_percentages?.FOLD || 0}%</p>
                  </div>
                </div>
                {stats.insights?.aggressive_play && (
                  <p className="mt-2 text-[10px] text-amber-600">💪 You tend to play aggressively!</p>
                )}
                {stats.insights?.conservative_play && (
                  <p className="mt-2 text-[10px] text-blue-600">🛡️ You play conservatively.</p>
                )}
              </div>
            )}

            {showStats && (!stats || stats.total_analyses === 0) && (
              <div className="mt-3 p-3 rounded-xl bg-secondary/30 border border-border/30 text-center">
                <p className="text-xs text-muted-foreground">
                  No hands analyzed yet. Try the AI Assistant to build your stats!
                </p>
              </div>
            )}
          </div>

          {/* Right Side - Demo Card */}
          <div className="order-1 md:order-2">
            <div className="relative rounded-2xl border-2 border-dashed border-border/50 shadow-card overflow-hidden bg-white/80 backdrop-blur-sm">
              {/* Coming Soon badge */}
              <div className="absolute top-3 right-3 z-20">
                <span className="text-[10px] font-semibold bg-[#EF6E59] text-white px-2.5 py-1 rounded-full shadow-sm">
                  Beta
                </span>
              </div>

              <div className="p-5">
                {/* Header */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EF6E59] to-[#e04a35] flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">AI Assistant</p>
                    <p className="text-[10px] text-muted-foreground">Tap a card, type value, pick suit</p>
                  </div>
                </div>

                {/* Your Hand */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Hand</p>
                    <button 
                      onClick={() => setShowHand(!showHand)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                    >
                      {showHand ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
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

                {/* Community Cards */}
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Community Cards</p>
                  <div className="flex gap-2">
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

                {/* Suit Selector - shown when card is selected */}
                {selectedCard && (
                  <div className="mb-4 p-3 bg-secondary/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground mb-2">Type A, 2-10, J, Q, K then pick suit:</p>
                    <div className="flex gap-2">
                      {Object.entries(suits).map(([key, symbol]) => (
                        <button
                          key={key}
                          onClick={() => handleSuitSelect(key)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-2xl flex items-center justify-center transition-all",
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

                {/* Warnings */}
                {hasDuplicates && (
                  <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <strong>Duplicate card detected:</strong> {duplicateCards.join(", ")} - Each card can only appear once in a deck!
                  </div>
                )}

                {/* Suggestion */}
                <div className="min-h-[80px] overflow-hidden">
                  {loading && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
                      <Sparkles className="w-4 h-4 text-[#EF6E59] animate-pulse" />
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EF6E59] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  {suggestion && !loading && (
                    <div className="p-3 rounded-xl bg-[#EF6E59]/5 border border-[#EF6E59]/15 animate-fade-in-up">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#EF6E59]" />
                          <span className="text-[10px] font-semibold text-[#EF6E59]">
                            Suggestion: {suggestion.action}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {suggestion.potential} potential
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">
                        {suggestion.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Consent line */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
                  <button
                    onClick={() => setAgreed(!agreed)}
                    className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                      agreed ? "bg-[#EF6E59] border-[#EF6E59]" : "border-border/50 bg-white"
                    )}
                  >
                    {agreed && <span className="text-[8px] text-white">✓</span>}
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    I understand these are suggestions only
                  </span>
                </div>

                {/* Validation hint */}
                {!canAnalyze && agreed && !hasDuplicates && (
                  <p className="text-[10px] text-amber-600 mb-2">
                    {filledHand.length < 2 && `Need ${2 - filledHand.length} more hand card${2 - filledHand.length > 1 ? 's' : ''}`}
                    {filledHand.length === 2 && filledCommunity.length < 3 && `Need ${3 - filledCommunity.length} more community card${3 - filledCommunity.length > 1 ? 's' : ''} (min. 3 for flop)`}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={resetAll} className="flex-1 h-8 text-xs">
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-[#EF6E59] hover:bg-[#e04a35]"
                    onClick={getAnalysis}
                    disabled={!canAnalyze || loading}
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    Get Suggestion
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
