import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Users, Play, Plus, Settings, Trophy, UserPlus,
  ChevronRight, Calendar, Crown, ArrowLeft
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function GroupHub() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [gameTitle, setGameTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/groups/${groupId}/invite`, { email: inviteEmail });
      toast.success("Member invited!");
      setInviteDialogOpen(false);
      setInviteEmail("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to invite member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/games`, {
        group_id: groupId,
        title: gameTitle || null
      });
      toast.success("Game started!");
      setGameDialogOpen(false);
      setGameTitle("");
      navigate(`/games/${response.data.game_id}`);
    } catch (error) {
      toast.error("Failed to start game");
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

  const isAdmin = group?.user_role === "admin";

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
                <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full uppercase">
                  Admin
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{group?.description || "No description"}</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="invite-member-btn">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl font-bold">INVITE MEMBER</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="invite-email-input"
                      placeholder="friend@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-secondary/50 border-border"
                      autoFocus
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    They must have a PokerNight account with this email.
                  </p>
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-black hover:bg-primary/90"
                    disabled={submitting}
                    data-testid="submit-invite-btn"
                  >
                    {submitting ? "Inviting..." : "Send Invite"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

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
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                      className="bg-secondary/50 border-border"
                      autoFocus
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Default buy-in: ${group?.default_buy_in || 20}
                  </p>
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-black hover:bg-primary/90"
                    disabled={submitting}
                    data-testid="submit-start-game-btn"
                  >
                    {submitting ? "Starting..." : "Start Now"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Games */}
            <Card className="bg-card border-border/50" data-testid="games-list">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold">GAMES</CardTitle>
              </CardHeader>
              <CardContent>
                {games.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    No games yet. Start the first one!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {games.map(game => (
                      <div
                        key={game.game_id}
                        className="p-4 bg-secondary/30 rounded-lg cursor-pointer card-hover border border-transparent"
                        onClick={() => navigate(
                          game.status === 'settled' 
                            ? `/games/${game.game_id}/settlement` 
                            : `/games/${game.game_id}`
                        )}
                        data-testid={`game-row-${game.game_id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              game.status === 'active' ? 'bg-primary animate-pulse' :
                              game.status === 'scheduled' ? 'bg-yellow-500' :
                              game.status === 'ended' ? 'bg-orange-500' :
                              'bg-muted-foreground'
                            }`} />
                            <div>
                              <p className="font-medium">{game.title || 'Untitled Game'}</p>
                              <p className="text-sm text-muted-foreground">
                                {game.player_count} players • {game.status}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            {stats?.leaderboard?.length > 0 && (
              <Card className="bg-card border-border/50" data-testid="leaderboard">
                <CardHeader>
                  <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    LEADERBOARD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.leaderboard.map((entry, idx) => (
                      <div
                        key={entry.user_id}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-black' :
                            idx === 1 ? 'bg-gray-400 text-black' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={entry.user?.picture} />
                            <AvatarFallback>{entry.user?.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{entry.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{entry.total_games} games</p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${
                          entry.total_profit >= 0 ? 'text-primary' : 'text-destructive'
                        }`}>
                          {entry.total_profit >= 0 ? '+' : ''}{entry.total_profit.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <Card className="bg-card border-border/50" data-testid="members-list">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold">MEMBERS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group?.members?.map(member => (
                    <div key={member.member_id} className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.user?.picture} />
                        <AvatarFallback>{member.user?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          {member.user?.name || 'Unknown'}
                          {member.role === 'admin' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Group Info */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-heading text-xl font-bold">INFO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default Buy-In</span>
                  <span className="font-mono">${group?.default_buy_in || 20}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{group?.currency || 'USD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Games</span>
                  <span>{stats?.total_games || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
