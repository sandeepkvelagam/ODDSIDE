import { useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Wallet, Shield, Check, Loader2, Copy, Sparkles } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function WalletSetup({ open, onClose, onComplete }) {
  const [step, setStep] = useState(1); // 1: Create wallet, 2: Set PIN, 3: Confirm PIN, 4: Done
  const [loading, setLoading] = useState(false);
  const [walletId, setWalletId] = useState(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [copied, setCopied] = useState(false);

  const createWallet = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/wallet/setup`, {}, { withCredentials: true });
      setWalletId(res.data.wallet_id);
      setStep(2);
      toast.success("Wallet created!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create wallet");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value) => {
    setPin(value);
    if (value.length === 4) {
      setTimeout(() => setStep(3), 300);
    }
  };

  const handleConfirmPinChange = async (value) => {
    setConfirmPin(value);
    if (value.length === 4) {
      if (value !== pin) {
        toast.error("PINs don't match. Try again.");
        setConfirmPin("");
        setPin("");
        setStep(2);
        return;
      }

      // Set PIN
      setLoading(true);
      try {
        await axios.post(`${API}/wallet/pin/set`, { pin: value }, { withCredentials: true });
        setStep(4);
        toast.success("PIN set successfully!");
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to set PIN");
        setConfirmPin("");
        setPin("");
        setStep(2);
      } finally {
        setLoading(false);
      }
    }
  };

  const copyWalletId = () => {
    if (walletId) {
      navigator.clipboard.writeText(walletId);
      setCopied(true);
      toast.success("Wallet ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Create Your Wallet
              </DialogTitle>
              <DialogDescription>
                Get a unique wallet ID to send and receive money instantly
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Instant Transfers</h3>
                <p className="text-sm text-muted-foreground">
                  Send money to friends using their wallet ID. No bank details needed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">$0</p>
                  <p className="text-xs text-muted-foreground">Transfer fees</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">Instant</p>
                  <p className="text-xs text-muted-foreground">Transfers</p>
                </div>
              </div>

              <Button onClick={createWallet} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Create Wallet
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Set Your PIN
              </DialogTitle>
              <DialogDescription>
                Create a 4-digit PIN to secure your transfers
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={pin}
                  onChange={handlePinChange}
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

              <p className="text-sm text-center text-muted-foreground">
                You'll need this PIN every time you send money
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Confirm Your PIN
              </DialogTitle>
              <DialogDescription>Enter your PIN again to confirm</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  autoFocus
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
                    <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
                    <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
                    <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Wallet Ready!
              </DialogTitle>
              <DialogDescription>Your wallet is set up and ready to use</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Your Wallet ID</p>
                <button
                  onClick={copyWalletId}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <span className="font-mono text-lg font-bold">{walletId}</span>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this ID to receive money
                </p>
              </div>

              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700">PIN Protected</p>
                <p className="text-sm text-green-600">Your wallet is secure</p>
              </div>

              <Button onClick={handleComplete} className="w-full">
                Start Using Wallet
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
