import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Card values and suits
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = [
  { symbol: "♠", name: "spades", color: "text-foreground" },
  { symbol: "♥", name: "hearts", color: "text-red-500" },
  { symbol: "♦", name: "diamonds", color: "text-red-500" },
  { symbol: "♣", name: "clubs", color: "text-foreground" },
];

// Card component
function PlayingCard({ value, suit, onClick, selected, small = false }) {
  const suitData = SUITS.find(s => s.name === suit);
  const isRed = suit === "hearts" || suit === "diamonds";
  
  return (
    <button
      onClick={onClick}
      className={`
        ${small ? "w-12 h-16" : "w-16 h-22"} 
        bg-white rounded-lg border-2 transition-all
        flex flex-col items-center justify-center
        ${selected ? "border-primary shadow-lg scale-105" : "border-zinc-200 hover:border-zinc-400"}
        ${onClick ? "cursor-pointer hover:shadow-md" : "cursor-default"}
      `}
    >
      <span className={`${small ? "text-lg" : "text-2xl"} font-bold ${isRed ? "text-red-500" : "text-zinc-900"}`}>
        {value}
      </span>
      <span className={`${small ? "text-lg" : "text-2xl"} ${isRed ? "text-red-500" : "text-zinc-900"}`}>
        {suitData?.symbol}
      </span>
    </button>
  );
}

// Empty card slot
function EmptyCard({ onClick, label, small = false }) {
  return (
    <button
      onClick={onClick}
      className={`
        ${small ? "w-12 h-16" : "w-16 h-22"} 
        bg-zinc-100 rounded-lg border-2 border-dashed border-zinc-300
        flex items-center justify-center
        hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer
      `}
    >
      <span className="text-zinc-400 text-xs">{label || "+"}</span>
    </button>
  );
}

