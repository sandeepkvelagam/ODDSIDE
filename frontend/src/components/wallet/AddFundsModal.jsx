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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, CreditCard, Loader2, DollarSign } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const PRESET_AMOUNTS = [
  { cents: 1000, label: "$10" },
  { cents: 2500, label: "$25" },
  { cents: 5000, label: "$50" },
  { cents: 10000, label: "$100" },
];

export default function AddFundsModal({ open, onClose, wallet }) {
  const [amountCents, setAmountCents] = useState(2500); // Default $25
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  const handlePresetClick = (cents) => {
    setAmountCents(cents);
    setUseCustom(false);
    setCustomAmount("");
  };

  const handleCustomChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setCustomAmount(value);
    setUseCustom(true);

    const cents = Math.round(parseFloat(value || 0) * 100);
    if (cents >= 500 && cents <= 100000) {
      setAmountCents(cents);
    }
  };

  const handleDeposit = async () => {
    const finalAmount = useCustom ? Math.round(parseFloat(customAmount || 0) * 100) : amountCents;

    if (finalAmount < 500) {
      toast.error("Minimum deposit is $5.00");
      return;
    }
    if (finalAmount > 100000) {
      toast.error("Maximum deposit is $1,000.00");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/wallet/deposit`,
        {
          amount_cents: finalAmount,
          origin_url: window.location.origin
        },
        { withCredentials: true }
      );

      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error("Failed to create payment session");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create deposit");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(cents / 100);
  };

  const getFinalAmount = () => {
    return useCustom ? Math.round(parseFloat(customAmount || 0) * 100) : amountCents;
  };

  const isValidAmount = () => {
    const amount = getFinalAmount();
    return amount >= 500 && amount <= 100000;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Funds
          </DialogTitle>
          <DialogDescription>
            Add money to your wallet via secure payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">
              {formatCurrency(wallet?.balance_cents || 0)}
            </p>
          </div>

          {/* Preset Amounts */}
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <Button
                key={preset.cents}
                variant={!useCustom && amountCents === preset.cents ? "default" : "outline"}
                className="h-12"
                onClick={() => handlePresetClick(preset.cents)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Enter amount"
                value={customAmount}
                onChange={handleCustomChange}
                className={`pl-9 ${useCustom ? "ring-2 ring-primary" : ""}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min: $5.00 | Max: $1,000.00
            </p>
          </div>

          {/* Summary */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount to add</span>
              <span className="text-xl font-bold">
                {isValidAmount() ? formatCurrency(getFinalAmount()) : "--"}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-muted-foreground">New balance</span>
              <span className="font-medium">
                {isValidAmount()
                  ? formatCurrency((wallet?.balance_cents || 0) + getFinalAmount())
                  : "--"}
              </span>
            </div>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handleDeposit}
            disabled={loading || !isValidAmount()}
            className="w-full h-12"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Pay {isValidAmount() ? formatCurrency(getFinalAmount()) : ""}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secured by Stripe. Your payment details are never stored.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
