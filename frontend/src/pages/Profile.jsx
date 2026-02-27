import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  User, Mail, TrendingUp, TrendingDown, Trophy,
  DollarSign, Target, ArrowLeft, Moon, Sun, Bell, BellOff, CreditCard, Loader2, Wallet, Sparkles,
  MessageSquare, Calendar, BarChart3, Flame, Volume2, VolumeX, CheckCircle, Clock, AlertCircle, Wrench,
  Zap, ArrowRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import UserBadges from "@/components/UserBadges";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [consolidated, setConsolidated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [payingUserId, setPayingUserId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [engagementPrefs, setEngagementPrefs] = useState(null);
  const [myFeedback, setMyFeedback] = useState([]);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchData();
    const saved = localStorage.getItem("kvitt-theme");
    setIsDark(saved === "dark");

    // Check for payment return
    const paymentStatus = searchParams.get('payment');
    const planId = searchParams.get('plan_id');
    if (paymentStatus === 'success' && planId) {
      toast.success("Payment successful! Balances updated.");
      navigate('/profile', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.info("Payment cancelled. No changes made.");
      navigate('/profile', { replace: true });
    }
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
      const [statsRes, consolidatedRes, walletRes, engPrefsRes, feedbackRes] = await Promise.all([
        axios.get(`${API}/stats/me`, { withCredentials: true }),
        axios.get(`${API}/ledger/consolidated-detailed`, { withCredentials: true }),
        axios.get(`${API}/wallet`, { withCredentials: true }),
        axios.get(`${API}/engagement/preferences`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${API}/feedback/my`, { withCredentials: true }).catch(() => ({ data: { feedback: [] } }))
      ]);
      setStats(statsRes.data);
      setConsolidated(consolidatedRes.data);
      setWallet(walletRes.data);
      if (engPrefsRes.data) setEngagementPrefs(engPrefsRes.data);
      setMyFeedback(feedbackRes.data?.feedback || []);
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

  const handlePayNet = async (person) => {
    setPayingUserId(person.user?.user_id);
    try {
      const response = await axios.post(`${API}/ledger/pay-net/prepare`, {
        other_user_id: person.user?.user_id,
        ledger_ids: person.all_ledger_ids,
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
      setPayingUserId(null);
    }
  };

  const handleRequestPayment = async (person) => {
    // Request payment using the first ledger entry where they owe us
    const firstLedgerId = person.game_breakdown
      ?.find(g => g.direction === "owed_to_you")
      ?.ledger_ids?.[0];
    if (!firstLedgerId) return;

    try {
      await axios.post(`${API}/ledger/${firstLedgerId}/request-payment`);
      toast.success(`Payment request sent to ${person.user?.name}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send request");
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

        {/* Level & Badges */}
        <div className="mb-4 sm:mb-6">
          <UserBadges />
        </div>

        {/* Stats Grid */}
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

        {/* My Feedback */}
        {myFeedback.length > 0 && (
          <Card className="bg-card border-border/50 mb-4 sm:mb-6" data-testid="my-feedback">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="font-heading text-base sm:text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                MY FEEDBACK
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-2">
                {myFeedback.slice(0, 5).map(item => {
                  const statusIcon = item.status === "resolved" ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :
                                     item.status === "in_progress" ? <Clock className="w-3.5 h-3.5 text-amber-500" /> :
                                     <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
                  const statusLabel = item.status === "resolved" ? "Resolved" :
                                     item.status === "in_progress" ? "In Progress" :
                                     item.status === "open" ? "Open" : item.status || "Submitted";
                  const statusColor = item.status === "resolved" ? "text-green-500 bg-green-500/10" :
                                     item.status === "in_progress" ? "text-amber-500 bg-amber-500/10" :
                                     "text-muted-foreground bg-secondary/50";
                  const hasPendingFix = item.auto_fix?.status === "pending_confirmation";

                  return (
                    <div key={item.feedback_id} className="p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {item.feedback_type?.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{item.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {statusIcon}
                        </div>
                      </div>
                      {hasPendingFix && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Wrench className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium text-amber-500">Auto-fix available</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            A fix for "{item.auto_fix.fix_type?.replace("_", " ")}" is ready to apply.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px]"
                              onClick={async () => {
                                try {
                                  await axios.post(`${API}/feedback/${item.feedback_id}/confirm-fix`, { confirmed: false });
                                  toast.success("Fix rejected");
                                  fetchData();
                                } catch { toast.error("Failed to reject fix"); }
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={async () => {
                                try {
                                  await axios.post(`${API}/feedback/${item.feedback_id}/confirm-fix`, { confirmed: true });
                                  toast.success("Fix applied!");
                                  fetchData();
                                } catch (err) { toast.error(err?.response?.data?.detail || "Failed to apply fix"); }
                              }}
                            >
                              <Wrench className="w-3 h-3 mr-1" /> Apply Fix
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smart Balances — Consolidated */}
        <Card className="bg-card border-border/50" data-testid="pending-balances">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="font-heading text-base sm:text-xl font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              SMART BALANCES
              {consolidated?.people_count > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-normal ml-1">
                  {consolidated.people_count} {consolidated.people_count === 1 ? 'person' : 'people'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Summary totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
              <div className="text-center p-4 sm:p-6 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">You Owe (Net)</p>
                <p className="font-mono text-xl sm:text-3xl font-bold text-destructive">
                  ${consolidated?.total_you_owe?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="text-center p-4 sm:p-6 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1 sm:mb-2">Owed to You (Net)</p>
                <p className="font-mono text-xl sm:text-3xl font-bold text-primary">
                  ${consolidated?.total_owed_to_you?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            {/* Per-person collapsible breakdown */}
            {consolidated?.consolidated?.length > 0 ? (
              <Accordion type="multiple" className="space-y-2">
                {consolidated.consolidated.map((person, idx) => (
                  <AccordionItem
                    key={person.user?.user_id || idx}
                    value={person.user?.user_id || `person-${idx}`}
                    className="border-0"
                  >
                    <AccordionTrigger className={`p-3 rounded-lg hover:no-underline [&[data-state=open]]:rounded-b-none ${
                      person.direction === 'you_owe'
                        ? 'bg-destructive/5 hover:bg-destructive/10'
                        : 'bg-primary/5 hover:bg-primary/10'
                    }`}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={person.user?.picture} />
                            <AvatarFallback className="text-xs">{person.user?.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium text-sm">
                              {person.direction === 'you_owe'
                                ? `You owe ${person.user?.name}`
                                : `${person.user?.name} owes you`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {person.game_count} game{person.game_count > 1 ? 's' : ''}
                              {person.offset_explanation && ' • auto-netted'}
                            </p>
                          </div>
                        </div>
                        <span className={`font-mono font-bold text-sm ${
                          person.direction === 'you_owe' ? 'text-destructive' : 'text-primary'
                        }`}>
                          ${person.display_amount.toFixed(2)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className={`px-3 pb-3 pt-0 rounded-b-lg ${
                      person.direction === 'you_owe' ? 'bg-destructive/5' : 'bg-primary/5'
                    }`}>
                      {/* Offset explanation */}
                      {person.offset_explanation && (
                        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
                          <p className="text-amber-600 font-medium">Auto-netted across {person.game_count} games</p>
                          <p className="text-muted-foreground mt-1">
                            You owed ${person.offset_explanation.gross_you_owe.toFixed(2)} •
                            They owed ${person.offset_explanation.gross_they_owe.toFixed(2)} •
                            Offset ${person.offset_explanation.offset_amount.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {/* Game-by-game breakdown */}
                      <div className="space-y-1.5">
                        {person.game_breakdown?.map((game, gi) => (
                          <div key={game.game_id || gi} className="flex items-center justify-between p-2 bg-background/50 rounded text-xs">
                            <div>
                              <p className="font-medium">{game.game_title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {game.game_date ? new Date(game.game_date).toLocaleDateString() : 'Recent'}
                              </p>
                            </div>
                            <span className={`font-mono font-bold ${
                              game.direction === 'you_owe' ? 'text-destructive' : 'text-primary'
                            }`}>
                              {game.direction === 'you_owe' ? '-' : '+'}${game.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Action buttons */}
                      <div className="mt-3 flex gap-2">
                        {person.direction === 'you_owe' ? (
                          <Button
                            size="sm"
                            onClick={() => handlePayNet(person)}
                            disabled={payingUserId === person.user?.user_id}
                            className="h-7 text-xs bg-[#635bff] hover:bg-[#5851db] text-white"
                          >
                            {payingUserId === person.user?.user_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <><CreditCard className="w-3 h-3 mr-1" /> Pay Net ${person.display_amount.toFixed(0)}</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleRequestPayment(person)}
                          >
                            <Bell className="w-3 h-3 mr-1" />
                            Request ${person.display_amount.toFixed(0)}
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">
                All settled up. No pending balances.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
