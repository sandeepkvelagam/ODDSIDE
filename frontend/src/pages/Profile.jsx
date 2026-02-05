import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  User, Mail, TrendingUp, TrendingDown, Trophy,
  DollarSign, Target, LogOut, ArrowLeft
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, balancesRes] = await Promise.all([
        axios.get(`${API}/stats/me`),
        axios.get(`${API}/ledger/balances`)
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
      await axios.post(`${API}/auth/logout`);
      toast.success("Logged out");
      navigate("/");
    } catch (error) {
      // Still navigate even if API fails
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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        {/* Profile Card */}
        <Card className="bg-card border-border/50 mb-6" data-testid="profile-card">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="text-3xl">{user?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left flex-1">
                <h1 className="font-heading text-3xl font-bold" data-testid="profile-name">{user?.name}</h1>
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="font-mono text-2xl font-bold">{stats?.total_games || 0}</p>
              <p className="text-xs text-muted-foreground">Games Played</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="font-mono text-2xl font-bold">{stats?.win_rate?.toFixed(0) || 0}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="font-mono text-2xl font-bold text-primary">+${stats?.biggest_win?.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Best Win</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 text-center">
              <TrendingDown className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="font-mono text-2xl font-bold text-destructive">${stats?.biggest_loss?.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Worst Loss</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="bg-card border-border/50 mb-6" data-testid="financial-summary">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold">FINANCIAL SUMMARY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground text-sm mb-2">Total Buy-Ins</p>
                <p className="font-mono text-3xl font-bold">${stats?.total_buy_ins?.toFixed(0) || 0}</p>
              </div>
              <div className="text-center p-6 bg-secondary/30 rounded-lg">
                <p className="text-muted-foreground text-sm mb-2">Total Winnings</p>
                <p className="font-mono text-3xl font-bold">${stats?.total_winnings?.toFixed(0) || 0}</p>
              </div>
              <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-muted-foreground text-sm mb-2">Net Profit/Loss</p>
                <p className={`font-mono text-3xl font-bold ${
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
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold">PENDING BALANCES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="text-center p-6 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-muted-foreground text-sm mb-2">You Owe</p>
                <p className="font-mono text-3xl font-bold text-destructive">
                  ${balances?.total_owes?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-muted-foreground text-sm mb-2">Owed to You</p>
                <p className="font-mono text-3xl font-bold text-primary">
                  ${balances?.total_owed?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            {/* Detailed list */}
            {(balances?.owes?.length > 0 || balances?.owed?.length > 0) ? (
              <div className="space-y-4">
                {balances?.owes?.map(entry => (
                  <div key={entry.ledger_id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                    <div>
                      <p className="font-medium">You owe {entry.to_user?.name}</p>
                      <p className="text-xs text-muted-foreground">From recent game</p>
                    </div>
                    <span className="font-mono font-bold text-destructive">${entry.amount.toFixed(2)}</span>
                  </div>
                ))}
                {balances?.owed?.map(entry => (
                  <div key={entry.ledger_id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <div>
                      <p className="font-medium">{entry.from_user?.name} owes you</p>
                      <p className="text-xs text-muted-foreground">From recent game</p>
                    </div>
                    <span className="font-mono font-bold text-primary">${entry.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending balances</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
