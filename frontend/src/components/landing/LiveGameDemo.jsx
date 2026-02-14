import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Play, ArrowRight, Shield, Check, X, Music, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const playerData = [
  { name: "You (Host)", avatar: "Y", buyIn: 20, finalChips: 35 },
  { name: "Mike T.", avatar: "M", buyIn: 20, finalChips: 12 },
  { name: "Sarah K.", avatar: "S", buyIn: 20, finalChips: 28 },
  { name: "James R.", avatar: "J", buyIn: 20, finalChips: 5 },
];

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function LiveGameDemo() {
  const [phase, setPhase] = useState(0);
  const [players, setPlayers] = useState([]);
  const [timer, setTimer] = useState(0);
  const [chipBank, setChipBank] = useState(0);
  const [showRequest, setShowRequest] = useState(false);
  const [requestHandled, setRequestHandled] = useState(false);
  const [showCashout, setShowCashout] = useState(false);
  const [cashoutChips, setCashoutChips] = useState("");
  const [cashoutSubmitted, setCashoutSubmitted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const timeoutsRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const clearAll = () => {
      timeoutsRef.current.forEach(clearTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    const runDemo = () => {
      clearAll();
      timeoutsRef.current = [];
      setPhase(0);
      setPlayers([]);
      setTimer(0);
      setChipBank(0);
      setShowRequest(false);
      setRequestHandled(false);
      setShowCashout(false);
      setCashoutChips("");
      setCashoutSubmitted(false);

      // Phase 1: Players join (0-3.5s)
      playerData.forEach((p, i) => {
        const t = setTimeout(() => {
          setPlayers((prev) => [
            ...prev,
            { ...p, chips: p.buyIn, status: "playing" },
          ]);
          setChipBank((prev) => prev + p.buyIn);
        }, 800 * (i + 1));
        timeoutsRef.current.push(t);
      });

      // Phase 2: Game running (3.5s) - timer starts
      const startTimer = setTimeout(() => {
        setPhase(1);
        timerRef.current = setInterval(
          () => setTimer((prev) => prev + 1),
          1000
        );
      }, 3500);
      timeoutsRef.current.push(startTimer);

      // Phase 3: Buy-in request (5.5s)
      const requestTime = setTimeout(() => {
        setShowRequest(true);
      }, 5500);
      timeoutsRef.current.push(requestTime);

      // Auto-approve request (7.5s)
      const approveTime = setTimeout(() => {
        setRequestHandled(true);
        setShowRequest(false);
        setChipBank((prev) => prev + 20);
        setPlayers((prev) =>
          prev.map((p) =>
            p.name === "Mike T." ? { ...p, chips: p.chips + 20 } : p
          )
        );
      }, 7500);
      timeoutsRef.current.push(approveTime);

      // Phase 5 (NEW): Sarah self-cashout (8.5s) — show cashout popup
      const cashoutShow = setTimeout(() => {
        setShowCashout(true);
      }, 8500);
      timeoutsRef.current.push(cashoutShow);

      // Simulate typing "2" at 9s
      const typeDigit1 = setTimeout(() => {
        setCashoutChips("2");
      }, 9000);
      timeoutsRef.current.push(typeDigit1);

      // Simulate typing "28" at 9.5s
      const typeDigit2 = setTimeout(() => {
        setCashoutChips("28");
      }, 9500);
      timeoutsRef.current.push(typeDigit2);

      // Auto-click submit at 10.5s
      const cashoutSubmit = setTimeout(() => {
        setCashoutSubmitted(true);
        setShowCashout(false);
        // Update Sarah's row to show (out) with chips: 28
        setPlayers((prev) =>
          prev.map((p) =>
            p.name === "Sarah K."
              ? { ...p, chips: 28, status: "cashed_out" }
              : p
          )
        );
      }, 10500);
      timeoutsRef.current.push(cashoutSubmit);

      // Phase 6: Remaining players cash out (12s)
      const cashOut = setTimeout(() => {
        setPhase(2);
        if (timerRef.current) clearInterval(timerRef.current);
        setPlayers((prev) =>
          prev.map((p) => {
            // Sarah already cashed out
            if (p.name === "Sarah K.") {
              return {
                ...p,
                profit: p.chips - p.buyIn,
              };
            }
            return {
              ...p,
              chips: p.finalChips,
              profit: p.finalChips - p.buyIn,
              status: "cashed_out",
            };
          })
        );
      }, 12000);
      timeoutsRef.current.push(cashOut);

      // Reset (18s)
      const reset = setTimeout(runDemo, 18000);
      timeoutsRef.current.push(reset);
    };

    runDemo();
    return clearAll;
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="demo-section py-20 sm:py-28 bg-white" id="features">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Demo card */}
          <div className="scroll-animate-scale transition-all duration-700 ease-out">
            <div className="bg-white rounded-2xl border border-gray-100/50 overflow-hidden shadow-[8px_8px_20px_rgba(0,0,0,0.06),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-1px_-1px_3px_rgba(0,0,0,0.03)]">
              {/* Game header */}
              <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 live-dot" />
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTime(timer)}
                  </span>
                </div>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  LIVE
                </span>
              </div>

              {/* Chip bank */}
              <div className="px-4 py-3 text-center bg-secondary/30">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Chip Bank
                </span>
                <p className="text-xl font-black text-[#EF6E59]">${chipBank}</p>
              </div>

              {/* Player list */}
              <div className="p-4 space-y-2 h-[200px] overflow-hidden">
                {players.map((player, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 animate-fade-in-up"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#EF6E59]/15 flex items-center justify-center text-[10px] font-bold text-[#EF6E59]">
                        {player.avatar}
                      </div>
                      <div>
                        <span className="text-xs font-medium text-foreground">
                          {player.name}
                        </span>
                        {player.status === "cashed_out" && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            (out)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-foreground">
                        ${player.chips}
                      </span>
                      {player.profit !== undefined && (
                        <span
                          className={cn(
                            "text-[10px] font-mono ml-1",
                            player.profit >= 0
                              ? "text-green-600"
                              : "text-red-500"
                          )}
                        >
                          {player.profit >= 0 ? "+" : ""}
                          {player.profit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Buy-in request popup - fixed height to prevent layout shift */}
              <div className="h-[56px]">
                {showRequest && !requestHandled && (
                  <div className="mx-4 p-3 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-amber-800">
                          Buy-in Request
                        </p>
                        <p className="text-[10px] text-amber-600">
                          Mike T. requests $20 re-buy
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cashout popup - fixed height to prevent layout shift */}
              <div className="h-[56px]">
                {showCashout && !cashoutSubmitted && (
                  <div className="mx-4 p-3 rounded-xl bg-violet-50 border border-violet-200 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <LogOut className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-violet-800">
                            Cash Out
                          </p>
                          <p className="text-[10px] text-violet-600">
                            Sarah K. — chips:{" "}
                            <span className="font-mono font-bold">
                              {cashoutChips}
                              <span className="inline-block w-px h-3 bg-violet-400 ml-px animate-pulse align-middle" />
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors",
                          cashoutChips === "28"
                            ? "bg-violet-600 text-white"
                            : "bg-violet-200 text-violet-400"
                        )}
                      >
                        Submit Cash Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Music bar - Coming Soon */}
              <div className="px-4 pb-3">
                <div className="relative rounded-xl bg-secondary/50 border border-border/20 p-2.5 overflow-hidden">
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <span className="text-[10px] font-semibold bg-[#EF6E59]/10 text-[#EF6E59] px-2.5 py-0.5 rounded-full border border-[#EF6E59]/20">
                      Coming Soon
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                    <Music className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate">
                        Poker Face — Lady Gaga
                      </p>
                    </div>
                    <Play className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div>
            <div className="scroll-animate-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF6E59]/10 text-[#EF6E59] text-sm font-medium mb-4">
                <Play className="w-4 h-4" />
                Live Game Mode
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Real-time game tracking
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Host starts the game, players join with one tap. Buy-in
                requests with approval, live chip tracking, and automatic
                calculations — all with precision and security.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#EF6E59]" />
                  Host controls: approve or reject buy-in requests
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#EF6E59]" />
                  Immutable ledger — no disputes, no edits
                </li>
              </ul>
              <Link to="/login">
                <Button className="bg-[#262626] text-white hover:bg-[#363636] rounded-full px-6">
                  Start a Live Game
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
