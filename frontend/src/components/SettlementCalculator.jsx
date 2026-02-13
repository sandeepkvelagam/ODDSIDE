import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, CheckCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SettlementCalculator({
  isOpen,
  onClose,
  players = [],
  chipValue = 1,
  gameId,
  gameTitle,
  needsSettle = false,
  onComplete
}) {
  const [phase, setPhase] = useState("collecting");
  const [settlements, setSettlements] = useState([]);
  const [error, setError] = useState(null);
  const timeoutsRef = useRef([]);

  // Calculate player count for "before" payments estimate
  // Worst case: n*(n-1)/2 payments for n players
  const playerCount = players.length;
  const maxPayments = Math.floor((playerCount * (playerCount - 1)) / 2);

  // Reset and start animation when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setPhase("collecting");
      setSettlements([]);
      setError(null);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      return;
    }

    const clearTimeouts = () => timeoutsRef.current.forEach(clearTimeout);

    // Start the animation sequence
    const runAnimation = async () => {
      clearTimeouts();
      timeoutsRef.current = [];
      setPhase("collecting");

      // Phase 1 → Phase 2: After showing players (2s)
      const calcTimeout = setTimeout(() => {
        setPhase("calculating");

        // Call settle API if needed (for "ended" games)
        if (needsSettle) {
          axios.post(`${API}/games/${gameId}/settle`)
            .catch(err => {
              console.error("Settlement error:", err);
              setError(err.response?.data?.detail || "Failed to generate settlement");
            });
        }
      }, 2000);
      timeoutsRef.current.push(calcTimeout);

      // Phase 2 → Phase 3: Fetch settlement data and show results (3.5s)
      const resultsTimeout = setTimeout(async () => {
        try {
          const res = await axios.get(`${API}/games/${gameId}/settlement`);
          setSettlements(res.data.settlements || []);
          setPhase("results");
        } catch (err) {
          console.error("Failed to fetch settlements:", err);
          setError(err.response?.data?.detail || "Failed to load settlement");
          setPhase("results");
        }
      }, 3500);
      timeoutsRef.current.push(resultsTimeout);

      // Phase 3 → Phase 4: Show complete state (5s)
      const completeTimeout = setTimeout(() => {
        setPhase("complete");
      }, 5500);
      timeoutsRef.current.push(completeTimeout);
    };

    runAnimation();
    return clearTimeouts;
  }, [isOpen, gameId, needsSettle]);

  // Sorted players by net result (winners first)
  const sortedPlayers = [...players].sort((a, b) => (b.net_result || 0) - (a.net_result || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border mx-4 max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl md:text-2xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {phase === "collecting" && "Collecting Player Data..."}
            {phase === "calculating" && "Optimizing Payments..."}
            {phase === "results" && "Settlement Optimized!"}
            {phase === "complete" && "Settlement Ready!"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 min-h-[350px]">
          {/* Phase 1: Collecting - Show player cards */}
          {phase === "collecting" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Analyzing {gameTitle || "game"} results...
              </p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {sortedPlayers.map((player, i) => {
                  const netResult = player.net_result || 0;
                  return (
                    <div
                      key={player.user_id || i}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 animate-fade-in-up"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {player.user?.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{player.user?.name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Buy-in: ${player.total_buy_in || 0} • Cash-out: ${player.cash_out?.toFixed(0) || 0}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-mono font-bold text-sm",
                        netResult >= 0 ? "text-green-600" : "text-destructive"
                      )}>
                        {netResult >= 0 ? "+" : ""}${netResult.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 2: Calculating - Show spinner */}
          {phase === "calculating" && (
            <div className="flex flex-col items-center justify-center h-[280px] gap-4">
              <div className="w-12 h-12 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-muted-foreground">Kvitt is optimizing payments...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Finding the minimum number of transactions
                </p>
              </div>
            </div>
          )}

          {/* Phase 3 & 4: Results - Show optimized settlements */}
          {(phase === "results" || phase === "complete") && (
            <div className="space-y-3">
              {error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {/* Badge showing optimization result */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {maxPayments > 0 ? `Up to ${maxPayments}` : "Multiple"} payments
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                      {settlements.length} payments
                    </span>
                  </div>

                  {/* Settlement list */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                    {settlements.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p>Everyone broke even - no payments needed!</p>
                      </div>
                    ) : (
                      settlements.map((settlement, i) => (
                        <div
                          key={settlement.ledger_id || i}
                          className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 animate-fade-in-up"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium truncate max-w-[80px]">
                              {settlement.from_user?.name || "Unknown"}
                            </span>
                            <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-medium truncate max-w-[80px]">
                              {settlement.to_user?.name || "Unknown"}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm">
                            ${settlement.amount?.toFixed(2) || 0}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Complete state - Show button */}
                  {phase === "complete" && (
                    <div className="pt-4 animate-fade-in-up">
                      <Button
                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                        onClick={onComplete}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        View Settlement
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
