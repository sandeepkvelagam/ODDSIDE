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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Play, Square, DollarSign, Plus, Send, Clock,
  TrendingUp, TrendingDown, Users, MessageSquare,
  ArrowLeft, AlertTriangle
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function GameNight() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyInAmount, setBuyInAmount] = useState("");
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [message, setMessage] = useState("");
  const [buyInDialogOpen, setBuyInDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("0:00:00");

  const fetchGame = useCallback(async () => {
    try {
      const [gameRes, threadRes] = await Promise.all([
        axios.get(`${API}/games/${gameId}`),
        axios.get(`${API}/games/${gameId}/thread`)
      ]);
      setGame(gameRes.data);
      setThread(threadRes.data);
      
      // Set default buy-in amount
      if (!buyInAmount && gameRes.data.group?.default_buy_in) {
        setBuyInAmount(gameRes.data.group.default_buy_in.toString());
      }
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/groups");
    } finally {
      setLoading(false);
    }
  }, [gameId, navigate, buyInAmount]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 10000); // Refresh every 10s
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

  const handleBuyIn = async (e) => {
    e.preventDefault();
    const amount = parseFloat(buyInAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/buy-in`, { amount });
      toast.success(`Bought in for $${amount}`);
      setBuyInDialogOpen(false);
      fetchGame();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to buy in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashOut = async (e) => {
    e.preventDefault();
    const amount = parseFloat(cashOutAmount);
    if (amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/games/${gameId}/cash-out`, { amount });
      toast.success(`Cashed out $${amount}`);
      setCashOutDialogOpen(false);
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

  // Calculate chip bank total
  const totalChipsInPlay = game?.players?.reduce((sum, p) => sum + (p.total_buy_in || 0), 0) || 0;
  const totalCashedOut = game?.players?.reduce((sum, p) => sum + (p.cash_out || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate(`/groups/${game?.group_id}`)}
          className="flex items-center text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {game?.group?.name}
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isActive ? 'bg-primary animate-pulse' :
                isScheduled ? 'bg-yellow-500' :
                isEnded ? 'bg-orange-500' :
                'bg-muted-foreground'
              }`} />
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight" data-testid="game-title">
                {game?.title || game?.group?.name || 'Game Night'}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Hosted by {game?.host?.name} • {game?.status?.toUpperCase()}
            </p>
          </div>
          
          {/* Host Controls */}
          {isHost && (
            <div className="flex gap-3">
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
                    <Button variant="destructive" data-testid="end-game-trigger-btn">
                      <Square className="w-4 h-4 mr-2" />
                      End Game
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl font-bold">END GAME?</DialogTitle>
                      <DialogDescription>
                        Make sure all players have cashed out before ending.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
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
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">This game has been settled.</p>
              <Button onClick={() => navigate(`/games/${gameId}/settlement`)}>
                View Settlement
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Stats */}
            {isActive && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border/50" data-testid="timer-card">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-mono text-2xl font-bold">{elapsedTime}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-mono text-2xl font-bold">{game?.players?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Players</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50" data-testid="chip-bank-card">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="font-mono text-2xl font-bold text-primary">${totalChipsInPlay.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Chip Bank</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-mono text-2xl font-bold">${totalCashedOut.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Cashed Out</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons (30-second rule - big, prominent) */}
            {isActive && (
              <Card className="bg-card border-border/50" data-testid="action-card">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Dialog open={buyInDialogOpen} onOpenChange={setBuyInDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="h-16 text-lg bg-primary text-black hover:bg-primary/90 font-bold"
                          data-testid="buy-in-trigger-btn"
                        >
                          <Plus className="w-6 h-6 mr-2" />
                          BUY IN
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-2xl font-bold">BUY IN</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleBuyIn} className="space-y-4 mt-4">
                          <div>
                            <Label htmlFor="buyInAmount">Amount ($)</Label>
                            <Input
                              id="buyInAmount"
                              type="number"
                              min="1"
                              step="0.01"
                              data-testid="buy-in-amount-input"
                              value={buyInAmount}
                              onChange={(e) => setBuyInAmount(e.target.value)}
                              className="bg-secondary/50 border-border text-2xl h-14 font-mono"
                              autoFocus
                            />
                          </div>
                          {currentPlayer && (
                            <p className="text-sm text-muted-foreground">
                              Current buy-in: ${currentPlayer.total_buy_in || 0}
                            </p>
                          )}
                          <Button 
                            type="submit" 
                            className="w-full h-12 bg-primary text-black hover:bg-primary/90 font-bold"
                            disabled={submitting}
                            data-testid="confirm-buy-in-btn"
                          >
                            {submitting ? "Processing..." : "Confirm Buy-In"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={cashOutDialogOpen} onOpenChange={setCashOutDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="h-16 text-lg font-bold border-2"
                          data-testid="cash-out-trigger-btn"
                        >
                          <DollarSign className="w-6 h-6 mr-2" />
                          CASH OUT
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-2xl font-bold">CASH OUT</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCashOut} className="space-y-4 mt-4">
                          <div>
                            <Label htmlFor="cashOutAmount">Final Stack ($)</Label>
                            <Input
                              id="cashOutAmount"
                              type="number"
                              min="0"
                              step="0.01"
                              data-testid="cash-out-amount-input"
                              value={cashOutAmount}
                              onChange={(e) => setCashOutAmount(e.target.value)}
                              className="bg-secondary/50 border-border text-2xl h-14 font-mono"
                              autoFocus
                            />
                          </div>
                          {currentPlayer && (
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                Total buy-in: ${currentPlayer.total_buy_in || 0}
                              </p>
                              {cashOutAmount && (
                                <p className={`text-sm font-medium ${
                                  parseFloat(cashOutAmount) >= (currentPlayer.total_buy_in || 0) 
                                    ? 'text-primary' : 'text-destructive'
                                }`}>
                                  Net: {parseFloat(cashOutAmount) >= (currentPlayer.total_buy_in || 0) ? '+' : ''}
                                  ${(parseFloat(cashOutAmount || 0) - (currentPlayer.total_buy_in || 0)).toFixed(2)}
                                </p>
                              )}
                            </div>
                          )}
                          <Button 
                            type="submit" 
                            className="w-full h-12 bg-primary text-black hover:bg-primary/90 font-bold"
                            disabled={submitting}
                            data-testid="confirm-cash-out-btn"
                          >
                            {submitting ? "Processing..." : "Confirm Cash Out"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Not joined yet */}
            {isActive && !currentPlayer && (
              <Card className="bg-card border-primary/50 border-2">
                <CardContent className="p-6 text-center">
                  <p className="mb-4">You haven't joined this game yet.</p>
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

            {/* Players List */}
            <Card className="bg-card border-border/50" data-testid="players-list">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold">PLAYERS</CardTitle>
              </CardHeader>
              <CardContent>
                {game?.players?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No players yet</p>
                ) : (
                  <div className="space-y-3">
                    {game?.players?.map(player => (
                      <div 
                        key={player.player_id}
                        className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                        data-testid={`player-${player.user_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={player.user?.picture} />
                            <AvatarFallback>{player.user?.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {player.user?.name || 'Unknown'}
                              {player.user_id === user?.user_id && " (You)"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Buy-in: ${player.total_buy_in || 0}
                            </p>
                          </div>
                        </div>
                        {player.cash_out !== null && (
                          <div className="text-right">
                            <p className={`font-mono font-bold ${
                              player.net_result >= 0 ? 'text-primary' : 'text-destructive'
                            }`}>
                              {player.net_result >= 0 ? '+' : ''}{player.net_result?.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">Cashed out</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Game Thread */}
          <div className="space-y-6">
            <Card className="bg-card border-border/50" data-testid="game-thread">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  GAME THREAD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 overflow-y-auto space-y-3 mb-4">
                  {thread.length === 0 ? (
                    <p className="text-muted-foreground text-center text-sm py-4">
                      No messages yet
                    </p>
                  ) : (
                    thread.map(msg => (
                      <div 
                        key={msg.message_id}
                        className={`p-3 rounded-lg ${
                          msg.type === 'system' 
                            ? 'bg-primary/10 text-center text-sm' 
                            : 'bg-secondary/30'
                        }`}
                      >
                        {msg.type === 'user' && (
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={msg.user?.picture} />
                              <AvatarFallback>{msg.user?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{msg.user?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <p className={msg.type === 'system' ? 'text-primary' : ''}>
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
                      className="bg-secondary/50 border-border"
                      data-testid="thread-message-input"
                    />
                    <Button type="submit" size="icon" className="bg-primary text-black hover:bg-primary/90">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
