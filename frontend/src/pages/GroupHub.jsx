import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Users, Play, Plus, Trophy, Crown, ArrowLeft, Shield, User, DollarSign, Coins, UserMinus, LogOut
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
  const [removeMemberDialog, setRemoveMemberDialog] = useState(null);
  const [leaveGroupDialog, setLeaveGroupDialog] = useState(false);
  const [transferAdminDialog, setTransferAdminDialog] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [smartDefaults, setSmartDefaults] = useState(null);
  
  // Game creation form - NOW includes buy-in settings
  const [gameForm, setGameForm] = useState({
    title: "",
    buy_in_amount: 20,
    chips_per_buy_in: 20
  });
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      const [groupRes, gamesRes, statsRes, defaultsRes] = await Promise.all([
        axios.get(`${API}/groups/${groupId}`),
        axios.get(`${API}/games?group_id=${groupId}`),
        axios.get(`${API}/stats/group/${groupId}`),
        axios.get(`${API}/groups/${groupId}/smart-defaults`).catch(() => ({ data: null }))
      ]);
      setGroup(groupRes.data);
      setGames(gamesRes.data);
      setStats(statsRes.data);
      
      // Apply smart defaults if available
      if (defaultsRes.data && defaultsRes.data.games_analyzed > 0) {
        setSmartDefaults(defaultsRes.data);
        setGameForm(prev => ({
          ...prev,
          buy_in_amount: defaultsRes.data.buy_in_amount,
          chips_per_buy_in: defaultsRes.data.chips_per_buy_in
        }));
      }
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
        chips_per_buy_in: gameForm.chips_per_buy_in,
        initial_players: selectedMembers.length > 0 ? selectedMembers : null
      });
      toast.success("Game started!");
      setGameDialogOpen(false);
      setGameForm({ title: "", buy_in_amount: smartDefaults?.buy_in_amount || 20, chips_per_buy_in: smartDefaults?.chips_per_buy_in || 20 });
      setSelectedMembers([]);
      navigate(`/games/${response.data.game_id}`);
    } catch (error) {
      toast.error("Failed to start game");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle member selection for game start
  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Get other members (excluding current user)
  const otherMembers = group?.members?.filter(m => m.user_id !== user?.user_id) || [];

  // Request to join a game
  const handleRequestJoin = async (gameId) => {
    try {
      const response = await axios.post(`${API}/games/${gameId}/join`);
      if (response.data.status === 'pending') {
        toast.success("Join request sent to host!");
      } else if (response.data.status === 'joined') {
        toast.success("You're already in this game!");
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to request join");
    }
  };

  // Remove member from group (admin only)
  const handleRemoveMember = async (memberId) => {
    try {
      await axios.delete(`${API}/groups/${groupId}/members/${memberId}`);
      toast.success("Member removed from group");
      setRemoveMemberDialog(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove member");
    }
  };

  // Leave group (self)
  const handleLeaveGroup = async () => {
    try {
      await axios.delete(`${API}/groups/${groupId}/members/${user?.user_id}`);
      toast.success("You have left the group");
      navigate("/groups");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to leave group");
    }
  };

  // Transfer admin (admin only)
  const handleTransferAdmin = async () => {
    if (!selectedNewAdmin) {
      toast.error("Please select a new admin");
      return;
    }
    try {
      const response = await axios.put(`${API}/groups/${groupId}/transfer-admin`, {
        new_admin_id: selectedNewAdmin
      });
      toast.success(response.data.message || "Admin role transferred successfully");
      setTransferAdminDialog(false);
      setSelectedNewAdmin(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to transfer admin");
    }
  };

  // Check if member is in active game (can't be removed)
  const isMemberInActiveGame = (memberId) => {
    return games.some(game => 
      game.status === 'active' && 
      game.players?.some(p => p.user_id === memberId && !p.cashed_out)
    );
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
                      {smartDefaults?.games_analyzed > 0 && (
                        <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          Based on {smartDefaults.games_analyzed} games
                        </span>
                      )}
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

                  {/* Member Selection */}
                  {otherMembers.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4" /> Add Players
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {selectedMembers.length} of {otherMembers.length} selected
                        </span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {otherMembers.map((member) => (
                          <label
                            key={member.user_id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(member.user_id)}
                              onChange={() => toggleMemberSelection(member.user_id)}
                              className="w-4 h-4 rounded border-border accent-primary"
                            />
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={member.user?.picture} />
                              <AvatarFallback className="text-[10px] bg-secondary">
                                {member.user?.name?.substring(0, 2).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.user?.name || "Unknown"}</span>
                          </label>
                        ))}
                      </div>
                      {selectedMembers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Selected players will join with ${gameForm.buy_in_amount} ({gameForm.chips_per_buy_in} chips)
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setSelectedMembers(otherMembers.map(m => m.user_id))}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setSelectedMembers([])}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                  )}

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
                <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  MEMBERS ({group?.members?.length || 0})
                </CardTitle>
                <div className="flex gap-2">
                  {/* Transfer Admin Button (for admins) */}
                  {isAdmin && group?.members?.length > 1 && (
                    <Dialog open={transferAdminDialog} onOpenChange={setTransferAdminDialog}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" /> Transfer Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle>Transfer Admin Role</DialogTitle>
                          <DialogDescription>
                            Select a member to promote to admin. You will become a regular member.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {group?.members
                            ?.filter(m => m.user_id !== user?.user_id && m.role !== "admin")
                            .map(member => {
                              const inActiveGame = isMemberInActiveGame(member.user_id);
                              return (
                                <div
                                  key={member.user_id}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                    selectedNewAdmin === member.user_id
                                      ? 'border-primary bg-primary/10'
                                      : 'border-border bg-secondary/20 hover:border-primary/50'
                                  } ${inActiveGame ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  onClick={() => !inActiveGame && setSelectedNewAdmin(member.user_id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={member.user?.picture} />
                                      <AvatarFallback>{member.user?.name?.[0] || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">{member.user?.name || 'Unknown'}</p>
                                      <p className="text-[10px] text-muted-foreground">{member.user?.email}</p>
                                    </div>
                                  </div>
                                  {inActiveGame && (
                                    <span className="text-[10px] text-yellow-500">In game</span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setTransferAdminDialog(false); setSelectedNewAdmin(null); }}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleTransferAdmin}
                            disabled={!selectedNewAdmin}
                            className="bg-primary text-black hover:bg-primary/90"
                          >
                            Transfer Admin
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {/* Leave Group Button (for non-admins) */}
                  {!isAdmin && (
                    <Dialog open={leaveGroupDialog} onOpenChange={setLeaveGroupDialog}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                          <LogOut className="w-3 h-3 mr-1" /> Leave
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle>Leave Group?</DialogTitle>
                          <DialogDescription>
                            Your game history and stats will be preserved, but you'll no longer have access to this group.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setLeaveGroupDialog(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleLeaveGroup}>Leave Group</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {group?.members?.map(member => {
                  const inActiveGame = isMemberInActiveGame(member.user_id);
                  const isCurrentUser = member.user_id === user?.user_id;
                  const canRemove = isAdmin && !isCurrentUser && member.role !== "admin" && !inActiveGame;
                  
                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.user?.picture} />
                          <AvatarFallback className="text-xs">{member.user?.name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium">{member.user?.name || 'Unknown'}</p>
                            {getRoleBadge(member)}
                            {isCurrentUser && <span className="text-[10px] text-muted-foreground">(you)</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{member.user?.email}</p>
                        </div>
                      </div>
                      
                      {/* Admin Remove Button */}
                      {canRemove && (
                        <Dialog open={removeMemberDialog === member.user_id} onOpenChange={(open) => setRemoveMemberDialog(open ? member.user_id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                              <UserMinus className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border">
                            <DialogHeader>
                              <DialogTitle>Remove {member.user?.name}?</DialogTitle>
                              <DialogDescription>
                                This member will be removed from the group. Their game history will be preserved.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRemoveMemberDialog(null)}>Cancel</Button>
                              <Button variant="destructive" onClick={() => handleRemoveMember(member.user_id)}>Remove</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {/* Show why can't remove */}
                      {isAdmin && !isCurrentUser && member.role !== "admin" && inActiveGame && (
                        <span className="text-[10px] text-yellow-500">In active game</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  GAMES
                </CardTitle>
              </CardHeader>
              <CardContent>
                {games.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    No games yet. Start your first game!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {games.map(game => (
                      <div 
                        key={game.game_id}
                        className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
                      >
                        <div 
                          className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/games/${game.game_id}`)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${game.status === 'active' ? 'bg-primary animate-pulse' : game.status === 'ended' ? 'bg-orange-500' : 'bg-muted-foreground'}`} />
                            <p className="text-sm font-medium">{game.title}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground ml-4">
                            {game.player_count} players • {game.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {game.status === 'active' && !game.is_player && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-primary text-black hover:bg-primary/90 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestJoin(game.game_id);
                              }}
                              data-testid={`request-join-${game.game_id}`}
                            >
                              Join
                            </Button>
                          )}
                          {game.is_player && game.rsvp_status === 'pending' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
                              Pending
                            </span>
                          )}
                          {game.is_player && game.rsvp_status === 'yes' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">
                              Joined
                            </span>
                          )}
                          {!game.is_player && game.status !== 'active' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded-full">
                              {game.status}
                            </span>
                          )}
                        </div>
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
                <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  LEADERBOARD
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.leaderboard?.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.leaderboard.map((entry, idx) => (
                      <div key={entry.user_id} className="flex items-center justify-between p-1.5 rounded-lg bg-secondary/20">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-black' :
                            idx === 1 ? 'bg-gray-400 text-black' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={entry.user?.picture} />
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                              {entry.user?.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{entry.user?.name || 'Unknown'}</span>
                        </div>
                        <span className={`font-mono text-xs font-bold ${
                          entry.total_profit >= 0 ? 'text-primary' : 'text-destructive'
                        }`}>
                          {entry.total_profit >= 0 ? '+' : ''}${entry.total_profit?.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-xs">
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
