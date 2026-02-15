import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  Plus,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  Settings,
  Shield
} from "lucide-react";
import Navbar from "@/components/Navbar";
import WalletSetup from "@/components/wallet/WalletSetup";
import AddFundsModal from "@/components/wallet/AddFundsModal";
import SendMoneyModal from "@/components/wallet/SendMoneyModal";
import TransactionHistory from "@/components/wallet/TransactionHistory";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Wallet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchWallet();

    // Handle deposit success/cancel from Stripe redirect
    const depositStatus = searchParams.get("deposit");
    const sessionId = searchParams.get("session_id");

    if (depositStatus === "success" && sessionId) {
      checkDepositStatus(sessionId);
    } else if (depositStatus === "cancelled") {
      toast.info("Deposit cancelled");
    }
  }, [user?.user_id, searchParams]);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/wallet`, { withCredentials: true });
      setWallet(res.data);

      if (!res.data.wallet_id || res.data.status === "needs_setup") {
        setShowSetup(true);
      }
    } catch (error) {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const checkDepositStatus = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/wallet/deposit/status/${sessionId}`, {
        withCredentials: true
      });

      if (res.data.status === "completed") {
        toast.success(`$${(res.data.amount_cents / 100).toFixed(2)} added to your wallet!`);
        fetchWallet();
        setRefreshKey((k) => k + 1);
      }
    } catch (error) {
      console.error("Failed to check deposit status:", error);
    }
  };

  const copyWalletId = () => {
    if (wallet?.wallet_id) {
      navigator.clipboard.writeText(wallet.wallet_id);
      setCopied(true);
      toast.success("Wallet ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(cents / 100);
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    fetchWallet();
  };

  const handleTransferComplete = () => {
    setShowSendMoney(false);
    fetchWallet();
    setRefreshKey((k) => k + 1);
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

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Wallet</h1>
        </div>

        {/* Wallet Setup Modal */}
        {showSetup && (
          <WalletSetup
            open={showSetup}
            onClose={() => setShowSetup(false)}
            onComplete={handleSetupComplete}
          />
        )}

        {/* Add Funds Modal */}
        <AddFundsModal
          open={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          wallet={wallet}
        />

        {/* Send Money Modal */}
        <SendMoneyModal
          open={showSendMoney}
          onClose={() => setShowSendMoney(false)}
          wallet={wallet}
          onComplete={handleTransferComplete}
        />

        {/* Wallet Card */}
        {wallet?.wallet_id && (
          <>
            <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                {/* Wallet ID */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <WalletIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Wallet ID</span>
                  </div>
                  <button
                    onClick={copyWalletId}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
                  >
                    <span className="font-mono font-medium">{wallet.wallet_id}</span>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {/* Balance */}
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <p className="text-4xl font-bold">
                    {formatCurrency(wallet.balance_cents || 0)}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {wallet.has_pin ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <Shield className="h-3 w-3 mr-1" />
                      PIN Protected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      <Shield className="h-3 w-3 mr-1" />
                      Set PIN to transfer
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {wallet.status}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    className="h-14"
                    onClick={() => setShowAddFunds(true)}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Funds
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14"
                    onClick={() => setShowSendMoney(true)}
                    disabled={!wallet.has_pin}
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Send Money
                  </Button>
                </div>

                {/* Limits Info */}
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Daily Limit</span>
                    <span>
                      {formatCurrency(wallet.daily_transferred_cents || 0)} / {formatCurrency(wallet.daily_transfer_limit_cents || 50000)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((wallet.daily_transferred_cents || 0) / (wallet.daily_transfer_limit_cents || 50000)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {!wallet.has_pin && (
              <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">Set up your PIN</p>
                        <p className="text-sm text-muted-foreground">
                          Required to send money
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setShowSetup(true)}>
                      Set PIN
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRefreshKey((k) => k + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <TransactionHistory key={refreshKey} walletId={wallet.wallet_id} />
              </CardContent>
            </Card>
          </>
        )}

        {/* No Wallet State */}
        {!wallet?.wallet_id && !showSetup && (
          <Card className="text-center p-8">
            <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Set Up Your Wallet</h2>
            <p className="text-muted-foreground mb-4">
              Create a wallet to send and receive money instantly
            </p>
            <Button onClick={() => setShowSetup(true)}>
              Get Started
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
