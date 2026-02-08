import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Users, Play, Plus, Trophy, Crown, ArrowLeft, Shield, User, DollarSign, Coins
} from "lucide-react";
import Navbar from "@/components/Navbar";
import InviteMembers from "@/components/InviteMembers";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const BUY_IN_OPTIONS = [5, 10, 20, 50, 100];
const CHIP_OPTIONS = [10, 20, 50, 100];

export default function GroupHub() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Game creation form - NOW includes buy-in settings
  const [gameForm, setGameForm] = useState({
    title: "",
    buy_in_amount: 20,
    chips_per_buy_in: 20
  });

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      const [groupRes, gamesRes, statsRes] = await Promise.all([
        axios.get(`${API}/groups/${groupId}`),
        axios.get(`${API}/games?group_id=${groupId}`),
        axios.get(`${API}/stats/group/${groupId}`)
      ]);
      setGroup(groupRes.data);
      setGames(gamesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Failed to load group");
      navigate("/groups");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/games`, {
        group_id: groupId,
        title: gameForm.title || null,
        buy_in_amount: gameForm.buy_in_amount,
        chips_per_buy_in: gameForm.chips_per_buy_in
      });
      toast.success("Game started!");
      setGameDialogOpen(false);
      setGameForm({ title: "", buy_in_amount: 20, chips_per_buy_in: 20 });
      navigate(`/games/${response.data.game_id}`);
    } catch (error) {
      toast.error("Failed to start game");
    } finally {
      setSubmitting(false);
    }
  };

  // Get role badge
  const getRoleBadge = (member) => {
    if (member.role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
          <Crown className="w-2.5 h-2.5" /> Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-full">
        <User className="w-2.5 h-2.5" /> Member
      </span>
    );
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

  const isAdmin = group?.user_role === "admin";
  const chipValue = gameForm.buy_in_amount / gameForm.chips_per_buy_in;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate('/groups')}
          className="flex items-center text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight" data-testid="group-name">
                {group?.name}
              </h1>
              {isAdmin && (
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-full uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{group?.description || "No description"}</p>
          </div>
          
          <div className="flex gap-3">
            <InviteMembers groupId={groupId} onInviteSent={fetchData} />

            <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-black hover:bg-primary/90" data-testid="start-game-btn">
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl font-bold">START GAME NIGHT</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleStartGame} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Game Title (optional)</Label>
                    <Input
                      id="title"
                      data-testid="game-title-input"
                      placeholder="Friday Night Showdown"
                      value={gameForm.title}
                      onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
                      className="bg-secondary/50 border-border"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for a random fun name!
                    </p>
                  </div>
                  
                  {/* Buy-in Settings */}
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Game Settings
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="buy_in">Buy-In Amount ($)</Label>
                        <Select
                          value={gameForm.buy_in_amount.toString()}
                          onValueChange={(value) => setGameForm({ ...gameForm, buy_in_amount: parseFloat(value) })}
                        >
                          <SelectTrigger className="bg-secondary/50 border-border">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUY_IN_OPTIONS.map((amount) => (
                              <SelectItem key={amount} value={amount.toString()}>
                                ${amount}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="chips">Chips per Buy-In</Label>
                        <Select
                          value={gameForm.chips_per_buy_in.toString()}
                          onValueChange={(value) => setGameForm({ ...gameForm, chips_per_buy_in: parseInt(value) })}
                        >
                          <SelectTrigger className="bg-secondary/50 border-border">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {CHIP_OPTIONS.map((chips) => (
                              <SelectItem key={chips} value={chips.toString()}>
                                {chips} chips
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Chip Value:</span>
                        <span className="font-mono font-bold text-primary">${chipValue.toFixed(2)} per chip</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        All buy-ins in this game will use this denomination
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-black hover:bg-primary/90"
                    disabled={submitting}
                    data-testid="confirm-start-game-btn"
                  >
                    {submitting ? "Starting..." : "Start Game"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Members & Games */}
          <div className="lg:col-span-2 space-y-6">
            {/* Members */}
            <Card className="bg-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  MEMBERS ({group?.members?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group?.members?.map(member => (
                  <div key={member.user_id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.picture} />
                        <AvatarFallback>{member.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {getRoleBadge(member)}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  GAMES
                </CardTitle>
              </CardHeader>
              <CardContent>
                {games.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No games yet. Start your first game!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {games.map(game => (
                      <div 
                        key={game.game_id}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => navigate(`/games/${game.game_id}`)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${game.status === 'active' ? 'bg-primary animate-pulse' : game.status === 'ended' ? 'bg-orange-500' : 'bg-muted-foreground'}`} />
                            <p className="font-medium">{game.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {game.player_count} players • {game.status}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-secondary rounded-full">
                          {game.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  LEADERBOARD
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.leaderboard?.length > 0 ? (
                  <div className="space-y-2">
                    {stats.leaderboard.map((entry, idx) => (
                      <div key={entry.user_id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-black' :
                            idx === 1 ? 'bg-gray-400 text-black' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-sm">{entry.name}</span>
                        </div>
                        <span className={`font-mono text-sm font-bold ${
                          entry.net_profit >= 0 ? 'text-primary' : 'text-destructive'
                        }`}>
                          {entry.net_profit >= 0 ? '+' : ''}{entry.net_profit?.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    Play games to see rankings!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
