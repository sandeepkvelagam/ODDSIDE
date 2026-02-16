import { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Send,
  Search,
  User,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  AlertTriangle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SendMoneyModal({ open, onClose, wallet, onComplete }) {
  const [step, setStep] = useState(1); // 1: Find recipient, 2: Enter amount, 3: Confirm + PIN, 4: Success
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [amountCents, setAmountCents] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [transferResult, setTransferResult] = useState(null);
  const [riskWarning, setRiskWarning] = useState(null); // { risk_score, risk_flags }
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setSearchQuery("");
        setSearchResults([]);
        setRecipient(null);
        setAmountCents(0);
        setAmountInput("");
        setDescription("");
        setPin("");
        setPinError("");
        setTransferResult(null);
        setRiskWarning(null);
        setRiskAcknowledged(false);
      }, 300);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${API}/wallet/search`, {
          params: { q: searchQuery },
          withCredentials: true
        });
        setSearchResults(res.data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectRecipient = (result) => {
    setRecipient(result);
    setStep(2);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setAmountInput(value);
    setAmountCents(Math.round(parseFloat(value || 0) * 100));
  };

  const handleContinueToConfirm = () => {
    if (amountCents <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    const maxPerTxn = wallet?.per_transaction_limit_cents || 20000;
    if (amountCents > maxPerTxn) {
      toast.error(`Maximum per transaction is $${(maxPerTxn / 100).toFixed(2)}`);
      return;
    }

    const remaining = (wallet?.daily_transfer_limit_cents || 50000) - (wallet?.daily_transferred_cents || 0);
    if (amountCents > remaining) {
      toast.error(`Exceeds daily limit. Remaining: $${(remaining / 100).toFixed(2)}`);
      return;
    }

    if (amountCents > (wallet?.balance_cents || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setStep(3);
  };

  const handlePinChange = async (value) => {
    setPin(value);
    setPinError("");

    if (value.length === 4) {
      await executeTransfer(value);
    }
  };

  const executeTransfer = async (pinValue, acknowledgeRisk = false) => {
    setLoading(true);
    setPinError("");

    try {
      const res = await axios.post(
        `${API}/wallet/transfer`,
        {
          to_wallet_id: recipient.wallet_id,
          amount_cents: amountCents,
          pin: pinValue,
          idempotency_key: crypto.randomUUID(),
          description: description || null,
          risk_acknowledged: acknowledgeRisk || riskAcknowledged
        },
        { withCredentials: true }
      );

      setTransferResult(res.data);
      setStep(4);
      toast.success("Money sent!");
    } catch (error) {
      const detail = error.response?.data?.detail;

      // Handle high-risk transfer step-up
      if (detail?.error === "high_risk_transfer") {
        setRiskWarning({
          risk_score: detail.risk_score,
          risk_flags: detail.risk_flags
        });
        setLoading(false);
        return;
      }

      const errorMsg = typeof detail === "string" ? detail : "Transfer failed";
      setPinError(errorMsg);
      setPin("");

      // If it's a PIN error, stay on step 3
      if (!errorMsg.toLowerCase().includes("pin")) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRiskyTransfer = async () => {
    setRiskAcknowledged(true);
    setRiskWarning(null);
    await executeTransfer(pin, true);
  };

  const handleCancelRiskyTransfer = () => {
    setRiskWarning(null);
    setPin("");
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(cents / 100);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Step 1: Find Recipient */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send Money
              </DialogTitle>
              <DialogDescription>
                Enter a wallet ID or search by name
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Wallet ID (KVT-XXXXXX) or name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No wallets found
                  </p>
                )}

                {searchResults.map((result) => (
                  <button
                    key={result.wallet_id}
                    onClick={() => handleSelectRecipient(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar>
                      <AvatarImage src={result.picture} />
                      <AvatarFallback>{getInitials(result.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.display_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {result.wallet_id}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {/* Instructions */}
              {searchQuery.length < 2 && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Enter at least 2 characters to search
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Enter Amount */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Enter Amount
              </DialogTitle>
              <DialogDescription>
                How much do you want to send?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Recipient Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={recipient?.picture} />
                  <AvatarFallback>{getInitials(recipient?.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{recipient?.display_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {recipient?.wallet_id}
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="text-center">
                <div className="relative inline-block">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-light text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={handleAmountChange}
                    className="text-center text-4xl font-bold h-16 w-48 pl-8 border-0 border-b-2 rounded-none focus-visible:ring-0"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Available: {formatCurrency(wallet?.balance_cents || 0)}
                </p>
              </div>

              {/* Description */}
              <div>
                <Input
                  placeholder="Add a note (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Limits Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Per transaction limit</span>
                  <span>{formatCurrency(wallet?.per_transaction_limit_cents || 20000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily limit remaining</span>
                  <span>
                    {formatCurrency(
                      (wallet?.daily_transfer_limit_cents || 50000) -
                        (wallet?.daily_transferred_cents || 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleContinueToConfirm}
                  disabled={amountCents <= 0}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Confirm + PIN */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Confirm Transfer
              </DialogTitle>
              <DialogDescription>Enter your PIN to send money</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">To</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={recipient?.picture} />
                      <AvatarFallback className="text-xs">
                        {getInitials(recipient?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{recipient?.display_name}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(amountCents)}
                  </span>
                </div>
                {description && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Note</span>
                    <span className="text-sm">{description}</span>
                  </div>
                )}
              </div>

              {/* PIN Input */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Enter your 4-digit PIN</p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={pin}
                    onChange={handlePinChange}
                    disabled={loading}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {pinError && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{pinError}</span>
                  </div>
                )}

                {/* High-Risk Warning */}
                {riskWarning && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-amber-500">Security Alert</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This transfer has been flagged for verification:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          {riskWarning.risk_flags?.map((flag, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                              {flag.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelRiskyTransfer}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600"
                            onClick={handleConfirmRiskyTransfer}
                            disabled={loading}
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Confirm Transfer"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {loading && !riskWarning && (
                  <div className="flex justify-center mt-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Back Button */}
              <Button variant="outline" onClick={() => setStep(2)} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Money Sent!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-500" />
              </div>

              <div>
                <p className="text-3xl font-bold">{formatCurrency(amountCents)}</p>
                <p className="text-muted-foreground mt-1">
                  sent to {recipient?.display_name}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono">{transferResult?.transaction_id}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">New Balance</span>
                  <span className="font-medium">
                    {formatCurrency(transferResult?.new_balance_cents || 0)}
                  </span>
                </div>
              </div>

              <Button onClick={onComplete} className="w-full">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
