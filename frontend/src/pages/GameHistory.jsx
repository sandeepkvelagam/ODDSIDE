import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  History, Calendar, TrendingUp, TrendingDown, DollarSign,
  Users, Search, Filter, ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function GameHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [stats, setStats] = useState({
    totalGames: 0,
    totalWinnings: 0,
    totalLosses: 0,
    winRate: 0
  });

  useEffect(() => {
    // Only fetch when user is ready to prevent race conditions
    if (!user?.user_id) return;
    fetchGames();
  }, [user?.user_id]);

  useEffect(() => {
    filterAndSortGames();
  }, [games, searchTerm, statusFilter, sortBy]);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API}/users/game-history`, { withCredentials: true });
      setGames(response.data.games || []);
      setStats(response.data.stats || {
        totalGames: 0,
        totalWinnings: 0,
        totalLosses: 0,
        winRate: 0
      });
    } catch (error) {
      // If endpoint doesn't exist yet, show empty state
      console.log("Game history endpoint not available");
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortGames = () => {
    let result = [...games];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(game => 
        game.title?.toLowerCase().includes(term) ||
        game.group?.name?.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(game => game.status === statusFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "highest":
          return (b.net_result || 0) - (a.net_result || 0);
        case "lowest":
          return (a.net_result || 0) - (b.net_result || 0);
        default:
          return 0;
      }
    });
    
    setFilteredGames(result);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Game History
          </h1>
          <p className="text-muted-foreground mt-2">
            View all your past poker games and performance
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="font-mono text-2xl font-bold">{stats.totalGames}</p>
              <p className="text-xs text-muted-foreground">Total Games</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-500" />
              <p className="font-mono text-2xl font-bold text-green-600">+${stats.totalWinnings?.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Total Won</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-5 h-5 mx-auto mb-2 text-destructive" />
              <p className="font-mono text-2xl font-bold text-destructive">-${Math.abs(stats.totalLosses || 0).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total Lost</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="font-mono text-2xl font-bold">{stats.winRate?.toFixed(0) || 0}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search games or groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Win</SelectItem>
              <SelectItem value="lowest">Biggest Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-bold mb-2">No Games Found</h3>
              <p className="text-muted-foreground mb-6">
                {games.length === 0 
                  ? "You haven't played any games yet. Join a group and start a game!"
                  : "No games match your search criteria."
                }
              </p>
              <Button onClick={() => navigate('/groups')}>
                Browse Groups
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredGames.map((game) => (
              <Card 
                key={game.game_id}
                className="bg-card border-border/50 card-hover cursor-pointer"
                onClick={() => {
                  if (game.status === 'settled') {
                    navigate(`/games/${game.game_id}/settlement`);
                  } else {
                    navigate(`/games/${game.game_id}`);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        game.status === 'settled' ? 'bg-green-500' :
                        game.status === 'ended' ? 'bg-orange-500' :
                        game.status === 'active' ? 'bg-primary animate-pulse' :
                        'bg-muted-foreground'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{game.title || 'Game Night'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          {game.group?.name}
                          <span>•</span>
                          {new Date(game.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {game.status === 'settled' && game.net_result !== undefined && (
                        <div className="text-right">
                          <p className={`font-mono font-bold ${
                            game.net_result >= 0 ? 'text-green-600' : 'text-destructive'
                          }`}>
                            {game.net_result >= 0 ? '+' : ''}${game.net_result?.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Net Result</p>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
