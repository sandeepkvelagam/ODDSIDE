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
import { Sparkles, Loader2, Brain, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Suits configuration
const suits = {
  spades: { symbol: "♠", color: "text-foreground" },
  hearts: { symbol: "♥", color: "text-red-500" },
  diamonds: { symbol: "♦", color: "text-red-500" },
  clubs: { symbol: "♣", color: "text-foreground" },
};

// Valid card values
const validValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Card Input Component - User types value, suit is pre-set
function CardInput({ suit, value, onChange, placeholder = "" }) {
  const suitData = suits[suit];
  const isRed = suit === "hearts" || suit === "diamonds";
  
  const handleChange = (e) => {
    let val = e.target.value.toUpperCase().trim();
    // Allow only valid inputs
    if (val === "" || val === "1" || validValues.includes(val)) {
      onChange(val);
    }
  };

  const handleBlur = () => {
    // Convert "1" to "10" on blur
    if (value === "1") {
      onChange("10");
    }
  };

  return (
    <div className="relative">
      <div className={cn(
        "w-14 h-[76px] sm:w-16 sm:h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
        value 
          ? "bg-white border-primary shadow-md" 
          : "bg-zinc-50 border-dashed border-zinc-300"
      )}>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={2}
          placeholder={placeholder}
          className={cn(
            "w-full text-center font-bold text-lg bg-transparent outline-none",
            isRed ? "text-red-500" : "text-zinc-900",
            "placeholder:text-zinc-300"
          )}
        />
        <span className={cn("text-2xl leading-none mt-0.5", suitData.color)}>
          {suitData.symbol}
        </span>
      </div>
    </div>
  );
}

// Display Card (for showing selected cards above)
function DisplayCard({ value, suit }) {
  const suitData = suits[suit];
  const isRed = suit === "hearts" || suit === "diamonds";
  
  if (!value) {
    return (
      <div className="w-12 h-16 rounded-lg bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center">
        <span className="text-zinc-300 text-xs">?</span>
      </div>
    );
  }
  
  return (
    <div className="w-12 h-16 rounded-lg bg-white border border-border/50 shadow-sm flex flex-col items-center justify-center">
      <span className={cn("text-sm font-bold", isRed ? "text-red-500" : "text-zinc-900")}>
        {value}
      </span>
      <span className={cn("text-lg leading-none", suitData.color)}>
        {suitData.symbol}
      </span>
    </div>
  );
}

export default function PokerAIAssistant() {
  const [open, setOpen] = useState(false);
  
  // Your Hand - 2 cards (one of each suit for variety, user picks which 2)
  const [hand, setHand] = useState([
    { suit: "spades", value: "" },
    { suit: "hearts", value: "" },
  ]);
  
  // Community Cards - 5 cards (flop: 3, turn: 1, river: 1)
  const [community, setCommunity] = useState([
    { suit: "diamonds", value: "" },
    { suit: "clubs", value: "" },
    { suit: "spades", value: "" },
    { suit: "hearts", value: "" },
    { suit: "diamonds", value: "" },
  ]);
  
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const updateHand = (index, value) => {
    const newHand = [...hand];
    newHand[index].value = value;
    setHand(newHand);
    setSuggestion(null);
  };

  const updateCommunity = (index, value) => {
    const newCommunity = [...community];
    newCommunity[index].value = value;
    setCommunity(newCommunity);
    setSuggestion(null);
  };

  // Get filled cards
  const filledHand = hand.filter(c => c.value && validValues.includes(c.value));
  const filledCommunity = community.filter(c => c.value && validValues.includes(c.value));

  const canAnalyze = filledHand.length === 2 && agreed;

  const resetAll = () => {
    setHand([
      { suit: "spades", value: "" },
      { suit: "hearts", value: "" },
    ]);
    setCommunity([
      { suit: "diamonds", value: "" },
      { suit: "clubs", value: "" },
      { suit: "spades", value: "" },
      { suit: "hearts", value: "" },
      { suit: "diamonds", value: "" },
    ]);
    setSuggestion(null);
    setAgreed(false);
  };

  const getAnalysis = async () => {
    if (!canAnalyze) return;
    
    setLoading(true);
    setSuggestion(null);
    
    try {
      const response = await axios.post(`${API}/poker/analyze`, {
        your_hand: filledHand.map(c => `${c.value} of ${c.suit}`),
        community_cards: filledCommunity.map(c => `${c.value} of ${c.suit}`)
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

  const getActionColor = (action) => {
    const a = action?.toLowerCase();
    if (a?.includes("fold")) return "text-red-500";
    if (a?.includes("raise") || a?.includes("bet")) return "text-green-500";
    if (a?.includes("call") || a?.includes("check")) return "text-amber-500";
    return "text-primary";
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
      
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">AI Assistant</DialogTitle>
              <p className="text-xs text-muted-foreground">Enter your cards for analysis</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {/* Display Cards Preview */}
          <div className="bg-secondary/30 rounded-xl p-4">
            {/* Your Hand Display */}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
              Your Hand
            </p>
            <div className="flex gap-2 mb-4">
              {hand.map((card, i) => (
                <DisplayCard key={`h-${i}`} value={card.value} suit={card.suit} />
              ))}
            </div>
            
            {/* Community Cards Display */}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
              Community Cards
            </p>
            <div className="flex gap-2">
              {community.map((card, i) => (
                <DisplayCard key={`c-${i}`} value={card.value} suit={card.suit} />
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Enter card values (A, 2-10, J, Q, K)
            </p>
            
            {/* Your Hand Input */}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Your Hand (required)
            </p>
            <div className="flex gap-3 mb-4">
              {hand.map((card, i) => (
                <CardInput
                  key={`hi-${i}`}
                  suit={card.suit}
                  value={card.value}
                  onChange={(val) => updateHand(i, val)}
                  placeholder={i === 0 ? "A" : "K"}
                />
              ))}
            </div>
            
            {/* Community Cards Input */}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Community Cards (optional)
            </p>
            <div className="flex gap-2 flex-wrap">
              {community.map((card, i) => (
                <CardInput
                  key={`ci-${i}`}
                  suit={card.suit}
                  value={card.value}
                  onChange={(val) => updateCommunity(i, val)}
                  placeholder={i < 3 ? "Flop" : i === 3 ? "Turn" : "River"}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Leave community cards empty for pre-flop analysis
            </p>
          </div>

          {/* AI Suggestion Result */}
          {suggestion && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className={cn("w-4 h-4", getActionColor(suggestion.action))} />
                  <span className={cn("text-sm font-semibold", getActionColor(suggestion.action))}>
                    Suggestion: {suggestion.action}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {suggestion.potential} potential
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {suggestion.reasoning}
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-muted-foreground">Analyzing...</span>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">Disclaimer:</span> AI suggestions are for entertainment purposes only and do not constitute financial advice. Always use your best judgment when playing.
              </p>
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
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
              disabled={!canAnalyze || loading}
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
  );
}
