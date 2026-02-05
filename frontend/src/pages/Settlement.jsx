import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, X, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function Settlement() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [gameId]);

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
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold">GAME SUMMARY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold font-mono">${totalPot.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Pot</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">{winners.length}</p>
                <p className="text-sm text-muted-foreground">Winners</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-destructive">{losers.length}</p>
                <p className="text-sm text-muted-foreground">Losers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-card border-border/50 mb-6" data-testid="results-card">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold">RESULTS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {game?.players?.sort((a, b) => (b.net_result || 0) - (a.net_result || 0)).map(player => (
                <div 
                  key={player.player_id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={player.user?.picture} />
                      <AvatarFallback>{player.user?.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{player.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        In: ${player.total_buy_in || 0} • Out: ${player.cash_out || 0}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-xl font-bold ${
                    (player.net_result || 0) >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {(player.net_result || 0) >= 0 ? '+' : ''}{(player.net_result || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settlements */}
        <Card className="bg-card border-border/50" data-testid="settlements-card">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
              PAYMENTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No payments needed - everyone broke even!
              </p>
            ) : (
              <div className="space-y-4">
                {settlements.map(entry => {
                  const canToggle = user?.user_id === entry.from_user_id || user?.user_id === entry.to_user_id;
                  const isPaid = entry.status === 'paid';
                  
                  return (
                    <div 
                      key={entry.ledger_id}
                      className={`p-4 rounded-lg border ${
                        isPaid 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-secondary/30 border-border/50'
                      }`}
                      data-testid={`settlement-${entry.ledger_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={entry.from_user?.picture} />
                              <AvatarFallback>{entry.from_user?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{entry.from_user?.name}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={entry.to_user?.picture} />
                              <AvatarFallback>{entry.to_user?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{entry.to_user?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xl font-bold">
                            ${entry.amount.toFixed(2)}
                          </span>
                          {canToggle && (
                            <Button
                              variant={isPaid ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleMarkPaid(entry.ledger_id, !isPaid)}
                              className={isPaid ? "bg-primary text-black" : ""}
                              data-testid={`mark-paid-${entry.ledger_id}`}
                            >
                              {isPaid ? (
                                <><Check className="w-4 h-4 mr-1" /> Paid</>
                              ) : (
                                "Mark Paid"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {isPaid && entry.paid_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Settled on {new Date(entry.paid_at).toLocaleString()}
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
