import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Play, Square, DollarSign, Plus, Send, Clock,
  TrendingUp, TrendingDown, Users, MessageSquare,
  ArrowLeft, AlertTriangle, Coins, ChevronDown,
  HelpCircle, User, Crown, History, X
} from "lucide-react";
import Navbar from "@/components/Navbar";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Fixed denominations for buy-in
const BUY_IN_DENOMINATIONS = [5, 10, 20, 50, 100];

// Poker hand rankings image URL
const POKER_HANDS_IMAGE = "https://customer-assets.emergentagent.com/job_30a170f3-5b21-4a84-b0ae-a18078cd6b32/artifacts/lgrl939a_Poker-Hand-Rankings.webp";

export default function GameNight() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuyIn, setSelectedBuyIn] = useState(null);
  const [cashOutChips, setCashOutChips] = useState("");
  const [message, setMessage] = useState("");
  const [buyInDialogOpen, setBuyInDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [adminBuyInDialogOpen, setAdminBuyInDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("0:00:00");
  const [showHandRankings, setShowHandRankings] = useState(false);

  const fetchGame = useCallback(async () => {
    try {
      const [gameRes, threadRes] = await Promise.all([
        axios.get(`${API}/games/${gameId}`),
        axios.get(`${API}/games/${gameId}/thread`)
      ]);
      setGame(gameRes.data);
      setThread(threadRes.data);
      
      // Set default buy-in from game settings
      if (!selectedBuyIn && gameRes.data.buy_in_amount) {
        setSelectedBuyIn(gameRes.data.buy_in_amount);
      }
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/groups");
    } finally {
      setLoading(false);
    }
  }, [gameId, navigate, selectedBuyIn]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 10000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  // Game timer
  useEffect(() => {
    if (game?.status !== "active" || !game?.started_at) return;
    
    const updateTimer = () => {
      const start = new Date(game.started_at);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [game?.started_at, game?.status]);

  const handleStartGame = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/start`);
      toast.success("Game started!");
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start game");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndGame = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/end`);
      toast.success("Game ended!");
      setEndDialogOpen(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to end game");
    } finally {
      setSubmitting(false);
    }
  };

  // Admin buy-in for a specific player
  const handleAdminBuyIn = async (playerId, amount) => {
    if (!amount || amount <= 0) {
      toast.error("Select a valid amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/admin-buy-in`, { 
        user_id: playerId,
        amount: amount
      });
      toast.success(`Buy-in recorded!`);
      setAdminBuyInDialogOpen(false);
      setSelectedPlayer(null);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record buy-in");
    } finally {
      setSubmitting(false);
    }
  };

  // Regular user buy-in (if allowed or for self-request)
  const handleBuyIn = async (e) => {
    e.preventDefault();
    if (!selectedBuyIn || selectedBuyIn <= 0) {
      toast.error("Select a buy-in amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/buy-in`, { amount: selectedBuyIn });
      toast.success(`Bought in for $${selectedBuyIn}`);
      setBuyInDialogOpen(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to buy in");
    } finally {
      setSubmitting(false);
    }
  };

  // Cash out with chip count
  const handleCashOut = async (e) => {
    e.preventDefault();
    const chips = parseInt(cashOutChips);
    if (isNaN(chips) || chips < 0) {
      toast.error("Enter a valid chip count");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/cash-out`, { chips_returned: chips });
      toast.success(`Cashed out ${chips} chips`);
      setCashOutDialogOpen(false);
      setCashOutChips("");
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cash out");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    try {
      await axios.post(`${API}/games/${gameId}/thread`, { content: message });
      setMessage("");
      fetchGame();
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleJoinGame = async () => {
    try {
      await axios.post(`${API}/games/${gameId}/join`);
      toast.success("Joined game!");
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to join");
    }
  };

  const handleSettle = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/settle`);
      toast.success("Settlement generated!");
      navigate(`/games/${gameId}/settlement`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate settlement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isHost = game?.is_host;
  const currentPlayer = game?.current_player;
  const isActive = game?.status === "active";
  const isEnded = game?.status === "ended";
  const isScheduled = game?.status === "scheduled";
  const isSettled = game?.status === "settled";
  
  // Game settings
  const chipValue = game?.chip_value || 1;
  const chipsPerBuyIn = game?.chips_per_buy_in || 20;
  const defaultBuyIn = game?.buy_in_amount || 20;

  // Calculate totals
  const totalChipsDistributed = game?.total_chips_distributed || 0;
  const totalChipsReturned = game?.total_chips_returned || 0;
  const totalBuyIns = game?.players?.reduce((sum, p) => sum + (p.total_buy_in || 0), 0) || 0;
  const totalCashedOut = game?.players?.reduce((sum, p) => sum + (p.cash_out || 0), 0) || 0;

  // Count buy-ins for each player
  const getPlayerBuyInCount = (player) => {
    return player.transactions?.filter(t => t.type === "buy_in").length || 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Mobile-friendly header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button 
            onClick={() => navigate(`/groups/${game?.group_id}`)}
            className="flex items-center text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to {game?.group?.name}</span>
            <span className="sm:hidden">Back</span>
          </button>
          
          {/* Poker Hand Rankings Button */}
          <Sheet open={showHandRankings} onOpenChange={setShowHandRankings}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                data-testid="hand-rankings-btn"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Hand Rankings</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Poker Hand Rankings
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)]">
                <div className="p-4">
                  <img 
                    src={POKER_HANDS_IMAGE} 
                    alt="Poker Hand Rankings" 
                    className="w-full rounded-lg"
                  />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Game Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                  isActive ? 'bg-primary animate-pulse' :
                  isScheduled ? 'bg-yellow-500' :
                  isEnded ? 'bg-orange-500' :
                  'bg-muted-foreground'
                }`} />
                <h1 className="font-heading text-xl sm:text-2xl md:text-4xl font-bold tracking-tight" data-testid="game-title">
                  {game?.title || game?.group?.name || 'Game Night'}
                </h1>
              </div>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-500" />
                  {game?.host?.name} • {game?.status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          
          {/* Game Settings Info */}
          {isActive && (
            <div className="flex flex-wrap gap-2 text-xs md:text-sm">
              <span className="px-2 py-1 bg-secondary/50 rounded-full flex items-center gap-1">
                <Coins className="w-3 h-3" />
                ${defaultBuyIn} = {chipsPerBuyIn} chips
              </span>
              <span className="px-2 py-1 bg-secondary/50 rounded-full">
                ${chipValue.toFixed(2)}/chip
              </span>
            </div>
          )}
          
          {/* Host Controls */}
          {isHost && (
            <div className="flex flex-wrap gap-2 md:gap-3">
              {isScheduled && (
                <Button 
                  onClick={handleStartGame}
                  className="bg-primary text-black hover:bg-primary/90"
                  disabled={submitting}
                  data-testid="start-game-btn"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              )}
              {isActive && (
                <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" data-testid="end-game-trigger-btn">
                      <Square className="w-4 h-4 mr-2" />
                      End Game
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border mx-4">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-xl md:text-2xl font-bold">END GAME?</DialogTitle>
                      <DialogDescription>
                        Make sure all players have cashed out before ending.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setEndDialogOpen(false)}>Cancel</Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleEndGame}
                        disabled={submitting}
                        data-testid="confirm-end-game-btn"
                      >
                        End Game
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {isEnded && (
                <Button 
                  onClick={handleSettle}
                  className="bg-primary text-black hover:bg-primary/90"
                  disabled={submitting}
                  data-testid="settle-btn"
                >
                  Generate Settlement
                </Button>
              )}
            </div>
          )}
        </div>

        {isSettled && (
          <Card className="bg-card border-border/50 mb-6">
            <CardContent className="p-4 md:p-6 text-center">
              <p className="text-muted-foreground mb-4">This game has been settled.</p>
              <Button onClick={() => navigate(`/games/${gameId}/settlement`)}>
                View Settlement
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Game Stats - Mobile optimized */}
            {isActive && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
                <Card className="bg-card border-border/50" data-testid="timer-card">
                  <CardContent className="p-3 md:p-4 text-center">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-muted-foreground" />
                    <p className="font-mono text-lg md:text-2xl font-bold">{elapsedTime}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Duration</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-3 md:p-4 text-center">
                    <Users className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-muted-foreground" />
                    <p className="font-mono text-lg md:text-2xl font-bold">{game?.players?.length || 0}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Players</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50" data-testid="chip-bank-card">
                  <CardContent className="p-3 md:p-4 text-center">
                    <Coins className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-primary" />
                    <p className="font-mono text-lg md:text-2xl font-bold text-primary">{totalChipsDistributed}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Chips in Play</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-3 md:p-4 text-center">
                    <DollarSign className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-muted-foreground" />
                    <p className="font-mono text-lg md:text-2xl font-bold">${totalBuyIns.toFixed(0)}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Total Pot</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons - Host Only for Buy-ins */}
            {isActive && isHost && (
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30" data-testid="admin-action-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    HOST CONTROLS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-xs md:text-sm text-muted-foreground mb-3">
                    As host, you control all buy-ins. Select a player below to add chips.
                  </p>
                  <Button 
                    className="w-full h-12 md:h-16 text-base md:text-lg bg-primary text-black hover:bg-primary/90 font-bold"
                    onClick={() => setAdminBuyInDialogOpen(true)}
                    data-testid="admin-buy-in-trigger-btn"
                  >
                    <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                    ADD BUY-IN FOR PLAYER
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Player Cash Out (for non-hosts) */}
            {isActive && currentPlayer && !isHost && currentPlayer.cash_out === null && (
              <Card className="bg-card border-border/50" data-testid="player-action-card">
                <CardContent className="p-4 md:p-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Your chips</p>
                    <p className="font-mono text-3xl font-bold text-primary">{currentPlayer.total_chips || 0}</p>
                  </div>
                  <Dialog open={cashOutDialogOpen} onOpenChange={setCashOutDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="w-full h-12 md:h-16 text-base md:text-lg font-bold border-2"
                        data-testid="cash-out-trigger-btn"
                      >
                        <DollarSign className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                        CASH OUT
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border mx-4">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-xl md:text-2xl font-bold">CASH OUT</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCashOut} className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="cashOutChips">Chips to Return</Label>
                          <Input
                            id="cashOutChips"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Enter chip count"
                            data-testid="cash-out-chips-input"
                            value={cashOutChips}
                            onChange={(e) => setCashOutChips(e.target.value)}
                            className="bg-secondary/50 border-border text-xl md:text-2xl h-12 md:h-14 font-mono"
                            autoFocus
                          />
                        </div>
                        <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Your chips:</span>
                            <span className="font-mono">{currentPlayer.total_chips || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total buy-in:</span>
                            <span className="font-mono">${currentPlayer.total_buy_in || 0}</span>
                          </div>
                          {cashOutChips && (
                            <>
                              <div className="border-t border-border pt-2 flex justify-between text-sm">
                                <span className="text-muted-foreground">Cash value:</span>
                                <span className="font-mono">${(parseInt(cashOutChips) * chipValue).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold">
                                <span>Net result:</span>
                                <span className={`font-mono ${
                                  (parseInt(cashOutChips) * chipValue) >= (currentPlayer.total_buy_in || 0)
                                    ? 'text-primary' : 'text-destructive'
                                }`}>
                                  {(parseInt(cashOutChips) * chipValue) >= (currentPlayer.total_buy_in || 0) ? '+' : ''}
                                  ${((parseInt(cashOutChips) * chipValue) - (currentPlayer.total_buy_in || 0)).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-10 md:h-12 bg-primary text-black hover:bg-primary/90 font-bold"
                          disabled={submitting}
                          data-testid="confirm-cash-out-btn"
                        >
                          {submitting ? "Processing..." : "Confirm Cash Out"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {/* Not joined yet */}
            {isActive && !currentPlayer && (
              <Card className="bg-card border-primary/50 border-2">
                <CardContent className="p-4 md:p-6 text-center">
                  <p className="mb-4 text-sm md:text-base">You haven't joined this game yet.</p>
                  <Button 
                    onClick={handleJoinGame}
                    className="bg-primary text-black hover:bg-primary/90"
                    data-testid="join-game-btn"
                  >
                    Join Game
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Players List - Enhanced */}
            <Card className="bg-card border-border/50" data-testid="players-list">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg md:text-xl font-bold flex items-center justify-between">
                  <span>PLAYERS</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {game?.players?.length || 0} / 20
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {game?.players?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">No players yet</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {game?.players?.map(player => {
                      const buyInCount = getPlayerBuyInCount(player);
                      const isCurrentUser = player.user_id === user?.user_id;
                      
                      return (
                        <div 
                          key={player.player_id}
                          className={`p-3 md:p-4 rounded-lg ${
                            isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'
                          }`}
                          data-testid={`player-${player.user_id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                              <Avatar className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                                <AvatarImage src={player.user?.picture} />
                                <AvatarFallback className="text-xs md:text-sm">{player.user?.name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate">
                                  {player.user?.name || 'Unknown'}
                                  {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                                  {player.user_id === game?.host_id && (
                                    <Crown className="w-3 h-3 text-yellow-500 inline ml-1" />
                                  )}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    {player.total_chips || 0} chips
                                  </span>
                                  <span>•</span>
                                  <span>${player.total_buy_in || 0}</span>
                                  <span>•</span>
                                  <span>{buyInCount}x buy-in</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {player.cash_out !== null ? (
                                <div className="text-right">
                                  <p className={`font-mono text-sm md:text-base font-bold ${
                                    player.net_result >= 0 ? 'text-primary' : 'text-destructive'
                                  }`}>
                                    {player.net_result >= 0 ? '+' : ''}${player.net_result?.toFixed(0)}
                                  </p>
                                  <p className="text-[10px] md:text-xs text-muted-foreground">Cashed out</p>
                                </div>
                              ) : isHost && isActive ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setSelectedPlayer(player);
                                    setAdminBuyInDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          
                          {/* Transaction History (expandable on click) */}
                          {player.transactions && player.transactions.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-[10px] md:text-xs text-muted-foreground cursor-pointer hover:text-white">
                                <History className="w-3 h-3 inline mr-1" />
                                View {player.transactions.length} transaction(s)
                              </summary>
                              <div className="mt-2 pl-2 border-l-2 border-border space-y-1">
                                {player.transactions.map((txn, idx) => (
                                  <div key={idx} className="text-[10px] md:text-xs flex justify-between">
                                    <span className={txn.type === 'buy_in' ? 'text-primary' : 'text-muted-foreground'}>
                                      {txn.type === 'buy_in' ? '+ Buy-in' : '- Cash out'}
                                    </span>
                                    <span className="font-mono">
                                      ${txn.amount} ({txn.chips} chips)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Game Thread */}
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-card border-border/50" data-testid="game-thread">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg md:text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                  GAME THREAD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60 md:h-80 overflow-y-auto space-y-2 md:space-y-3 mb-4">
                  {thread.length === 0 ? (
                    <p className="text-muted-foreground text-center text-xs md:text-sm py-4">
                      No messages yet
                    </p>
                  ) : (
                    thread.map(msg => (
                      <div 
                        key={msg.message_id}
                        className={`p-2 md:p-3 rounded-lg ${
                          msg.type === 'system' 
                            ? 'bg-primary/10 text-center text-xs md:text-sm' 
                            : 'bg-secondary/30'
                        }`}
                      >
                        {msg.type === 'user' && (
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-5 h-5 md:w-6 md:h-6">
                              <AvatarImage src={msg.user?.picture} />
                              <AvatarFallback className="text-[10px]">{msg.user?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs md:text-sm font-medium truncate">{msg.user?.name}</span>
                            <span className="text-[10px] md:text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <p className={`text-xs md:text-sm ${msg.type === 'system' ? 'text-primary' : ''}`}>
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                
                {!isSettled && (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-secondary/50 border-border text-sm"
                      data-testid="thread-message-input"
                    />
                    <Button type="submit" size="icon" className="bg-primary text-black hover:bg-primary/90 flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Admin Buy-In Dialog */}
        <Dialog open={adminBuyInDialogOpen} onOpenChange={setAdminBuyInDialogOpen}>
          <DialogContent className="bg-card border-border mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl md:text-2xl font-bold">ADD BUY-IN</DialogTitle>
              <DialogDescription>
                Select a player and buy-in amount
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Player Selection */}
              <div>
                <Label>Select Player</Label>
                <Select 
                  value={selectedPlayer?.user_id || ""} 
                  onValueChange={(val) => {
                    const player = game?.players?.find(p => p.user_id === val);
                    setSelectedPlayer(player);
                  }}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Choose a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {game?.players?.filter(p => p.cash_out === null).map(player => (
                      <SelectItem key={player.user_id} value={player.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={player.user?.picture} />
                            <AvatarFallback>{player.user?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {player.user?.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buy-in Amount Selection - Fixed Denominations */}
              <div>
                <Label>Buy-In Amount</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                  {BUY_IN_DENOMINATIONS.map(amount => (
                    <Button
                      key={amount}
                      type="button"
                      variant={selectedBuyIn === amount ? "default" : "outline"}
                      className={`h-12 font-mono font-bold ${
                        selectedBuyIn === amount ? 'bg-primary text-black' : ''
                      }`}
                      onClick={() => setSelectedBuyIn(amount)}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Default: ${defaultBuyIn} = {chipsPerBuyIn} chips
                </p>
              </div>

              {/* Preview */}
              {selectedPlayer && selectedBuyIn && (
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Player:</span>{" "}
                    <span className="font-medium">{selectedPlayer.user?.name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    <span className="font-mono">${selectedBuyIn}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Chips:</span>{" "}
                    <span className="font-mono">{Math.round((selectedBuyIn / defaultBuyIn) * chipsPerBuyIn)}</span>
                  </p>
                </div>
              )}

              <Button 
                className="w-full h-12 bg-primary text-black hover:bg-primary/90 font-bold"
                disabled={!selectedPlayer || !selectedBuyIn || submitting}
                onClick={() => handleAdminBuyIn(selectedPlayer?.user_id, selectedBuyIn)}
                data-testid="confirm-admin-buy-in-btn"
              >
                {submitting ? "Processing..." : "Confirm Buy-In"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
