import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  TrendingUp, TrendingDown, DollarSign, Trophy, 
  Users, Play, Bell, LogOut, Plus, ChevronRight,
  Wallet, Target, Clock
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, groupsRes, gamesRes, balancesRes] = await Promise.all([
        axios.get(`${API}/stats/me`),
        axios.get(`${API}/groups`),
        axios.get(`${API}/games`),
        axios.get(`${API}/ledger/balances`)
      ]);
      
      setStats(statsRes.data);
      setGroups(groupsRes.data);
      setActiveGames(gamesRes.data.filter(g => g.status === "active" || g.status === "scheduled"));
      setBalances(balancesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight" data-testid="welcome-heading">
            Welcome back, {user?.name?.split(' ')[0] || 'Player'}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your poker overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Net Profit - Large Card */}
          <Card className="md:col-span-4 bg-card border-border/50" data-testid="net-profit-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground text-sm">Net Profit</span>
                {stats?.net_profit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-primary" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
              </div>
              <p className={`font-heading text-4xl font-black ${stats?.net_profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {stats?.net_profit >= 0 ? '+' : ''}{stats?.net_profit?.toFixed(2) || '0.00'}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                {stats?.total_games || 0} games played
              </p>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="md:col-span-4 bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground text-sm">Win Rate</span>
                <Target className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-heading text-4xl font-black">
                {stats?.win_rate?.toFixed(0) || 0}%
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Best: +${stats?.biggest_win?.toFixed(0) || 0} / Worst: ${stats?.biggest_loss?.toFixed(0) || 0}
              </p>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className="md:col-span-4 bg-card border-border/50" data-testid="balance-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground text-sm">Balance</span>
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className={`font-heading text-4xl font-black ${balances?.net_balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {balances?.net_balance >= 0 ? '+' : ''}{balances?.net_balance?.toFixed(2) || '0.00'}
              </p>
              <div className="text-sm mt-2 space-y-1">
                <p className="text-muted-foreground">You owe: <span className="text-destructive">${balances?.total_owes?.toFixed(2) || '0.00'}</span></p>
                <p className="text-muted-foreground">Owed to you: <span className="text-primary">${balances?.total_owed?.toFixed(2) || '0.00'}</span></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Games & Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Games */}
          <Card className="bg-card border-border/50" data-testid="active-games-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-heading text-xl font-bold">ACTIVE GAMES</CardTitle>
              <Play className="w-5 h-5 text-primary animate-pulse-live" />
            </CardHeader>
            <CardContent>
              {activeGames.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No active games right now</p>
              ) : (
                <div className="space-y-3">
                  {activeGames.slice(0, 3).map(game => (
                    <div 
                      key={game.game_id}
                      className="p-4 bg-secondary/30 rounded-lg cursor-pointer card-hover border border-transparent"
                      onClick={() => navigate(`/games/${game.game_id}`)}
                      data-testid={`game-${game.game_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{game.title || game.group_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {game.player_count} players • {game.status === 'active' ? 'Live' : 'Scheduled'}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/groups')}
                data-testid="view-all-games-btn"
              >
                View All Games
              </Button>
            </CardContent>
          </Card>

          {/* My Groups */}
          <Card className="bg-card border-border/50" data-testid="groups-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-heading text-xl font-bold">MY GROUPS</CardTitle>
              <Users className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No groups yet. Create one to get started!</p>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 3).map(group => (
                    <div 
                      key={group.group_id}
                      className="p-4 bg-secondary/30 rounded-lg cursor-pointer card-hover border border-transparent"
                      onClick={() => navigate(`/groups/${group.group_id}`)}
                      data-testid={`group-${group.group_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {group.member_count} members • {group.user_role}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                className="w-full mt-4 bg-primary text-black hover:bg-primary/90"
                onClick={() => navigate('/groups')}
                data-testid="manage-groups-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Manage Groups
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Games */}
        {stats?.recent_games?.length > 0 && (
          <Card className="bg-card border-border/50 mt-6" data-testid="recent-games-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl font-bold">RECENT RESULTS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recent_games.map((game, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{game.group_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {game.date ? new Date(game.date).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    <span className={`font-mono font-bold ${game.net_result >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {game.net_result >= 0 ? '+' : ''}{game.net_result.toFixed(2)}
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
