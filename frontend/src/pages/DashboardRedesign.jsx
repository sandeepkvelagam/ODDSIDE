import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Users, Play, Plus, ChevronRight,
  Wallet, Target, Crown, UserPlus, DollarSign, HelpCircle,
  BarChart3, Trophy, Zap, ArrowUpRight, ArrowDownRight,
  Sparkles, Clock, Activity, Flame, CircleDot
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PendingInvites from "@/components/PendingInvites";
import OnboardingGuide, { useOnboarding } from "@/components/OnboardingGuide";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function DashboardRedesign() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showOnboarding, completeOnboarding, resetOnboarding } = useOnboarding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (user?.user_id) fetchData();
  }, [user?.user_id]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, groupsRes, gamesRes, balancesRes] = await Promise.all([
        axios.get(`${API}/stats/me`).catch(() => ({ data: {} })),
        axios.get(`${API}/groups`).catch(() => ({ data: [] })),
        axios.get(`${API}/games`).catch(() => ({ data: [] })),
        axios.get(`${API}/ledger/balances`).catch(() => ({ data: {} })),
      ]);
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
      <div className="min-h-screen bg-[#060918] flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-orange-400/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  const netProfit = stats?.net_profit || 0;
  const winRate = stats?.win_rate || 0;
  const totalGames = stats?.total_games || 0;
  const wins = totalGames > 0 ? Math.round((winRate / 100) * totalGames) : 0;
  const losses = totalGames - wins;
  const avgProfit = totalGames > 0 ? netProfit / totalGames : 0;
  const bestWin = stats?.biggest_win || 0;
  const worstLoss = stats?.biggest_loss || 0;
  const totalBuyIns = stats?.total_buy_ins || 0;
  const roiPercent = totalBuyIns > 0 ? (netProfit / totalBuyIns) * 100 : 0;
  const netBalance = balances?.net_balance || 0;

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(24px)',
    transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms`,
  });

  return (
    <div className="min-h-screen bg-[#060918] text-slate-100">
      <Navbar />

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, hsl(14, 85%, 58%), transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #22C55E, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />
      </div>

      {/* Switch back to original toggle */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer border border-orange-500/20"
        >
          ← Back to original
        </button>
      </div>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header - Editorial Style */}
        <div style={stagger(0)} className="mb-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-mono tracking-[0.3em] uppercase text-slate-500 mb-2">
                Dashboard
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-none">
                <span className="text-slate-100">Hey, </span>
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  {user?.name?.split(' ')[0] || 'Player'}
                </span>
              </h1>
              <p className="text-slate-500 mt-2 text-sm sm:text-base font-light">
                Your poker command center
              </p>
            </div>
            <button
              onClick={() => resetOnboarding()}
              className="text-slate-600 hover:text-slate-400 transition-colors p-2 cursor-pointer"
              title="Show getting started guide"
              aria-label="Show help guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-orange-500/40 via-slate-700/50 to-transparent" />
        </div>

        {/* Pending Invites */}
        <div style={stagger(1)}>
          <PendingInvites />
        </div>

        {/* Stats Hero Cards - Asymmetric Grid */}
        <div style={stagger(2)} className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">

          {/* Net Profit - Primary Card */}
          <div className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.06] hover:border-orange-500/20 transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(circle at 50% 80%, rgba(238,108,41,0.08), transparent 60%)' }} />
            <div className="relative p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-slate-500">Net Profit</span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {netProfit >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                  )}
                </div>
              </div>
              <p className={`font-mono text-xl sm:text-3xl md:text-4xl font-bold tracking-tight ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(0)}
              </p>
              <p className="text-slate-600 text-[10px] sm:text-xs font-mono mt-1.5">
                {totalGames} games played
              </p>
            </div>
          </div>

          {/* Win Rate */}
          <div className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.06] hover:border-blue-500/20 transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'radial-gradient(circle at 50% 80%, rgba(59,130,246,0.08), transparent 60%)' }} />
            <div className="relative p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-slate-500">Win Rate</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                </div>
              </div>
              <p className="font-mono text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-100">
                {winRate.toFixed(0)}<span className="text-lg sm:text-2xl text-slate-500">%</span>
              </p>
              <p className="text-slate-600 text-[10px] sm:text-xs font-mono mt-1.5">
                <span className="text-emerald-500">{wins}W</span>
                <span className="text-slate-700 mx-1">/</span>
                <span className="text-red-400">{losses}L</span>
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at 50% 80%, ${netBalance >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}, transparent 60%)` }} />
            <div className="relative p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-slate-500">Balance</span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: netBalance >= 0 ? '#4ade80' : '#f87171' }} />
                </div>
              </div>
              <p className={`font-mono text-xl sm:text-3xl md:text-4xl font-bold tracking-tight ${netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(0)}
              </p>
              <p className="text-slate-600 text-[10px] sm:text-xs font-mono mt-1.5">
                <span className="text-red-400/70">${(balances?.total_owes || 0).toFixed(0)}</span> owed
              </p>
            </div>
          </div>
        </div>

        {/* Performance Strip */}
        {totalGames > 0 && (
          <div style={stagger(3)} className="mb-6">
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
            >
              <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-xs font-mono tracking-widest uppercase text-slate-400">Performance</span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono text-slate-600">{totalGames} games</span>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: 'W/L', value: `${wins}/${losses}`, color: 'text-slate-100' },
                    { label: 'AVG', value: `${avgProfit >= 0 ? '+' : ''}$${avgProfit.toFixed(0)}`, color: avgProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'BEST', value: `+$${bestWin.toFixed(0)}`, color: 'text-emerald-400' },
                    { label: 'WORST', value: `$${worstLoss.toFixed(0)}`, color: 'text-red-400' },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className={`font-mono text-sm sm:text-lg font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-[9px] sm:text-[10px] font-mono tracking-wider uppercase text-slate-600 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* ROI Bar */}
                <div className="mt-4 flex items-center gap-3 px-1">
                  <span className="text-[10px] sm:text-xs font-mono text-slate-600 w-8">ROI</span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(Math.abs(roiPercent), 100)}%`,
                        background: roiPercent >= 0
                          ? 'linear-gradient(90deg, #f97316, #22c55e)'
                          : 'linear-gradient(90deg, #ef4444, #f97316)',
                      }}
                    />
                  </div>
                  <span className={`font-mono text-xs font-bold w-10 text-right ${roiPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout - Games & Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

          {/* Live Games */}
          <div style={stagger(4)}
            className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style2={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
          >
            <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
              className="rounded-2xl border border-white/[0.06] overflow-hidden"
            >
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <CircleDot className="w-4 h-4 text-emerald-400" />
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </div>
                  <span className="text-xs font-mono tracking-widest uppercase text-slate-400">Live Games</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {activeGames.length} active
                </span>
              </div>

              <div className="p-4 sm:p-5">
                {activeGames.length === 0 ? (
                  <div className="text-center py-8">
                    <Play className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm">No active games right now</p>
                    <p className="text-slate-700 text-xs mt-1">Start one from your group</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeGames.slice(0, 3).map((game) => {
                      const isHost = game.host_id === user?.user_id;
                      const isPlayer = game.is_player;
                      return (
                        <div
                          key={game.game_id}
                          className="group/game p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-emerald-500/20 transition-all duration-200 cursor-pointer"
                          onClick={() => navigate(`/games/${game.game_id}`)}
                        >
                          <div className="flex items-start justify-between mb-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${game.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-amber-400'}`} />
                                <p className="font-medium text-sm text-slate-200 truncate">{game.title || game.group_name}</p>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 ml-3.5">
                                <Crown className="w-3 h-3 text-amber-500/60" />
                                <span className="text-xs text-slate-600">{game.host_name || 'Host'}</span>
                              </div>
                            </div>
                            <span className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border ${
                              game.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {game.status === 'active' ? 'LIVE' : 'SOON'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-500 mb-3 ml-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />{game.player_count || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
                              ${game.buy_in_amount || 20} buy-in
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
                              ${game.total_pot || 0} pot
                            </span>
                          </div>

                          <div className="flex gap-2 ml-3.5">
                            {isHost ? (
                              <Button size="sm" className="flex-1 h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); navigate(`/games/${game.game_id}`); }}>
                                <UserPlus className="w-3 h-3 mr-1.5" />Add Players
                              </Button>
                            ) : isPlayer ? (
                              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-white/10 text-slate-300 hover:bg-white/[0.04] cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); navigate(`/games/${game.game_id}`); }}>
                                Open Game <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            ) : (
                              <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-0 cursor-pointer"
                                onClick={(e) => handleJoinGame(game.game_id, e)}>
                                <Play className="w-3 h-3 mr-1.5" />Join
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  className="w-full mt-4 py-2.5 rounded-xl text-xs font-mono tracking-wider uppercase text-slate-500 border border-white/[0.06] hover:border-orange-500/20 hover:text-orange-400 transition-all duration-200 cursor-pointer bg-transparent"
                  onClick={() => navigate('/groups')}
                >
                  View All Games
                </button>
              </div>
            </div>
          </div>

          {/* My Groups */}
          <div style={stagger(5)}>
            <div
              className="rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
            >
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-mono tracking-widest uppercase text-slate-400">My Groups</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {groups.length}
                </span>
              </div>

              <div className="p-4 sm:p-5">
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm">No groups yet</p>
                    <p className="text-slate-700 text-xs mt-1">Create one to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.slice(0, 3).map((group) => (
                      <div
                        key={group.group_id}
                        className="group/grp flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-blue-500/15 transition-all duration-200 cursor-pointer"
                        onClick={() => navigate(`/groups/${group.group_id}`)}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))' }}>
                          <span className="text-sm font-bold text-orange-400">
                            {group.name?.[0]?.toUpperCase() || 'G'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-slate-200 truncate">{group.name}</p>
                            {group.user_role === 'admin' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5 flex-shrink-0">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-mono mt-0.5">{group.member_count} members</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-700 group-hover/grp:text-slate-500 transition-colors flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="w-full mt-4 py-2.5 rounded-xl text-xs font-medium text-white border-0 cursor-pointer flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, hsl(14, 85%, 48%), hsl(14, 85%, 38%))' }}
                  onClick={() => navigate('/groups')}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manage Groups
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Results */}
        {stats?.recent_games?.length > 0 && (
          <div style={stagger(6)} className="mt-5">
            <div
              className="rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4))' }}
            >
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-xs font-mono tracking-widest uppercase text-slate-400">Recent Results</span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="space-y-1">
                  {stats.recent_games.map((game, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${game.net_result >= 0 ? 'bg-emerald-500/50' : 'bg-red-500/50'}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-300 truncate">{game.group_name}</p>
                          <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                            {game.date ? new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm flex-shrink-0 ${game.net_result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {game.net_result >= 0 ? '+' : ''}{game.net_result.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={stagger(7)} className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          <button
            className="group relative rounded-2xl p-5 sm:p-6 overflow-hidden border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300 cursor-pointer text-left"
            style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(15,23,42,0.6))' }}
            onClick={() => navigate('/groups')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity"
              style={{ background: 'radial-gradient(circle, #22C55E, transparent 70%)' }} />
            <Zap className="w-6 h-6 text-emerald-400 mb-3" />
            <p className="font-semibold text-sm text-slate-200">Start Game</p>
            <p className="text-[10px] text-slate-600 mt-0.5 font-mono">Quick launch</p>
          </button>

          <button
            className="group relative rounded-2xl p-5 sm:p-6 overflow-hidden border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 cursor-pointer text-left"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(15,23,42,0.6))' }}
            onClick={() => navigate('/wallet')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity"
              style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
            <Wallet className="w-6 h-6 text-violet-400 mb-3" />
            <p className="font-semibold text-sm text-slate-200">Wallet</p>
            <p className="text-[10px] text-slate-600 mt-0.5 font-mono">Manage funds</p>
          </button>
        </div>

        <div className="h-16" />
      </main>
    </div>
  );
}
