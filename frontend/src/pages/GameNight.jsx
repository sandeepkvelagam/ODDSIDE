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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Play, Square, DollarSign, Plus, Send, Clock,
  Users, MessageSquare, ArrowLeft, Coins, User,
  HelpCircle, Crown, History, Hand, LogOut, CheckCircle, Wifi, WifiOff
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useGameSocket } from "@/hooks/useGameSocket";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import PokerAIAssistant from "@/components/PokerAIAssistant";

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
  const [requestBuyInDialogOpen, setRequestBuyInDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [adminBuyInDialogOpen, setAdminBuyInDialogOpen] = useState(false);
  const [adminCashOutDialogOpen, setAdminCashOutDialogOpen] = useState(false);
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [adminCashOutChips, setAdminCashOutChips] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("0:00:00");
  const [showHandRankings, setShowHandRankings] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  // WebSocket for real-time updates
  const { isConnected, on } = useGameSocket(gameId);

  // Listen for real-time game updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on('*', (event) => {
      // Refresh game data on any update
      if (['player_joined', 'buy_in', 'cash_out', 'chips_edited', 'game_state'].includes(event.type)) {
        fetchGame();
        if (event.type !== 'message') {
          toast.info(`${event.player_name || 'Game'}: ${event.type.replace(/_/g, ' ')}`);
        }
      }
      // Add new messages to thread
      if (event.type === 'message') {
        setThread(prev => [...prev, {
          content: event.content,
          user: { name: event.sender_name },
          type: event.message_type,
          created_at: event.timestamp
        }]);
      }
    });

    return unsubscribe;
  }, [isConnected, on]);

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
      
      // Get pending join requests for host
      if (gameRes.data.is_host) {
        const pending = gameRes.data.players?.filter(p => p.rsvp_status === "pending") || [];
        setPendingRequests(pending);
      }
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/groups");
    } finally {
      setLoading(false);
    }
  }, [gameId, navigate, selectedBuyIn]);

  // Fetch available players for adding
  const fetchAvailablePlayers = async () => {
    try {
      const response = await axios.get(`${API}/games/${gameId}/available-players`);
      setAvailablePlayers(response.data);
    } catch (error) {
      toast.error("Failed to load available players");
    }
  };

  // Search users by email/name
  const searchPlayers = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setPlayerSearchResults([]);
      return;
    }
    setSearchingPlayers(true);
    try {
      const response = await axios.get(`${API}/users/search?query=${encodeURIComponent(searchQuery)}`);
      // Filter out players already in game
      const currentPlayerIds = game?.players?.map(p => p.user_id) || [];
      const filtered = response.data.filter(u => !currentPlayerIds.includes(u.user_id));
      setPlayerSearchResults(filtered);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearchingPlayers(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (playerSearchQuery) {
        searchPlayers(playerSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [playerSearchQuery]);

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

  // Add player to game
  const handleAddPlayer = async (playerId) => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/add-player`, { user_id: playerId });
      toast.success("Player added!");
      setAddPlayerDialogOpen(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add player");
    } finally {
      setSubmitting(false);
    }
  };

  // Approve join request
  const handleApproveJoin = async (playerId, playerName) => {
    try {
      await axios.post(`${API}/games/${gameId}/approve-join`, { user_id: playerId });
      toast.success(`${playerName} approved!`);
      fetchGame();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  // Reject join request
  const handleRejectJoin = async (playerId) => {
    try {
      await axios.post(`${API}/games/${gameId}/reject-join`, { user_id: playerId });
      toast.success("Request rejected");
      fetchGame();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  // Player requests buy-in (notifies host)
  const handleRequestBuyIn = async () => {
    if (!selectedBuyIn || selectedBuyIn <= 0) {
      toast.error("Select a buy-in amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/request-buy-in`, { amount: selectedBuyIn });
      toast.success(`Buy-in request sent to host!`);
      setRequestBuyInDialogOpen(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to request buy-in");
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

  // Player cash out (sends notification to admin for approval)
  const handlePlayerCashOut = async (e) => {
    e.preventDefault();
    const chips = parseInt(cashOutChips);
    if (isNaN(chips) || chips < 0) {
      toast.error("Enter a valid chip count");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/request-cash-out`, { chips_count: chips });
      toast.success(`Cash-out request sent to host for approval!`);
      setCashOutDialogOpen(false);
      setCashOutChips("");
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to request cash-out");
    } finally {
      setSubmitting(false);
    }
  };

  // Admin cash out for any player
  const handleAdminCashOut = async () => {
    if (!selectedPlayer) {
      toast.error("Select a player");
      return;
    }
    const chips = parseInt(adminCashOutChips);
    if (isNaN(chips) || chips < 0) {
      toast.error("Enter a valid chip count");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/admin-cash-out`, { 
        user_id: selectedPlayer.user_id,
        chips_count: chips
      });
      toast.success(`Cash-out recorded for ${selectedPlayer.user?.name}!`);
      setAdminCashOutDialogOpen(false);
      setAdminCashOutChips("");
      setSelectedPlayer(null);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cash out player");
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
  const totalBuyIns = game?.players?.reduce((sum, p) => sum + (p.total_buy_in || 0), 0) || 0;
  
  // Check if all players cashed out
  const allPlayersCashedOut = game?.players?.every(p => p.cashed_out === true) || false;
  const playersNotCashedOut = game?.players?.filter(p => !p.cashed_out) || [];

  // Count buy-ins for each player
  const getPlayerBuyInCount = (player) => {
    return player.buy_in_count || 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Mobile-friendly header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button 
            onClick={() => navigate(`/groups/${game?.group_id}`)}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to {game?.group?.name}</span>
            <span className="sm:hidden">Back</span>
          </button>
          
          {/* Poker Hand Rankings Button */}
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>
            
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
              {/* AI Poker Assistant */}
              <PokerAIAssistant gameId={gameId} />
            </div>
          )}
          
          {/* Host Controls */}
          {isHost && (
            <div className="flex flex-wrap gap-2 md:gap-3">
              {isScheduled && (
                <Button 
                  onClick={handleStartGame}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                        {!allPlayersCashedOut ? (
                          <span className="text-destructive">
                            ⚠️ {playersNotCashedOut.length} player(s) haven't cashed out yet: {playersNotCashedOut.map(p => p.user?.name).join(", ")}
                          </span>
                        ) : (
                          "All players have cashed out. Ready to settle."
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setEndDialogOpen(false)}>Cancel</Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleEndGame}
                        disabled={submitting || !allPlayersCashedOut}
                        data-testid="confirm-end-game-btn"
                      >
                        {allPlayersCashedOut ? "End Game" : "Cash out all players first"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {isEnded && (
                <Button 
                  onClick={handleSettle}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
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

            {/* Host Controls Card - ONLY for hosts */}
            {isActive && isHost && (
              <Card className="bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30" data-testid="admin-action-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    HOST CONTROLS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                  {/* Pending Join Requests */}
                  {pendingRequests.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-yellow-500 mb-2">PENDING REQUESTS ({pendingRequests.length})</p>
                      <div className="space-y-2">
                        {pendingRequests.map(player => (
                          <div key={player.user_id} className="flex items-center justify-between bg-background/50 p-2 rounded">
                            <span className="text-sm">{player.user?.name || 'Unknown'}</span>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                className="h-7 text-xs bg-primary text-black"
                                onClick={() => handleApproveJoin(player.user_id, player.user?.name)}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => handleRejectJoin(player.user_id)}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                      onClick={() => setAdminBuyInDialogOpen(true)}
                      data-testid="admin-buy-in-trigger-btn"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Buy-In</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12 font-bold"
                      onClick={() => setAdminCashOutDialogOpen(true)}
                      data-testid="admin-cash-out-trigger-btn"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Cash Out</span>
                    </Button>
                    <Dialog open={addPlayerDialogOpen} onOpenChange={(open) => {
                      setAddPlayerDialogOpen(open);
                      if (open) {
                        fetchAvailablePlayers();
                        setPlayerSearchQuery("");
                        setPlayerSearchResults([]);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="secondary"
                          className="h-12 font-bold"
                        >
                          <Users className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Add Player</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-xl font-bold">ADD PLAYER</DialogTitle>
                          <DialogDescription>
                            Search by email or name to add anyone to the game
                          </DialogDescription>
                        </DialogHeader>
                        
                        {/* Search Input */}
                        <div className="relative">
                          <Input
                            placeholder="Search by email or name..."
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="bg-secondary/50 border-border"
                          />
                          {searchingPlayers && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {/* Search Results */}
                          {playerSearchQuery && playerSearchResults.length > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground font-semibold px-1">SEARCH RESULTS</p>
                              {playerSearchResults.map(player => (
                                <div 
                                  key={player.user_id}
                                  className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={player.picture} />
                                      <AvatarFallback>{player.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm">{player.name}</p>
                                      <p className="text-xs text-muted-foreground">{player.email}</p>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm"
                                    className="bg-primary text-black"
                                    onClick={() => handleAddPlayer(player.user_id)}
                                    disabled={submitting}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </>
                          )}
                          
                          {playerSearchQuery && playerSearchResults.length === 0 && !searchingPlayers && (
                            <p className="text-muted-foreground text-center py-4 text-sm">
                              No users found matching "{playerSearchQuery}"
                            </p>
                          )}
                          
                          {/* Group Members */}
                          {availablePlayers.length > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground font-semibold px-1 mt-2">GROUP MEMBERS</p>
                              {availablePlayers.map(player => (
                                <div 
                                  key={player.user_id}
                                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={player.picture} />
                                      <AvatarFallback>{player.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm">{player.name}</p>
                                      <p className="text-xs text-muted-foreground">{player.email}</p>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddPlayer(player.user_id)}
                                    disabled={submitting}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </>
                          )}
                          
                          {!playerSearchQuery && availablePlayers.length === 0 && (
                            <p className="text-muted-foreground text-center py-4 text-sm">
                              Search by email to add anyone to this game
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Player Actions Card - ONLY for non-host players who haven't cashed out */}
            {isActive && currentPlayer && !currentPlayer.cashed_out && !isHost && (
              <Card className="bg-card border-border/50" data-testid="player-action-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base font-bold">YOUR GAME</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Your Chips</p>
                      <p className="font-mono text-xl md:text-2xl font-bold text-primary">{currentPlayer.total_chips || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Buy-ins</p>
                      <p className="font-mono text-xl md:text-2xl font-bold">{currentPlayer.buy_in_count || 0}x</p>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Total In</p>
                      <p className="font-mono text-xl md:text-2xl font-bold">${currentPlayer.total_buy_in || 0}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Request Buy-In Button */}
                    <Dialog open={requestBuyInDialogOpen} onOpenChange={setRequestBuyInDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="h-12 font-bold"
                          data-testid="request-buy-in-btn"
                        >
                          <Hand className="w-4 h-4 mr-2" />
                          Request Buy-In
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border mx-4">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-xl font-bold">REQUEST BUY-IN</DialogTitle>
                          <DialogDescription>
                            Select amount to request. Host will be notified.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {BUY_IN_DENOMINATIONS.map(amount => (
                              <Button
                                key={amount}
                                type="button"
                                variant={selectedBuyIn === amount ? "default" : "outline"}
                                className={`h-12 font-mono font-bold ${
                                  selectedBuyIn === amount ? 'bg-primary text-primary-foreground' : ''
                                }`}
                                onClick={() => setSelectedBuyIn(amount)}
                              >
                                ${amount}
                              </Button>
                            ))}
                          </div>
                          <Button 
                            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                            disabled={!selectedBuyIn || submitting}
                            onClick={handleRequestBuyIn}
                            data-testid="confirm-request-buy-in-btn"
                          >
                            {submitting ? "Requesting..." : `Request $${selectedBuyIn || 0} Buy-In`}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Cash Out Button */}
                    <Dialog open={cashOutDialogOpen} onOpenChange={setCashOutDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                          data-testid="cash-out-trigger-btn"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Cash Out
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border mx-4">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-xl font-bold">CASH OUT</DialogTitle>
                          <DialogDescription>
                            Enter your remaining chip count. Host will verify.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handlePlayerCashOut} className="space-y-4 mt-4">
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
                                      ? 'text-green-600' : 'text-destructive'
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
                            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                            disabled={submitting || !cashOutChips}
                            data-testid="confirm-cash-out-btn"
                          >
                            {submitting ? "Requesting..." : "Request Cash Out"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Already cashed out message */}
            {isActive && currentPlayer?.cashed_out && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 md:p-6 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-bold text-green-700 dark:text-green-400">You've cashed out!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Final chips: {currentPlayer.chips_returned} • Net: {currentPlayer.net_result >= 0 ? '+' : ''}${currentPlayer.net_result?.toFixed(2)}
                  </p>
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="join-game-btn"
                  >
                    Join Game
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Players List */}
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
                            player.cashed_out 
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                              : isCurrentUser 
                                ? 'bg-primary/10 border border-primary/30' 
                                : 'bg-secondary/30'
                          }`}
                          data-testid={`player-${player.user_id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                              <Avatar className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                                <AvatarFallback className="text-xs md:text-sm">{player.user?.name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm md:text-base truncate">
                                  {player.user?.name || 'Unknown'}
                                  {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                                </p>
                                <div className="flex items-center gap-1">
                                  {player.user_id === game?.host_id && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
                                      <Crown className="w-2.5 h-2.5" /> Host
                                    </span>
                                  )}
                                  {player.user_id !== game?.host_id && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-full">
                                      <User className="w-2.5 h-2.5" /> Player
                                    </span>
                                  )}
                                  {player.cashed_out && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    {player.cashed_out ? player.chips_returned : player.total_chips || 0} chips
                                  </span>
                                  <span>•</span>
                                  <span>${player.total_buy_in || 0}</span>
                                  <span>•</span>
                                  <span>{buyInCount}x buy-in</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {player.cashed_out ? (
                                <div className="text-right">
                                  <p className={`font-mono text-sm md:text-base font-bold ${
                                    player.net_result >= 0 ? 'text-green-600' : 'text-destructive'
                                  }`}>
                                    {player.net_result >= 0 ? '+' : ''}${player.net_result?.toFixed(0)}
                                  </p>
                                  <p className="text-[10px] md:text-xs text-green-600">Cashed out</p>
                                </div>
                              ) : isHost && isActive ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      setAdminBuyInDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      setAdminCashOutChips(String(player.total_chips || 0));
                                      setAdminCashOutDialogOpen(true);
                                    }}
                                  >
                                    <LogOut className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          
                          {/* Transaction History */}
                          {player.transactions && player.transactions.length > 0 && (
                            <details className="mt-2">
                              <summary className="text-[10px] md:text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                <History className="w-3 h-3 inline mr-1" />
                                View {player.transactions.length} transaction(s)
                              </summary>
                              <div className="mt-2 pl-2 border-l-2 border-border space-y-1">
                                {player.transactions.map((txn, idx) => (
                                  <div key={idx} className="text-[10px] md:text-xs flex justify-between">
                                    <span className={txn.type === 'buy_in' ? 'text-primary' : 'text-green-600'}>
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

          {/* Sidebar - Spotify Player & Game Thread */}
          <div className="space-y-4 md:space-y-6">
            {/* Spotify Player - Host Only */}
            <SpotifyPlayer isHost={isHost} />
            
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
                    <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0">
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
                    {game?.players?.filter(p => !p.cashed_out).map(player => (
                      <SelectItem key={player.user_id} value={player.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback>{player.user?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {player.user?.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buy-in Amount Selection */}
              <div>
                <Label>Buy-In Amount</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                  {BUY_IN_DENOMINATIONS.map(amount => (
                    <Button
                      key={amount}
                      type="button"
                      variant={selectedBuyIn === amount ? "default" : "outline"}
                      className={`h-12 font-mono font-bold ${
                        selectedBuyIn === amount ? 'bg-primary text-primary-foreground' : ''
                      }`}
                      onClick={() => setSelectedBuyIn(amount)}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
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
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                disabled={!selectedPlayer || !selectedBuyIn || submitting}
                onClick={() => handleAdminBuyIn(selectedPlayer?.user_id, selectedBuyIn)}
                data-testid="confirm-admin-buy-in-btn"
              >
                {submitting ? "Processing..." : "Confirm Buy-In"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Admin Cash-Out Dialog */}
        <Dialog open={adminCashOutDialogOpen} onOpenChange={setAdminCashOutDialogOpen}>
          <DialogContent className="bg-card border-border mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl md:text-2xl font-bold">CASH OUT PLAYER</DialogTitle>
              <DialogDescription>
                Enter chip count. Player will be notified.
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
                    setAdminCashOutChips(String(player?.total_chips || 0));
                  }}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Choose a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {game?.players?.filter(p => !p.cashed_out).map(player => (
                      <SelectItem key={player.user_id} value={player.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback>{player.user?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {player.user?.name} ({player.total_chips} chips)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chip Count */}
              <div>
                <Label htmlFor="adminCashOutChips">Chips to Return</Label>
                <Input
                  id="adminCashOutChips"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Enter chip count"
                  value={adminCashOutChips}
                  onChange={(e) => setAdminCashOutChips(e.target.value)}
                  className="bg-secondary/50 border-border text-xl h-12 font-mono"
                />
              </div>

              {/* Preview */}
              {selectedPlayer && adminCashOutChips && (
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Player:</span>{" "}
                    <span className="font-medium">{selectedPlayer.user?.name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Cash value:</span>{" "}
                    <span className="font-mono">${(parseInt(adminCashOutChips) * chipValue).toFixed(2)}</span>
                  </p>
                  <p className="text-sm font-bold">
                    <span className="text-muted-foreground">Net result:</span>{" "}
                    <span className={`font-mono ${
                      (parseInt(adminCashOutChips) * chipValue) >= (selectedPlayer.total_buy_in || 0)
                        ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {(parseInt(adminCashOutChips) * chipValue) >= (selectedPlayer.total_buy_in || 0) ? '+' : ''}
                      ${((parseInt(adminCashOutChips) * chipValue) - (selectedPlayer.total_buy_in || 0)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              <Button 
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                disabled={!selectedPlayer || !adminCashOutChips || submitting}
                onClick={handleAdminCashOut}
                data-testid="confirm-admin-cash-out-btn"
              >
                {submitting ? "Processing..." : "Confirm Cash Out"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
