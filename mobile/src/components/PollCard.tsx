import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getThemedColors } from "../styles/liquidGlass";

type PollOption = {
  option_id: string;
  label: string;
  votes: string[];
};

type PollData = {
  poll_id: string;
  question: string;
  options: PollOption[];
  status: "active" | "closed" | "resolved";
  winning_option?: string;
  expires_at?: string;
  created_by: string;
};

type PollCardProps = {
  poll: PollData;
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
  onVote: (pollId: string, optionId: string) => Promise<void>;
  onClose?: (pollId: string) => Promise<void>;
  voting?: boolean;
};

export function PollCard({
  poll,
  currentUserId,
  isAdmin,
  onVote,
  onClose,
  voting,
}: PollCardProps) {
  const { isDark, colors } = useTheme();
  const lc = getThemedColors(isDark, colors);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  const userVotedOption = poll.options.find((opt) =>
    opt.votes.includes(currentUserId)
  );
  const isActive = poll.status === "active";
  const isResolved = poll.status === "resolved";
  const canClose = isAdmin || poll.created_by === currentUserId;

  // Time remaining
  let timeLeft = "";
  if (poll.expires_at && isActive) {
    const diff = new Date(poll.expires_at).getTime() - Date.now();
    if (diff > 0) {
      const hours = Math.floor(diff / 3600000);
      if (hours > 24) {
        timeLeft = `${Math.floor(hours / 24)}d left`;
      } else if (hours > 0) {
        timeLeft = `${hours}h left`;
      } else {
        timeLeft = `${Math.floor(diff / 60000)}m left`;
      }
    } else {
      timeLeft = "Expired";
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: lc.liquidGlassBg,
          borderColor: lc.liquidGlassBorder,
        },
      ]}
    >
      {/* Question */}
      <View style={styles.header}>
        <Ionicons name="bar-chart-outline" size={16} color={lc.moonstone} />
        <Text style={[styles.question, { color: lc.textPrimary }]} numberOfLines={3}>
          {poll.question}
        </Text>
      </View>

      {/* Options */}
      {poll.options.map((option) => {
        const voteCount = option.votes.length;
        const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
        const isUserVote = userVotedOption?.option_id === option.option_id;
        const isWinner = isResolved && poll.winning_option === option.option_id;

        return (
          <TouchableOpacity
            key={option.option_id}
            style={[
              styles.option,
              {
                borderColor: isWinner
                  ? lc.orange
                  : isUserVote
                  ? lc.trustBlue
                  : lc.liquidGlassBorder,
                backgroundColor: isWinner
                  ? lc.liquidGlowOrange
                  : isUserVote
                  ? lc.glowBlue
                  : "transparent",
              },
            ]}
            onPress={() => isActive && !voting && onVote(poll.poll_id, option.option_id)}
            disabled={!isActive || voting}
            activeOpacity={0.7}
          >
            {/* Progress bar */}
            <View
              style={[
                styles.progressBar,
                {
                  width: `${pct}%`,
                  backgroundColor: isWinner
                    ? "rgba(238, 108, 41, 0.2)"
                    : isUserVote
                    ? "rgba(59, 130, 246, 0.15)"
                    : lc.liquidInnerBg,
                },
              ]}
            />
            <View style={styles.optionContent}>
              <View style={styles.optionLeft}>
                {isWinner && (
                  <Ionicons name="trophy" size={14} color={lc.orange} style={{ marginRight: 6 }} />
                )}
                {isUserVote && !isWinner && (
                  <Ionicons name="checkmark-circle" size={14} color={lc.trustBlue} style={{ marginRight: 6 }} />
                )}
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: isWinner ? lc.orange : lc.textPrimary,
                      fontWeight: isUserVote || isWinner ? "600" : "400",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </View>
              <Text style={[styles.optionVotes, { color: lc.textMuted }]}>
                {voteCount}{totalVotes > 0 ? ` (${Math.round(pct)}%)` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: lc.textMuted }]}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {timeLeft ? ` · ${timeLeft}` : ""}
          {isResolved ? " · Resolved" : ""}
        </Text>
        {isActive && canClose && onClose && (
          <TouchableOpacity
            onPress={() => onClose(poll.poll_id)}
            style={[styles.closeButton, { borderColor: lc.liquidGlassBorder }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeText, { color: lc.textMuted }]}>Close Poll</Text>
          </TouchableOpacity>
        )}
      </View>

      {voting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={lc.trustBlue} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  question: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  option: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 10,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    flex: 1,
  },
  optionVotes: {
    fontSize: 12,
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  footerText: {
    fontSize: 12,
  },
  closeButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
