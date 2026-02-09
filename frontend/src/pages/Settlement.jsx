import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, X, Lock, CreditCard, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

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

  useEffect(() => {
    fetchData();
    
    // Check for payment status from URL params
    const paymentStatus = searchParams.get('payment');
    const ledgerId = searchParams.get('ledger_id');
    
    if (paymentStatus === 'success' && ledgerId) {
      toast.success("Payment successful! The debt has been settled.");
      // Clean up URL params
      navigate(`/games/${gameId}/settlement`, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast.info("Payment was cancelled");
      navigate(`/games/${gameId}/settlement`, { replace: true });
    }
  }, [gameId, searchParams, navigate]);

  const fetchData = async () => {
    try {
      const [gameRes, settlementRes] = await Promise.all([
        axios.get(`${API}/games/${gameId}`),
        axios.get(`${API}/games/${gameId}/settlement`)
      ]);
      setGame(gameRes.data);
      setSettlements(settlementRes.data);
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
      
      // Redirect to Stripe checkout
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

  // Calculate summary
  const winners = game?.players?.filter(p => (p.net_result || 0) > 0) || [];
  const losers = game?.players?.filter(p => (p.net_result || 0) < 0) || [];
  const totalPot = game?.players?.reduce((sum, p) => sum + (p.total_buy_in || 0), 0) || 0;

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

        {/* Summary */}
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

        {/* Settlements */}
        <Card className="bg-card border-border/50" data-testid="settlements-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              PAYMENTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                No payments needed - everyone broke even!
              </p>
            ) : (
              <div className="space-y-2">
                {settlements.map(entry => {
                  const canToggle = user?.user_id === entry.from_user_id || user?.user_id === entry.to_user_id;
                  const isPaid = entry.status === 'paid';
                  
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
                          {/* Pay with Stripe button - only for the debtor */}
                          {user?.user_id === entry.from_user_id && !isPaid && (
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
                          {canToggle && (
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
                      {isPaid && entry.paid_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
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
      </main>
    </div>
  );
}
