import { useState, useEffect } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Loader2,
  Receipt
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const TYPE_CONFIG = {
  transfer_in: {
    icon: ArrowDownLeft,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Received",
    sign: "+"
  },
  transfer_out: {
    icon: ArrowUpRight,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Sent",
    sign: "-"
  },
  deposit: {
    icon: Plus,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Deposit",
    sign: "+"
  },
  settlement_credit: {
    icon: ArrowDownLeft,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Settlement",
    sign: "+"
  }
};

export default function TransactionHistory({ walletId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTransactions();
  }, [walletId, filter]);

  const fetchTransactions = async () => {
    if (!walletId) return;

    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filter !== "all") {
        params.type = filter;
      }

      const res = await axios.get(`${API}/wallet/transactions`, {
        params,
        withCredentials: true
      });
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
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

  const getConfig = (type) => {
    return TYPE_CONFIG[type] || TYPE_CONFIG.transfer_in;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="transfer_out">Sent</TabsTrigger>
          <TabsTrigger value="transfer_in">Received</TabsTrigger>
          <TabsTrigger value="deposit">Deposits</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((txn) => {
            const config = getConfig(txn.type);
            const Icon = config.icon;

            return (
              <div
                key={txn.transaction_id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Icon or Avatar */}
                {txn.counterparty_name ? (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={config.bgColor}>
                      {getInitials(txn.counterparty_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={`h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {txn.counterparty_name || config.label}
                    </p>
                    {txn.type === "deposit" && (
                      <Badge variant="outline" className="text-xs">
                        Deposit
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {txn.description || (txn.counterparty_wallet_id && `Wallet: ${txn.counterparty_wallet_id}`)}
                  </p>
                </div>

                {/* Amount & Time */}
                <div className="text-right">
                  <p className={`font-semibold ${config.color}`}>
                    {config.sign}{formatCurrency(txn.amount_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(txn.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
