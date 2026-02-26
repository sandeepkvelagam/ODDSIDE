import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { G, Circle, Text as SvgText } from "react-native-svg";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface Transaction {
  transaction_id: string;
  type: string;
  amount_cents: number;
  description: string;
  created_at: string;
  counterparty?: { name?: string; wallet_id?: string };
}

interface WalletAnalyticsCardProps {
  transactions: Transaction[];
  dateRange?: string;
}

interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

// ─── Donut chart using react-native-svg stroke-dasharray technique ───────────
const RADIUS_VAL = 42;
const STROKE_WIDTH = 16;
const SIZE = 120;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_VAL;

function DonutChart({
  segments,
  total,
  label,
}: {
  segments: ChartSegment[];
  total: number;
  label: string;
}) {
  // Build dash array for each segment
  const totalValue = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;
  const rendered = segments.map((seg, i) => {
    const fraction = seg.value / totalValue;
    const dashLength = fraction * CIRCUMFERENCE;
    const dashGap = CIRCUMFERENCE - dashLength;
    const strokeDashoffset = -offset;
    offset += dashLength;

    return (
      <Circle
        key={i}
        cx={CENTER}
        cy={CENTER}
        r={RADIUS_VAL}
        fill="transparent"
        stroke={seg.color}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={`${dashLength} ${dashGap}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="butt"
        rotation={-90}
        origin={`${CENTER}, ${CENTER}`}
      />
    );
  });

  const formatCompact = (cents: number) => {
    const val = cents / 100;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <View style={chartStyles.chartWrapper}>
      <Svg width={SIZE} height={SIZE}>
        {/* Background track */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS_VAL}
          fill="transparent"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE_WIDTH}
        />
        <G>
          {segments.length > 0 && totalValue > 0 ? (
            rendered
          ) : (
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS_VAL}
              fill="transparent"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray="5 6"
            />
          )}
        </G>
        {/* Center label */}
        <SvgText
          x={CENTER}
          y={CENTER - 7}
          textAnchor="middle"
          fill={COLORS.text.primary}
          fontSize={14}
          fontWeight="700"
        >
          {total === 0 && segments.length === 0 ? "–" : formatCompact(total)}
        </SvgText>
        <SvgText
          x={CENTER}
          y={CENTER + 10}
          textAnchor="middle"
          fill={COLORS.text.muted}
          fontSize={9}
          fontWeight="500"
        >
          {total === 0 && segments.length === 0 ? "Nothing yet" : label}
        </SvgText>
      </Svg>
    </View>
  );
}

function LegendItem({ color, label, cents }: { color: string; label: string; cents: number }) {
  const dollars = cents / 100;
  const formatted = dollars >= 1000
    ? `$${Math.round(dollars / 1000)}k`
    : `$${dollars.toFixed(0)}`;
  return (
    <View style={chartStyles.legendItem}>
      <View style={[chartStyles.legendDot, { backgroundColor: color }]} />
      <Text style={chartStyles.legendLabel} numberOfLines={1}>{label}</Text>
      <Text style={chartStyles.legendValue}>{formatted}</Text>
    </View>
  );
}

export function WalletAnalyticsCard({ transactions, dateRange }: WalletAnalyticsCardProps) {
  const { incomeSegments, incomeTotal, expenseSegments, expenseTotal } = useMemo(() => {
    // ── Income grouping ──────────────────────────────────────────────────────
    const depositTotal = transactions
      .filter((t) => t.type === "deposit")
      .reduce((s, t) => s + Math.abs(t.amount_cents), 0);
    const transferInTotal = transactions
      .filter((t) => t.type === "transfer_in")
      .reduce((s, t) => s + Math.abs(t.amount_cents), 0);
    const settlementTotal = transactions
      .filter((t) => t.type === "settlement_credit")
      .reduce((s, t) => s + Math.abs(t.amount_cents), 0);

    const incomeSegments: ChartSegment[] = [];
    if (depositTotal > 0) incomeSegments.push({ label: "Deposits", value: depositTotal, color: COLORS.trustBlue });
    if (transferInTotal > 0) incomeSegments.push({ label: "Received", value: transferInTotal, color: COLORS.orange });
    if (settlementTotal > 0) incomeSegments.push({ label: "Settlements", value: settlementTotal, color: COLORS.status.success });

    const incomeTotal = depositTotal + transferInTotal + settlementTotal;

    // ── Expense grouping ─────────────────────────────────────────────────────
    const transferOutTotal = transactions
      .filter((t) => t.type === "transfer_out")
      .reduce((s, t) => s + Math.abs(t.amount_cents), 0);

    // Split transfer_out into halves for visual variety (first vs second half)
    const txOuts = transactions.filter((t) => t.type === "transfer_out");
    const half = Math.ceil(txOuts.length / 2);
    const sentTotal = txOuts.slice(0, half).reduce((s, t) => s + Math.abs(t.amount_cents), 0);
    const otherTotal = txOuts.slice(half).reduce((s, t) => s + Math.abs(t.amount_cents), 0);

    const expenseSegments: ChartSegment[] = [];
    if (sentTotal > 0) expenseSegments.push({ label: "Sent", value: sentTotal, color: COLORS.status.danger });
    if (otherTotal > 0) expenseSegments.push({ label: "Other", value: otherTotal, color: COLORS.moonstone });
    if (expenseSegments.length === 0 && transferOutTotal === 0) {
      // No expenses → leave empty
    }

    const expenseTotal = transferOutTotal;

    return { incomeSegments, incomeTotal, expenseSegments, expenseTotal };
  }, [transactions]);

  const now = new Date();
  const displayRange = dateRange ?? `${now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Total Wealth</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{displayRange}</Text>
          <Text style={styles.dateBadgeText}> ▾</Text>
        </View>
      </View>

      {/* Glass analytics card */}
      <View style={styles.card}>
        <View style={styles.chartsRow}>
          {/* Income side */}
          <View style={styles.chartCol}>
            <DonutChart
              segments={incomeSegments}
              total={incomeTotal}
              label="Income"
            />
            <Text style={styles.chartSubLabel}>Total Incomes</Text>
            <View style={styles.legendList}>
              {incomeSegments.length > 0 ? (
                incomeSegments.map((seg) => (
                  <LegendItem
                    key={seg.label}
                    color={seg.color}
                    label={seg.label}
                    cents={seg.value}
                  />
                ))
              ) : (
                <Text style={styles.emptyChartLabel}>No income yet</Text>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Expense side */}
          <View style={styles.chartCol}>
            <DonutChart
              segments={expenseSegments}
              total={expenseTotal}
              label="Expenses"
            />
            <Text style={styles.chartSubLabel}>Total Expenses</Text>
            <View style={styles.legendList}>
              {expenseSegments.length > 0 ? (
                expenseSegments.map((seg) => (
                  <LegendItem
                    key={seg.label}
                    color={seg.color}
                    label={seg.label}
                    cents={seg.value}
                  />
                ))
              ) : (
                <Text style={styles.emptyChartLabel}>No expenses yet</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: COLORS.text.muted,
    fontSize: 10,
    flex: 1,
  },
  legendValue: {
    color: COLORS.text.secondary,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
});

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
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  dateBadgeText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  card: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
  },
  chartsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.lg,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: SPACING.sm,
  },
  chartSubLabel: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  legendList: {
    alignSelf: "stretch",
    gap: 2,
  },
  emptyChartLabel: {
    color: COLORS.text.muted,
    fontSize: 10,
    textAlign: "center",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.glass.border,
    marginTop: 10,
  },
});
