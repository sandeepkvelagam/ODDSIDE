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
  DollarSign, Target, ArrowLeft, Moon, Sun, Bell, BellOff, CreditCard, Loader2, Wallet, Sparkles,
  MessageSquare, Calendar, BarChart3, Flame, Volume2, VolumeX
} from "lucide-react";
import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [payingLedgerId, setPayingLedgerId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [engagementPrefs, setEngagementPrefs] = useState(null);

  useEffect(() => {
    // Only fetch when user is ready to prevent race conditions
    if (!user?.user_id) return;
    fetchData();
    // Get current theme
    const saved = localStorage.getItem("kvitt-theme");
    setIsDark(saved === "dark");
  }, [user?.user_id]);

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
      const [statsRes, balancesRes, walletRes, engPrefsRes] = await Promise.all([
        axios.get(`${API}/stats/me`, { withCredentials: true }),
        axios.get(`${API}/ledger/balances`, { withCredentials: true }),
        axios.get(`${API}/wallet`, { withCredentials: true }),
        axios.get(`${API}/engagement/preferences`, { withCredentials: true }).catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setBalances(balancesRes.data);
      setWallet(walletRes.data);
      if (engPrefsRes.data) setEngagementPrefs(engPrefsRes.data);
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const updateEngagementPref = async (key, value) => {
    const updated = { ...engagementPrefs, [key]: value };
    setEngagementPrefs(updated);
    try {
      await axios.put(`${API}/engagement/preferences`, { [key]: value }, { withCredentials: true });
    } catch {
      toast.error("Failed to update preference");
      setEngagementPrefs(engagementPrefs);
    }
  };

  const toggleMutedCategory = async (category) => {
    const current = engagementPrefs?.muted_categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    await updateEngagementPref("muted_categories", updated);
  };

  const handleRequestPayment = async (entry) => {
    try {
      await axios.post(`${API}/ledger/${entry.ledger_id}/request-payment`);
      toast.success(`Payment request sent to ${entry.from_user?.name}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send request");
    }
  };

  const handlePayWithStripe = async (ledgerId) => {
    setPayingLedgerId(ledgerId);
    try {
      const response = await axios.post(`${API}/settlements/${ledgerId}/pay`, {
        origin_url: window.location.origin
      });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error("Could not create payment link");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create payment");
    } finally {
      setPayingLedgerId(null);
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

        {/* Engagement Preferences */}
        {engagementPrefs && (
          <Card className="bg-card border-border/50 mb-4 sm:mb-6">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="font-heading text-base sm:text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                ENGAGEMENT NOTIFICATIONS
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
              {/* Master mute toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm sm:text-base">Mute All Engagement</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pause all nudges, celebrations & digests</p>
                </div>
                <button
                  onClick={() => updateEngagementPref("muted_all", !engagementPrefs.muted_all)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    engagementPrefs.muted_all
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {engagementPrefs.muted_all ? (
                    <><VolumeX className="w-4 h-4" /> Muted</>
                  ) : (
                    <><Volume2 className="w-4 h-4" /> Active</>
                  )}
                </button>
              </div>

              {/* Category toggles */}
              {!engagementPrefs.muted_all && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Mute specific categories</p>
                  {[
                    { key: "inactive_group", label: "Inactive Group Nudges", desc: "Reminders to schedule a game", icon: Calendar, color: "text-blue-400" },
                    { key: "milestone", label: "Milestone Celebrations", desc: "Game count achievements", icon: Trophy, color: "text-yellow-400" },
                    { key: "big_winner", label: "Winner Celebrations", desc: "Big win announcements", icon: Flame, color: "text-orange-400" },
                    { key: "digest", label: "Weekly Digests", desc: "Group activity summaries", icon: BarChart3, color: "text-purple-400" },
                  ].map(({ key, label, desc, icon: Icon, color }) => {
                    const isMuted = (engagementPrefs.muted_categories || []).includes(key);
                    return (
                      <div key={key} className="flex items-center justify-between p-2 sm:p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isMuted ? 'text-muted-foreground' : color}`} />
                          <div>
                            <p className={`text-sm font-medium ${isMuted ? 'text-muted-foreground' : ''}`}>{label}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleMutedCategory(key)}
                          className={`p-1.5 rounded-full transition-colors ${
                            isMuted
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quiet hours */}
              {!engagementPrefs.muted_all && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Quiet Hours (no notifications)</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">From</label>
                      <select
                        value={engagementPrefs.quiet_start ?? 22}
                        onChange={(e) => updateEngagementPref("quiet_start", parseInt(e.target.value))}
                        className="bg-secondary/50 border border-border rounded px-2 py-1 text-xs"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs text-muted-foreground">to</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={engagementPrefs.quiet_end ?? 8}
                        onChange={(e) => updateEngagementPref("quiet_end", parseInt(e.target.value))}
                        className="bg-secondary/50 border border-border rounded px-2 py-1 text-xs"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Kvitt Wallet */}
        <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30 mb-4 sm:mb-6" data-testid="kvitt-wallet">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="font-heading text-base sm:text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              KVITT WALLET
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="text-center p-6 sm:p-8">
              <p className="text-muted-foreground text-sm mb-2">Available Balance</p>
              <p className="font-mono text-3xl sm:text-4xl font-bold text-primary">
                ${wallet?.balance?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {wallet?.transactions?.length || 0} transaction(s)
              </p>
              <Button size="sm" className="mt-4" disabled>
                <Sparkles className="w-3 h-3 mr-1" />
                Withdraw (Coming Soon)
              </Button>
            </div>
            {/* Recent Transactions */}
            {wallet?.transactions?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">Recent Transactions</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {wallet.transactions.slice(-3).reverse().map((txn, i) => (
                    <div key={txn.transaction_id || i} className="flex items-center justify-between text-xs p-2 bg-background/50 rounded">
                      <span className="text-muted-foreground">{txn.description}</span>
                      <span className={`font-mono font-bold ${txn.type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                        {txn.type === 'credit' ? '+' : '-'}${txn.amount?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-destructive text-sm sm:text-base">${entry.amount.toFixed(2)}</span>
                      <Button
                        size="sm"
                        onClick={() => handlePayWithStripe(entry.ledger_id)}
                        disabled={payingLedgerId === entry.ledger_id}
                        className="h-7 text-xs bg-[#635bff] hover:bg-[#5851db] text-white"
                      >
                        {payingLedgerId === entry.ledger_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <><CreditCard className="w-3 h-3 mr-1" /> Pay</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {balances?.owed?.map(entry => (
                  <div key={entry.ledger_id} className="flex items-center justify-between p-2 sm:p-3 bg-primary/5 rounded-lg">
                    <div>
                      <p className="font-medium text-sm sm:text-base">{entry.from_user?.name} owes you</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">From recent game</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary text-sm sm:text-base">${entry.amount.toFixed(2)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleRequestPayment(entry)}
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Request
                      </Button>
                    </div>
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
