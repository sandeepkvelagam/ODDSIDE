import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface Transaction {
  transaction_id: string;
  type: string;
  amount_cents: number;
  description: string;
  created_at: string;
  counterparty?: { name?: string; wallet_id?: string };
  status?: string;
}

interface WalletData {
  wallet_id: string | null;
  balance_cents: number;
  currency: string;
  status: string;
  has_pin: boolean;
}

type FilterType = "All" | "Most recent" | "Pending" | "Declined";

const FILTERS: FilterType[] = ["All", "Most recent", "Pending", "Declined"];

function getTransactionIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "transfer_out": return "arrow-up-circle";
    case "transfer_in": return "arrow-down-circle";
    case "deposit": return "add-circle";
    case "settlement_credit": return "checkmark-circle";
    default: return "swap-horizontal";
  }
}

function getTransactionColor(type: string): string {
  switch (type) {
    case "transfer_out": return COLORS.status.danger;
    case "transfer_in": return COLORS.status.success;
    case "deposit": return COLORS.trustBlue;
    case "settlement_credit": return COLORS.status.success;
    default: return COLORS.moonstone;
  }
}

function getTransactionStatus(type: string): string {
  // In this data model, all fetched transactions are completed;
  // we map to status labels based on type conventions.
  if (type === "transfer_out" || type === "transfer_in" || type === "deposit" || type === "settlement_credit") {
    return "Completed";
  }
  return "Completed";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTransactionTitle(tx: Transaction): string {
  if (tx.description) return tx.description;
  switch (tx.type) {
    case "transfer_out":
      return `To ${tx.counterparty?.name || tx.counterparty?.wallet_id || "Wallet"}`;
    case "transfer_in":
      return `From ${tx.counterparty?.name || "Wallet"}`;
    case "deposit":
      return "Deposit";
    case "settlement_credit":
      return "Settlement";
    default:
      return "Transaction";
  }
}

function StatusChip({ status }: { status: string }) {
  let bg: string;
  let textColor: string;

  switch (status) {
    case "Pending":
      bg = "rgba(245,158,11,0.15)";
      textColor = COLORS.status.warning;
      break;
    case "Declined":
      bg = "rgba(239,68,68,0.15)";
      textColor = COLORS.status.danger;
      break;
    default:
      bg = "rgba(34,197,94,0.12)";
      textColor = COLORS.status.success;
  }

  return (
    <View style={[chipStyles.chip, { backgroundColor: bg }]}>
      <Text style={[chipStyles.text, { color: textColor }]}>{status}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: "center",
  },
  text: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
});

interface ThemeColors {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glassBg: string;
  glassBorder: string;
}

interface WalletTransactionListProps {
  transactions: Transaction[];
  wallet: WalletData | null;
  tc: ThemeColors;
}

export function WalletTransactionList({ transactions, wallet: _, tc }: WalletTransactionListProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const filtered = useMemo(() => {
    switch (selectedFilter) {
      case "Most recent":
        return [...transactions].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "Pending":
        // No pending status in current API; show empty gracefully
        return transactions.filter((t) => (t.status ?? "").toLowerCase() === "pending");
      case "Declined":
        return transactions.filter((t) => (t.status ?? "").toLowerCase() === "declined");
      default:
        return transactions;
    }
  }, [transactions, selectedFilter]);

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tc.textPrimary }]}>Transactions history</Text>
        <View style={[styles.monthBadge, { backgroundColor: tc.glassBg, borderColor: tc.glassBorder }]}>
          <Text style={[styles.monthText, { color: tc.textSecondary }]}>{monthLabel}</Text>
          <Text style={[styles.monthText, { color: tc.textSecondary }]}> ▾</Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContent}
      >
        {FILTERS.map((f) => {
          const isActive = selectedFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.pill,
                { backgroundColor: tc.glassBg, borderColor: tc.glassBorder },
                isActive && styles.pillActive,
              ]}
              onPress={() => setSelectedFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, { color: tc.textSecondary }, isActive && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <View style={[styles.listCard, { backgroundColor: tc.glassBg, borderColor: tc.glassBorder }]}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={tc.textMuted} />
            <Text style={[styles.emptyTitle, { color: tc.textSecondary }]}>No transactions yet</Text>
            <Text style={[styles.emptySub, { color: tc.textMuted }]}>
              {selectedFilter !== "All"
                ? `No ${selectedFilter.toLowerCase()} transactions`
                : "Deposit or receive money to get started"}
            </Text>
          </View>
        ) : (
          filtered.map((tx, idx) => {
            const isOut = tx.type === "transfer_out";
            const color = getTransactionColor(tx.type);
            const status = getTransactionStatus(tx.type);
            const title = getTransactionTitle(tx);
            const amountDollars = (Math.abs(tx.amount_cents) / 100).toFixed(2);

            return (
              <View
                key={tx.transaction_id || idx}
                style={[
                  styles.txRow,
                  idx < filtered.length - 1 && [styles.txRowBorder, { borderBottomColor: tc.glassBorder }],
                ]}
              >
                {/* Icon */}
                <View style={[styles.txIcon, { backgroundColor: `${color}20` }]}>
                  <Ionicons
                    name={getTransactionIcon(tx.type)}
                    size={20}
                    color={color}
                  />
                </View>

                {/* Text info */}
                <View style={styles.txInfo}>
                  <Text style={[styles.txTitle, { color: tc.textPrimary }]} numberOfLines={1}>{title}</Text>
                  <Text style={[styles.txSubtitle, { color: tc.textMuted }]}>{formatDate(tx.created_at)}</Text>
                </View>

                {/* Right: amount + status */}
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color }]}>
                    {isOut ? "−" : "+"}${amountDollars}
                  </Text>
                  <StatusChip status={status} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  monthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  monthText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  pillsScroll: {
    marginBottom: SPACING.md,
  },
  pillsContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  pill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  pillActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  pillText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  listCard: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
    gap: 3,
  },
  txTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  txSubtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
  },
  txRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  txAmount: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxxl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  emptySub: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    maxWidth: 220,
  },
});
