import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Users, Play, Plus, ChevronRight,
  Wallet, Target, Crown, UserPlus, DollarSign, HelpCircle,
  BarChart3, Trophy, Percent, Flame, Activity
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PendingInvites from "@/components/PendingInvites";
import OnboardingGuide, { useOnboarding } from "@/components/OnboardingGuide";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showOnboarding, completeOnboarding, resetOnboarding } = useOnboarding();
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  useEffect(() => {
    // Only fetch data when user is ready to prevent race conditions
    if (user?.user_id) {
      fetchData();
    }
  }, [user?.user_id]);

  const fetchData = async () => {
    try {
      const [statsRes, groupsRes, gamesRes, balancesRes] = await Promise.all([
        axios.get(`${API}/stats/me`).catch((err) => {
          console.error('Stats API error:', err.response?.status, err.response?.data);
          return { data: {} };
        }),
        axios.get(`${API}/groups`).catch((err) => {
          console.error('Groups API error:', err.response?.status, err.response?.data);
          if (err.response?.status === 401) {
            toast.error("Session expired. Please log in again.");
          }
          return { data: [] };
        }),
        axios.get(`${API}/games`).catch((err) => {
          console.error('Games API error:', err.response?.status, err.response?.data);
          return { data: [] };
        }),
        axios.get(`${API}/ledger/balances`).catch((err) => {
          console.error('Balances API error:', err.response?.status, err.response?.data);
          return { data: {} };
        })
      ]);

      console.log('Dashboard data loaded:', {
        groupsCount: groupsRes.data?.length,
        groups: groupsRes.data,
        statsGames: statsRes.data?.total_games
      });

      setStats(statsRes.data);
      setGroups(groupsRes.data || []);
      setActiveGames((gamesRes.data || []).filter(g => g.status === "active" || g.status === "scheduled"));
      setBalances(balancesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <OnboardingGuide onComplete={completeOnboarding} />
      </div>
    );
  }

  const handleJoinGame = async (gameId, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API}/games/${gameId}/join`);
      toast.success("Join request sent!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to join");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Switch to Redesign toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <button
          onClick={() => navigate('/dashboard-redesign')}
          className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
        >
          Try new design →
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" data-testid="welcome-heading">
              Welcome back, {user?.name?.split(' ')[0] || 'Player'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Here's your poker overview</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetOnboarding()}
            className="text-xs text-muted-foreground"
            title="Show getting started guide"
          >
            <HelpCircle className="w-4 h-4 mr-1" /> Help
          </Button>
        </div>

        {/* Pending Invites */}
        <PendingInvites />

        {/* Stats Grid - 3 cols on mobile (smaller), 3 on desktop */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-6">
          {/* Net Profit */}
          <Card className="bg-card border-border/50" data-testid="net-profit-card">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <span className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">Net Profit</span>
                {(stats?.net_profit || 0) >= 0 ? (
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                ) : (
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-destructive" />
                )}
              </div>
              <p className={`font-heading text-lg sm:text-2xl md:text-4xl font-black ${(stats?.net_profit || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {(stats?.net_profit || 0) >= 0 ? '+' : ''}{(stats?.net_profit || 0).toFixed(0)}
              </p>
              <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm mt-1">
                {stats?.total_games || 0} games
              </p>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <span className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">Win Rate</span>
                <Target className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <p className="font-heading text-lg sm:text-2xl md:text-4xl font-black">
                {(stats?.win_rate || 0).toFixed(0)}%
              </p>
              <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm mt-1 hidden sm:block">
                Best: +${(stats?.biggest_win || 0).toFixed(0)}
              </p>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className="bg-card border-border/50" data-testid="balance-card">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <span className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">Balance</span>
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <p className={`font-heading text-lg sm:text-2xl md:text-4xl font-black ${(balances?.net_balance || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {(balances?.net_balance || 0) >= 0 ? '+' : ''}{(balances?.net_balance || 0).toFixed(0)}
              </p>
              <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm mt-1">
                <span className="text-destructive">${(balances?.total_owes || 0).toFixed(0)}</span> owed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Game Performance Stats - Compact */}
        {stats?.total_games > 0 && (
          <Card className="bg-card border-border/50 mb-4 sm:mb-6">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-3 sm:px-6 sm:py-3">
              <CardTitle className="font-heading text-sm sm:text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                PERFORMANCE
              </CardTitle>
              <span className="text-[10px] sm:text-xs text-muted-foreground">{stats.total_games} games</span>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 pt-0">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {/* Win/Loss */}
                <div className="text-center p-2 bg-secondary/30 rounded-lg">
                  <p className="font-heading text-sm sm:text-lg font-bold">
                    <span className="text-primary">{Math.round((stats.win_rate / 100) * stats.total_games)}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-destructive">{stats.total_games - Math.round((stats.win_rate / 100) * stats.total_games)}</span>
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">W/L</p>
                </div>

                {/* Avg/Game */}
                <div className="text-center p-2 bg-secondary/30 rounded-lg">
                  <p className={`font-heading text-sm sm:text-lg font-bold ${(stats.net_profit / stats.total_games) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {(stats.net_profit / stats.total_games) >= 0 ? '+' : ''}${(stats.net_profit / stats.total_games).toFixed(0)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Avg</p>
                </div>

                {/* Best */}
                <div className="text-center p-2 bg-secondary/30 rounded-lg">
                  <p className="font-heading text-sm sm:text-lg font-bold text-primary">
                    +${(stats.biggest_win || 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Best</p>
                </div>

                {/* Worst */}
                <div className="text-center p-2 bg-secondary/30 rounded-lg">
                  <p className="font-heading text-sm sm:text-lg font-bold text-destructive">
                    ${(stats.biggest_loss || 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Worst</p>
                </div>
              </div>

              {/* ROI - Simplified */}
              <div className="mt-2 sm:mt-3 flex items-center gap-2 text-[10px] sm:text-xs">
                <span className="text-muted-foreground">ROI:</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stats.total_buy_ins > 0 && ((stats.net_profit / stats.total_buy_ins) * 100) >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(Math.abs(stats.total_buy_ins > 0 ? ((stats.net_profit / stats.total_buy_ins) * 100) : 0), 100)}%` }}
                  />
                </div>
                <span className={`font-mono font-bold ${stats.total_buy_ins > 0 && ((stats.net_profit / stats.total_buy_ins) * 100) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {stats.total_buy_ins > 0 ? ((stats.net_profit / stats.total_buy_ins) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Games & Groups - Stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Active Games - Enhanced */}
          <Card className="bg-card border-border/50" data-testid="active-games-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="font-heading text-base sm:text-xl font-bold">LIVE GAMES</CardTitle>
              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse-live" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4">
              {activeGames.length === 0 ? (
                <p className="text-muted-foreground text-xs sm:text-sm py-4">No active games right now</p>
              ) : (
                <div className="space-y-3">
                  {activeGames.slice(0, 3).map(game => {
                    const isHost = game.host_id === user?.user_id;
                    const isPlayer = game.is_player;
                    
                    return (
                      <div 
                        key={game.game_id}
                        className="p-3 bg-secondary/30 rounded-lg border border-transparent hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${game.status === 'active' ? 'bg-primary animate-pulse' : 'bg-yellow-500'}`} />
                              <p className="font-medium text-sm">{game.title || game.group_name}</p>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Crown className="w-3 h-3 text-yellow-500" />
                              <span>{game.host_name || 'Host'}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${game.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'}`}>
                            {game.status === 'active' ? 'LIVE' : 'SCHEDULED'}
                          </span>
                        </div>
                        
                        {/* Game details */}
                        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs mb-3">
                          <span className="px-2 py-0.5 bg-secondary rounded-full flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {game.player_count || 0} players
                          </span>
                          <span className="px-2 py-0.5 bg-secondary rounded-full flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${game.buy_in_amount || 20} buy-in
                          </span>
                          <span className="px-2 py-0.5 bg-secondary rounded-full">
                            ${game.total_pot || 0} pot
                          </span>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {isHost ? (
                            <>
                              <Button 
                                size="sm" 
                                className="flex-1 h-8 text-xs bg-primary text-black hover:bg-primary/90"
                                onClick={() => navigate(`/games/${game.game_id}`)}
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Add Players
                              </Button>
                            </>
                          ) : isPlayer ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1 h-8 text-xs"
                              onClick={() => navigate(`/games/${game.game_id}`)}
                            >
                              Open Game
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              className="flex-1 h-8 text-xs bg-primary text-black hover:bg-primary/90"
                              onClick={(e) => handleJoinGame(game.game_id, e)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Request to Join
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => navigate(`/games/${game.game_id}`)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4 text-xs sm:text-sm h-9"
                onClick={() => navigate('/groups')}
              >
                View All Games
              </Button>
            </CardContent>
          </Card>

          {/* My Groups */}
          <Card className="bg-card border-border/50" data-testid="groups-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
              <CardTitle className="font-heading text-base sm:text-xl font-bold">MY GROUPS</CardTitle>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4">
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-xs sm:text-sm py-4">No groups yet. Create one!</p>
              ) : (
                <div className="space-y-2">
                  {groups.slice(0, 3).map(group => (
                    <div 
                      key={group.group_id}
                      className="p-3 bg-secondary/30 rounded-lg cursor-pointer card-hover border border-transparent"
                      onClick={() => navigate(`/groups/${group.group_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{group.name}</p>
                            {group.user_role === 'admin' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {group.member_count} members
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                className="w-full mt-4 bg-primary text-black hover:bg-primary/90 text-xs sm:text-sm h-9"
                onClick={() => navigate('/groups')}
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Manage Groups
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Games */}
        {stats?.recent_games?.length > 0 && (
          <Card className="bg-card border-border/50 mt-4 sm:mt-6" data-testid="recent-games-card">
            <CardHeader className="px-4 sm:px-6 py-3">
              <CardTitle className="font-heading text-base sm:text-xl font-bold">RECENT RESULTS</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4">
              <div className="space-y-2">
                {stats.recent_games.map((game, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 sm:p-3 bg-secondary/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{game.group_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {game.date ? new Date(game.date).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    <span className={`font-mono font-bold text-sm ${game.net_result >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {game.net_result >= 0 ? '+' : ''}{game.net_result.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
