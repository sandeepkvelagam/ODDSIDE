import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Valid card values
const validValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Suits with colors
const suits = [
  { key: "hearts", symbol: "♥", color: "text-red-500", hoverBg: "hover:bg-red-50" },
  { key: "diamonds", symbol: "♦", color: "text-red-500", hoverBg: "hover:bg-red-50" },
  { key: "clubs", symbol: "♣", color: "text-foreground", hoverBg: "hover:bg-zinc-100" },
  { key: "spades", symbol: "♠", color: "text-foreground", hoverBg: "hover:bg-zinc-100" },
];

// Card with value input and suit selector
function CardInputWithSuits({ value, suit, onValueChange, onSuitChange }) {
  const selectedSuit = suits.find(s => s.key === suit);
  const isRed = suit === "hearts" || suit === "diamonds";
  
  const handleValueChange = (e) => {
    let val = e.target.value.toUpperCase().trim();
    if (val === "" || val === "1" || validValues.includes(val)) {
      onValueChange(val);
    }
  };

  const handleBlur = () => {
    if (value === "1") onValueChange("10");
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Card */}
      <div className={cn(
        "w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg border flex flex-col items-center justify-center transition-all",
        value && suit 
          ? "bg-white border-border/50 shadow-sm" 
          : "bg-zinc-50 border-dashed border-zinc-300"
      )}>
        <input
          type="text"
          value={value}
          onChange={handleValueChange}
          onBlur={handleBlur}
          maxLength={2}
          placeholder="?"
          className={cn(
            "w-full text-center font-bold text-base sm:text-lg bg-transparent outline-none",
            value && suit && isRed ? "text-red-500" : "text-zinc-900",
            "placeholder:text-zinc-300"
          )}
        />
        {suit && selectedSuit && (
          <span className={cn("text-xl sm:text-2xl leading-none", selectedSuit.color)}>
            {selectedSuit.symbol}
          </span>
        )}
        {!suit && (
          <span className="text-zinc-300 text-xs">suit</span>
        )}
      </div>
      
      {/* Suit selector */}
      <div className="flex gap-0.5">
        {suits.map(s => (
          <button
            key={s.key}
            onClick={() => onSuitChange(s.key)}
            className={cn(
              "w-6 h-6 rounded text-sm flex items-center justify-center transition-all",
              suit === s.key 
                ? `${s.color} bg-zinc-100 ring-1 ring-zinc-300` 
                : `${s.color} opacity-40 hover:opacity-100 ${s.hoverBg}`
            )}
          >
            {s.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PokerAIAssistant() {
  const [open, setOpen] = useState(false);
  
  // Your Hand - 2 cards, each needs value + suit
  const [hand, setHand] = useState([
    { value: "", suit: null },
    { value: "", suit: null },
  ]);
  
  // Community Cards - 5 cards
  const [community, setCommunity] = useState([
    { value: "", suit: null },
    { value: "", suit: null },
    { value: "", suit: null },
    { value: "", suit: null },
    { value: "", suit: null },
  ]);
  
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const updateHand = (index, field, value) => {
    const newHand = [...hand];
    newHand[index][field] = value;
    setHand(newHand);
    setSuggestion(null);
  };

  const updateCommunity = (index, field, value) => {
    const newCommunity = [...community];
    newCommunity[index][field] = value;
    setCommunity(newCommunity);
    setSuggestion(null);
  };

  // Check if cards are valid
  const isCardValid = (card) => card.value && card.suit && validValues.includes(card.value);
  const filledHand = hand.filter(isCardValid);
  const filledCommunity = community.filter(isCardValid);
  const canAnalyze = filledHand.length === 2 && agreed;

  const resetAll = () => {
    setHand([{ value: "", suit: null }, { value: "", suit: null }]);
    setCommunity([
      { value: "", suit: null },
      { value: "", suit: null },
      { value: "", suit: null },
      { value: "", suit: null },
      { value: "", suit: null },
    ]);
    setSuggestion(null);
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
        reasoning: error.response?.data?.detail || "Failed to analyze. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const a = action?.toLowerCase();
    if (a?.includes("fold")) return "text-red-500";
    if (a?.includes("raise") || a?.includes("bet")) return "text-green-600";
    if (a?.includes("call") || a?.includes("check")) return "text-amber-600";
    return "text-[#EF6E59]";
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
      
      <DialogContent className="sm:max-w-4xl bg-white border-border p-0 gap-0 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 p-6 md:p-8">
          {/* Left Side - Text */}
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              AI Poker Assistant
              <span className="bg-[#EF6E59] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                Beta
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
              Your AI game companion
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Enter your cards using the card inputs on the right. Select a value (A, 2-10, J, Q, K) and click the suit symbol. Get instant suggestions — stay, raise, check, or fold.
            </p>
            
            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed mb-4">
              <strong>Disclaimer:</strong> AI suggestions are for entertainment purposes only and do not constitute financial advice. Always use your best judgment when playing.
            </div>

            {/* Checkbox */}
            <div className="flex items-center gap-2 mb-4">
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
                size="sm"
                onClick={resetAll}
              >
                Reset
              </Button>
              <Button 
                size="sm"
                className="bg-[#EF6E59] hover:bg-[#e04a35] text-white"
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

          {/* Right Side - Card Demo Box */}
          <div className="order-1 md:order-2">
            <div className="relative rounded-2xl border-2 border-dashed border-border/50 shadow-sm overflow-hidden bg-white/80">
              {/* Header */}
              <div className="p-4 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EF6E59] to-[#e04a35] flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">AI Assistant</p>
                      <p className="text-[10px] text-muted-foreground">Enter your cards</p>
                    </div>
                  </div>
                </div>

                {/* Your Hand */}
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                    Your Hand
                  </p>
                  <div className="flex gap-3">
                    {hand.map((card, i) => (
                      <CardInputWithSuits
                        key={`hand-${i}`}
                        value={card.value}
                        suit={card.suit}
                        onValueChange={(val) => updateHand(i, "value", val)}
                        onSuitChange={(suit) => updateHand(i, "suit", suit)}
                      />
                    ))}
                  </div>
                </div>

                {/* Community Cards */}
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                    Community Cards
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {community.map((card, i) => (
                      <CardInputWithSuits
                        key={`comm-${i}`}
                        value={card.value}
                        suit={card.suit}
                        onValueChange={(val) => updateCommunity(i, "value", val)}
                        onSuitChange={(suit) => updateCommunity(i, "suit", suit)}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Leave empty for pre-flop
                  </p>
                </div>
              </div>

              {/* Suggestion Area */}
              <div className="px-4 pb-4 min-h-[80px]">
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
                  <div className="p-3 rounded-xl bg-[#EF6E59]/5 border border-[#EF6E59]/15">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className={cn("w-3.5 h-3.5", getActionColor(suggestion.action))} />
                        <span className={cn("text-xs font-semibold", getActionColor(suggestion.action))}>
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

                {!suggestion && !loading && (
                  <div className="p-3 rounded-xl bg-secondary/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      Enter your 2 cards, agree to disclaimer, and click "Get Suggestion"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
