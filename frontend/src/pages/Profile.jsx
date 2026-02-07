import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  User, Mail, TrendingUp, TrendingDown, Trophy,
  DollarSign, Target, LogOut, ArrowLeft, Moon, Sun
} from "lucide-react";
import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    fetchData();
    // Get current theme
    const saved = localStorage.getItem("kvitt-theme");
    setIsDark(saved === "dark");
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("kvitt-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const fetchData = async () => {
    try {
      const [statsRes, balancesRes] = await Promise.all([
        axios.get(`${API}/stats/me`, { withCredentials: true }),
        axios.get(`${API}/ledger/balances`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setBalances(balancesRes.data);
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out");
      navigate("/");
    } catch (error) {
      navigate("/");
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        {/* Profile Card */}
        <Card className="bg-card border-border/50 mb-4 sm:mb-6" data-testid="profile-card">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="text-2xl sm:text-3xl">{user?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left flex-1">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold" data-testid="profile-name">{user?.name}</h1>
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1 text-sm sm:text-base">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
                {/* Compact badge display */}
                <div className="mt-3">
                  <UserBadges compact={true} />
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                data-testid="logout-btn"
                className="text-sm h-9 sm:h-10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card className="bg-card border-border/50 mb-4 sm:mb-6">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="font-heading text-base sm:text-xl font-bold">APPEARANCE</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm sm:text-base">Theme</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Choose light or dark mode</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 rounded-full p-1">
                <button
                  onClick={() => setIsDark(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    !isDark ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => setIsDark(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isDark ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Level & Badges Section */}
        <div className="mb-4 sm:mb-6">
          <UserBadges />
        </div>

        {/* Stats Grid - Horizontal scroll on mobile */}
        <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-3 sm:pb-0 snap-x snap-mandatory sm:snap-none scrollbar-hide">
          <Card className="bg-card border-border/50 flex-shrink-0 w-[140px] sm:w-auto snap-center">
            <CardContent className="p-4 sm:p-6 text-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-primary" />
              <p className="font-mono text-xl sm:text-2xl font-bold">{stats?.total_games || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Games Played</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 flex-shrink-0 w-[140px] sm:w-auto snap-center">
            <CardContent className="p-4 sm:p-6 text-center">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="font-mono text-xl sm:text-2xl font-bold">{stats?.win_rate?.toFixed(0) || 0}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 flex-shrink-0 w-[140px] sm:w-auto snap-center">
            <CardContent className="p-4 sm:p-6 text-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-primary" />
              <p className="font-mono text-xl sm:text-2xl font-bold text-primary">+${stats?.biggest_win?.toFixed(0) || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Best Win</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 flex-shrink-0 w-[140px] sm:w-auto snap-center">
            <CardContent className="p-4 sm:p-6 text-center">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-destructive" />
              <p className="font-mono text-xl sm:text-2xl font-bold text-destructive">${stats?.biggest_loss?.toFixed(0) || 0}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Worst Loss</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="bg-card border-border/50 mb-4 sm:mb-6" data-testid="financial-summary">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="font-heading text-base sm:text-xl font-bold">FINANCIAL SUMMARY</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="text-center p-4 sm:p-6 bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">Total Buy-Ins</p>
                <p className="font-mono text-xl sm:text-3xl font-bold">${stats?.total_buy_ins?.toFixed(0) || 0}</p>
              </div>
              <div className="text-center p-4 sm:p-6 bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">Total Winnings</p>
                <p className="font-mono text-xl sm:text-3xl font-bold">${stats?.total_winnings?.toFixed(0) || 0}</p>
              </div>
              <div className="text-center p-4 sm:p-6 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">Net Profit/Loss</p>
                <p className={`font-mono text-xl sm:text-3xl font-bold ${
                  (stats?.net_profit || 0) >= 0 ? 'text-primary' : 'text-destructive'
                }`}>
                  {(stats?.net_profit || 0) >= 0 ? '+' : ''}${stats?.net_profit?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Balances */}
        <Card className="bg-card border-border/50" data-testid="pending-balances">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="font-heading text-base sm:text-xl font-bold">PENDING BALANCES</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
              <div className="text-center p-4 sm:p-6 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">You Owe</p>
                <p className="font-mono text-xl sm:text-3xl font-bold text-destructive">
                  ${balances?.total_owes?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-center p-4 sm:p-6 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">Owed to You</p>
                <p className="font-mono text-xl sm:text-3xl font-bold text-primary">
                  ${balances?.total_owed?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            {/* Detailed list */}
            {(balances?.owes?.length > 0 || balances?.owed?.length > 0) ? (
              <div className="space-y-3 sm:space-y-4">
                {balances?.owes?.map(entry => (
                  <div key={entry.ledger_id} className="flex items-center justify-between p-2 sm:p-3 bg-destructive/5 rounded-lg">
                    <div>
                      <p className="font-medium text-sm sm:text-base">You owe {entry.to_user?.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">From recent game</p>
                    </div>
                    <span className="font-mono font-bold text-destructive text-sm sm:text-base">${entry.amount.toFixed(2)}</span>
                  </div>
                ))}
                {balances?.owed?.map(entry => (
                  <div key={entry.ledger_id} className="flex items-center justify-between p-2 sm:p-3 bg-primary/5 rounded-lg">
                    <div>
                      <p className="font-medium text-sm sm:text-base">{entry.from_user?.name} owes you</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">From recent game</p>
                    </div>
                    <span className="font-mono font-bold text-primary text-sm sm:text-base">${entry.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">No pending balances</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