// Card Selector Modal
function CardSelector({ onSelect, usedCards, onClose }) {
  const [selectedValue, setSelectedValue] = useState(null);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-center">Select a Card</h3>
        
        {/* Values */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Value</p>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map(v => (
              <button
                key={v}
                onClick={() => setSelectedValue(v)}
                className={`
                  w-9 h-9 rounded-lg text-sm font-bold transition-all
                  ${selectedValue === v 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }
                `}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        
        {/* Suits */}
        {selectedValue && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Suit</p>
            <div className="flex gap-2 justify-center">
              {SUITS.map(suit => {
                const cardKey = `${selectedValue}_${suit.name}`;
                const isUsed = usedCards.includes(cardKey);
                
                return (
                  <button
                    key={suit.name}
                    onClick={() => !isUsed && onSelect(selectedValue, suit.name)}
                    disabled={isUsed}
                    className={`
                      w-14 h-14 rounded-xl text-3xl transition-all
                      ${isUsed 
                        ? "bg-zinc-800 opacity-30 cursor-not-allowed" 
                        : `bg-secondary hover:bg-secondary/80 ${suit.color}`
                      }
                    `}
                  >
                    {suit.symbol}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <Button variant="ghost" className="w-full mt-4" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function PokerAIAssistant() {
  const [open, setOpen] = useState(false);
  const [yourHand, setYourHand] = useState([]); // [{value, suit}, ...]
  const [communityCards, setCommunityCards] = useState([]);
  const [selectingFor, setSelectingFor] = useState(null); // "hand" | "community" | null
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  // Get all used cards
  const usedCards = [
    ...yourHand.map(c => `${c.value}_${c.suit}`),
    ...communityCards.map(c => `${c.value}_${c.suit}`)
  ];

  const handleSelectCard = (value, suit) => {
    if (selectingFor === "hand" && yourHand.length < 2) {
      setYourHand([...yourHand, { value, suit }]);
    } else if (selectingFor === "community" && communityCards.length < 5) {
      setCommunityCards([...communityCards, { value, suit }]);
    }
    setSelectingFor(null);
  };

  const removeCard = (type, index) => {
    if (type === "hand") {
      setYourHand(yourHand.filter((_, i) => i !== index));
    } else {
      setCommunityCards(communityCards.filter((_, i) => i !== index));
    }
    setSuggestion(null);
  };

  const resetAll = () => {
    setYourHand([]);
    setCommunityCards([]);
    setSuggestion(null);
    setAgreed(false);
  };

  const getAnalysis = async () => {
    if (yourHand.length < 2 || !agreed) return;
    
    setLoading(true);
    setSuggestion(null);
    
    try {
      const response = await axios.post(`${API}/poker/analyze`, {
        your_hand: yourHand.map(c => `${c.value} of ${c.suit}`),
        community_cards: communityCards.map(c => `${c.value} of ${c.suit}`)
      });
      
      setSuggestion(response.data);
    } catch (error) {
      setSuggestion({
        action: "Error",
        potential: "unknown",
        reasoning: error.response?.data?.detail || "Failed to analyze hand. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const getPotentialColor = (potential) => {
    switch (potential?.toLowerCase()) {
      case "high": return "text-green-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getActionColor = (action) => {
    const a = action?.toLowerCase();
    if (a?.includes("fold")) return "text-red-400";
    if (a?.includes("raise") || a?.includes("bet")) return "text-green-500";
    if (a?.includes("call") || a?.includes("check")) return "text-yellow-500";
    return "text-primary";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/20 rounded">BETA</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">AI Assistant</DialogTitle>
                  <p className="text-xs text-muted-foreground">Analyzing your hand...</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg">
                Beta
              </span>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-6">
            {/* Your Hand */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">
                YOUR HAND
              </p>
              <div className="flex gap-3">
                {yourHand.map((card, i) => (
                  <PlayingCard
                    key={i}
                    value={card.value}
                    suit={card.suit}
                    onClick={() => removeCard("hand", i)}
                    selected
                  />
                ))}
                {yourHand.length < 2 && (
                  <EmptyCard onClick={() => setSelectingFor("hand")} />
                )}
                {yourHand.length < 2 && yourHand.length === 1 && (
                  <EmptyCard onClick={() => setSelectingFor("hand")} />
                )}
              </div>
            </div>

            {/* Community Cards */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">
                COMMUNITY CARDS
              </p>
              <div className="flex gap-2 flex-wrap">
                {communityCards.map((card, i) => (
                  <PlayingCard
                    key={i}
                    value={card.value}
                    suit={card.suit}
                    onClick={() => removeCard("community", i)}
                    selected
                    small
                  />
                ))}
                {communityCards.length < 5 && (
                  <EmptyCard 
                    onClick={() => setSelectingFor("community")} 
                    small 
                    label={communityCards.length === 0 ? "Flop" : communityCards.length === 3 ? "Turn" : communityCards.length === 4 ? "River" : "+"}
                  />
                )}
              </div>
              {communityCards.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Pre-flop? Leave empty for pre-flop analysis
                </p>
              )}
            </div>

            {/* Suggestion Result */}
            {suggestion && (
              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${getActionColor(suggestion.action)}`} />
                    <span className={`font-semibold ${getActionColor(suggestion.action)}`}>
                      Suggestion: {suggestion.action}
                    </span>
                  </div>
                  <span className={`text-sm ${getPotentialColor(suggestion.potential)}`}>
                    {suggestion.potential} potential
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {suggestion.reasoning}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/80">
                  <span className="font-semibold text-yellow-500">Disclaimer:</span> AI suggestions are for entertainment purposes only and do not constitute financial advice. Always use your best judgment when playing.
                </p>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="understand" 
                checked={agreed}
                onCheckedChange={setAgreed}
              />
              <label htmlFor="understand" className="text-sm text-muted-foreground cursor-pointer">
                I understand these are suggestions only
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={resetAll}
              >
                Reset
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={getAnalysis}
                disabled={yourHand.length < 2 || !agreed || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Suggestion
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Selector */}
      {selectingFor && (
        <CardSelector
          onSelect={handleSelectCard}
          usedCards={usedCards}
          onClose={() => setSelectingFor(null)}
        />
      )}
    </>
  );
}
