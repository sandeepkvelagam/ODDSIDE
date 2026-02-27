import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Lock, CreditCard, Loader2, AlertTriangle, Zap, Flag } from "lucide-react";
import Navbar from "@/components/Navbar";
import { PostGameSurveyDialog } from "@/components/feedback/PostGameSurveyDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Settlement() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingLedgerId, setPayingLedgerId] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [dispute, setDispute] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("wrong_cashout");
  const [disputeMessage, setDisputeMessage] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    if (!user?.user_id) return;

    fetchData();

    const paymentStatus = searchParams.get('payment');
    const ledgerId = searchParams.get('ledger_id');

    if (paymentStatus === 'success' && ledgerId) {
      toast.success("Payment successful! The debt has been settled.");
      navigate(`/games/${gameId}/settlement`, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.info("Payment was cancelled");
      navigate(`/games/${gameId}/settlement`, { replace: true });
    }
  }, [gameId, searchParams, navigate, user?.user_id]);

  const fetchData = async () => {
    try {
      const [gameRes, settlementRes] = await Promise.all([
        axios.get(`${API}/games/${gameId}`),
        axios.get(`${API}/games/${gameId}/settlement`)
      ]);
      setGame(gameRes.data);
      const data = Array.isArray(settlementRes.data) ? settlementRes.data : (settlementRes.data.settlements || []);
      setSettlements(data);

      // Check for open disputes
      try {
        const disputeRes = await axios.get(`${API}/games/${gameId}/settlement/disputes`);
        const openDispute = (disputeRes.data?.disputes || []).find(d => d.status === "open" || d.status === "reviewing");
        setDispute(openDispute || null);
      } catch {
        // Dispute check non-critical
      }

      // Survey check
      try {
        const surveyRes = await axios.get(`${API}/feedback/surveys/${gameId}`);
        const surveys = surveyRes.data?.surveys || surveyRes.data || [];
        const alreadySubmitted = surveys.some(s => s.user_id === user?.user_id);
        if (!alreadySubmitted) {
          setTimeout(() => setShowSurvey(true), 1500);
        }
      } catch {
        // Survey check non-critical
      }
    } catch (error) {
      toast.error("Failed to load settlement");
      navigate("/groups");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (ledgerId, paid) => {
    try {
      await axios.put(`${API}/ledger/${ledgerId}/paid`, { paid });
      toast.success(paid ? "Marked as paid" : "Marked as pending");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
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

  const handleSubmitDispute = async () => {
    if (!disputeMessage.trim()) {
      toast.error("Describe the issue");
      return;
    }
    setSubmittingDispute(true);
    try {
      await axios.post(`${API}/games/${gameId}/settlement/dispute`, {
        category: disputeCategory,
        message: disputeMessage.trim()
      });
      toast.success("Issue reported. Host has been notified.");
      setShowDisputeModal(false);
      setDisputeMessage("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to report issue");
    } finally {
      setSubmittingDispute(false);
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

  // Calculate summary
  const winners = game?.players?.filter(p => (p.net_result || 0) > 0) || [];
  const losers = game?.players?.filter(p => (p.net_result || 0) < 0) || [];
  const totalPot = game?.players?.reduce((sum, p) => sum + (p.total_buy_in || 0), 0) || 0;

  // Discrepancy
  const totalIn = game?.players?.reduce((sum, p) => sum + (p.total_buy_in || 0), 0) || 0;
  const totalOut = game?.players?.reduce((sum, p) => sum + (p.cash_out || 0), 0) || 0;
  const discrepancy = totalIn - totalOut;

  // Current user's result
  const currentPlayer = game?.players?.find(p => p.user_id === user?.user_id);
  const netResult = currentPlayer?.net_result || 0;
  const myDebts = settlements.filter(s => s.from_user_id === user?.user_id);
  const myCredits = settlements.filter(s => s.to_user_id === user?.user_id);

  // Optimization stats
  const activePlayers = (winners.length + losers.length);
  const possiblePayments = activePlayers > 1 ? Math.floor(activePlayers * (activePlayers - 1) / 2) : 0;
  const hasDisputeOpen = !!dispute;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(`/groups/${game?.group_id}`)}
          className="flex items-center text-muted-foreground hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Group
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight" data-testid="settlement-title">
            SETTLEMENT
          </h1>
          <p className="text-muted-foreground mt-1">
            {game?.title || game?.group?.name} • {game?.ended_at ? new Date(game.ended_at).toLocaleDateString() : 'Recent'}
          </p>
        </div>

        {/* Dispute Banner */}
        {hasDisputeOpen && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <Flag className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">Settlement under review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dispute.category?.replace("_", " ")} — payments paused until resolved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personalized Hero Banner */}
        {currentPlayer && (
          <Card className={`mb-6 border-2 ${
            netResult > 0.01 ? 'bg-primary/10 border-primary/40' :
            netResult < -0.01 ? 'bg-destructive/10 border-destructive/40' :
            'bg-secondary/30 border-border/50'
          }`} data-testid="hero-banner">
            <CardContent className="p-6 text-center">
              <p className={`text-4xl font-bold font-mono ${
                netResult > 0.01 ? 'text-primary' : netResult < -0.01 ? 'text-destructive' : 'text-foreground'
              }`}>
                {netResult > 0 ? '+' : ''}{netResult !== 0 ? `$${Math.abs(netResult).toFixed(0)}` : '$0'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {netResult > 0.01 && "You won."}
                {netResult < -0.01 && "You lost."}
                {Math.abs(netResult) <= 0.01 && "You broke even."}
              </p>
              {netResult > 0.01 && myCredits.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {myCredits.map(c => `${c.from_user?.name} owes you $${c.amount.toFixed(0)}`).join(' • ')}
                </p>
              )}
              {netResult < -0.01 && myDebts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {myDebts.map(d => `You owe ${d.to_user?.name} $${d.amount.toFixed(0)}`).join(' • ')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Game Summary */}
        <Card className="bg-card border-border/50 mb-6" data-testid="game-summary">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg font-bold">GAME SUMMARY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold font-mono">${totalPot.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Pot</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{winners.length}</p>
                <p className="text-xs text-muted-foreground">Winners</p>
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">{losers.length}</p>
                <p className="text-xs text-muted-foreground">Losers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discrepancy Warning */}
        {Math.abs(discrepancy) > 0.01 && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-6" data-testid="discrepancy-warning">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">Chip Discrepancy Detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total buy-ins: ${totalIn.toFixed(2)} | Total cash-outs: ${totalOut.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Difference: ${Math.abs(discrepancy).toFixed(2)} {discrepancy > 0 ? '(more in than out)' : '(more out than in)'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card className="bg-card border-border/50 mb-6" data-testid="results-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg font-bold">RESULTS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {game?.players?.sort((a, b) => (b.net_result || 0) - (a.net_result || 0)).map(player => (
                <div
                  key={player.player_id}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={player.user?.picture} />
                      <AvatarFallback className="text-xs">{player.user?.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{player.user?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        In: ${player.total_buy_in || 0} • Out: ${player.cash_out || 0}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-bold ${
                    (player.net_result || 0) >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {(player.net_result || 0) >= 0 ? '+' : ''}${(player.net_result || 0).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Smart Settlement */}
        <Card className="bg-card border-border/50 mb-6" data-testid="settlements-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              SMART SETTLEMENT
              {settlements.length > 0 && possiblePayments > settlements.length && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-normal ml-1">
                  {possiblePayments} possible → {settlements.length} payment{settlements.length > 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                No payments needed — everyone broke even.
              </p>
            ) : (
              <div className="space-y-2">
                {settlements.map(entry => {
                  const canToggle = user?.user_id === entry.from_user_id || user?.user_id === entry.to_user_id;
                  const isPaid = entry.status === 'paid';

                  // Context-aware label
                  const isDebtor = entry.from_user_id === user?.user_id;
                  const isCreditor = entry.to_user_id === user?.user_id;
                  const contextLabel = isDebtor
                    ? `You pay ${entry.to_user?.name}`
                    : isCreditor
                      ? `${entry.from_user?.name} pays you`
                      : `${entry.from_user?.name} pays ${entry.to_user?.name}`;

                  return (
                    <div
                      key={entry.ledger_id}
                      className={`p-3 rounded-lg border ${
                        isPaid
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-secondary/30 border-border/50'
                      }`}
                      data-testid={`settlement-${entry.ledger_id}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={entry.from_user?.picture} />
                              <AvatarFallback className="text-[10px]">{entry.from_user?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{entry.from_user?.name}</span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={entry.to_user?.picture} />
                              <AvatarFallback className="text-[10px]">{entry.to_user?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{entry.to_user?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">
                            ${entry.amount.toFixed(0)}
                          </span>
                          {/* Pay with Stripe — only for debtor, disabled during dispute */}
                          {isDebtor && !isPaid && !hasDisputeOpen && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handlePayWithStripe(entry.ledger_id)}
                              disabled={payingLedgerId === entry.ledger_id}
                              className="h-7 text-xs bg-[#635bff] hover:bg-[#5851db] text-white"
                              data-testid={`pay-stripe-${entry.ledger_id}`}
                            >
                              {payingLedgerId === entry.ledger_id ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing...</>
                              ) : (
                                <><CreditCard className="w-3 h-3 mr-1" /> Pay with Stripe</>
                              )}
                            </Button>
                          )}
                          {canToggle && !hasDisputeOpen && (
                            <Button
                              variant={isPaid ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleMarkPaid(entry.ledger_id, !isPaid)}
                              className={`h-7 text-xs ${isPaid ? "bg-primary text-black" : ""}`}
                              data-testid={`mark-paid-${entry.ledger_id}`}
                            >
                              {isPaid ? (
                                <><Check className="w-3 h-3 mr-1" /> Paid</>
                              ) : (
                                "Mark Paid"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Context-aware label */}
                      <p className={`text-[10px] mt-1 ${
                        isDebtor ? 'text-destructive/70' : isCreditor ? 'text-primary/70' : 'text-muted-foreground'
                      }`}>
                        {contextLabel}
                      </p>
                      {isPaid && entry.paid_at && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Settled {new Date(entry.paid_at).toLocaleDateString()}
                          {entry.paid_via === 'stripe' && (
                            <span className="ml-1 text-[#635bff]">• via Stripe</span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Issue Button */}
        {!hasDisputeOpen && settlements.length > 0 && (
          <div className="text-center mb-6">
            <button
              onClick={() => setShowDisputeModal(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <Flag className="w-3 h-3" />
              Report an issue with this settlement
            </button>
          </div>
        )}
      </main>

      {/* Dispute Modal */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-500" />
              Report Settlement Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">What's wrong?</label>
              <select
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="wrong_buyin">Wrong buy-in amount</option>
                <option value="wrong_cashout">Wrong cash-out amount</option>
                <option value="missing_player">Missing player</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Describe the issue</label>
              <textarea
                value={disputeMessage}
                onChange={(e) => setDisputeMessage(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-none"
                placeholder="E.g., My cash-out was $40 not $30..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisputeModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitDispute}
                disabled={submittingDispute}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
              >
                {submittingDispute ? <Loader2 className="w-3 h-3 animate-spin" /> : "Report Issue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-game survey */}
      <PostGameSurveyDialog
        open={showSurvey}
        onOpenChange={setShowSurvey}
        gameId={gameId}
        groupId={game?.group_id}
      />
    </div>
  );
}
