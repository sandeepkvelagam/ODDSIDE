import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../styles/liquidGlass";

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = [
  { symbol: "♠", name: "spades", color: "#000" },
  { symbol: "♥", name: "hearts", color: "#DC2626" },
  { symbol: "♦", name: "diamonds", color: "#DC2626" },
  { symbol: "♣", name: "clubs", color: "#000" },
];

type Card = { rank: string; suit: string } | null;

export function PokerAIScreen() {
  const { colors, isDark } = useTheme();

  // Card state
  const [handCards, setHandCards] = useState<Card[]>([null, null]);
  const [communityCards, setCommunityCards] = useState<Card[]>([null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<{ type: "hand" | "community"; index: number } | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [showHand, setShowHand] = useState(true); // Toggle to hide/show your hand

  // Consent & submission
  const [consentChecked, setConsentChecked] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for duplicate cards
  const allCards = [...handCards, ...communityCards].filter(Boolean) as { rank: string; suit: string }[];
  const cardStrings = allCards.map((c) => `${c.rank}${c.suit}`);
  const hasDuplicates = new Set(cardStrings).size !== cardStrings.length;

  // Validation
  const handComplete = handCards.every((c) => c !== null);
  const communityCount = communityCards.filter((c) => c !== null).length;
  const canAnalyze = handComplete && communityCount >= 3 && consentChecked && !hasDuplicates;

  // Set card at selected slot
  const setCard = (rank: string, suit: string) => {
    if (!selectedSlot) return;

    const newCard = { rank, suit };
    if (selectedSlot.type === "hand") {
      const newHand = [...handCards];
      newHand[selectedSlot.index] = newCard;
      setHandCards(newHand);
    } else {
      const newCommunity = [...communityCards];
      newCommunity[selectedSlot.index] = newCard;
      setCommunityCards(newCommunity);
    }

    // Auto-advance to next empty slot
    const allSlots = [
      { type: "hand" as const, cards: selectedSlot.type === "hand" ? [...handCards].map((c, i) => i === selectedSlot.index ? newCard : c) : handCards },
      { type: "community" as const, cards: selectedSlot.type === "community" ? [...communityCards].map((c, i) => i === selectedSlot.index ? newCard : c) : communityCards },
    ];

    for (const { type, cards } of allSlots) {
      for (let i = 0; i < cards.length; i++) {
        if (cards[i] === null && !(type === selectedSlot.type && i === selectedSlot.index)) {
          setSelectedSlot({ type, index: i });
          setSelectedRank(null);
          return;
        }
      }
    }
    setSelectedSlot(null);
    setSelectedRank(null);
  };

  // Clear all cards
  const handleReset = () => {
    setHandCards([null, null]);
    setCommunityCards([null, null, null, null, null]);
    setSelectedSlot(null);
    setSelectedRank(null);
    setSuggestion(null);
    setError(null);
  };

  // Analyze hand
  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setAnalyzing(true);
    setError(null);
    setSuggestion(null);

    try {
      const yourHand = handCards.map((c) => `${c!.rank}${c!.suit}`);
      const community = communityCards.filter(Boolean).map((c) => `${c!.rank}${c!.suit}`);

      const res = await api.post("/ai/poker/analyze", {
        your_hand: yourHand,
        community_cards: community,
      });
      setSuggestion(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // Render card slot
  const renderCardSlot = (card: Card, type: "hand" | "community", index: number, hidden: boolean = false) => {
    const isSelected = selectedSlot?.type === type && selectedSlot?.index === index;
    const suitData = card ? SUITS.find((s) => s.name === card.suit) : null;

    return (
      <TouchableOpacity
        key={`${type}-${index}`}
        style={[
          styles.cardSlot,
          { borderColor: isSelected ? colors.orange : colors.glassBorder },
          isSelected && { borderWidth: 2 },
          card && { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
        ]}
        onPress={() => {
          setSelectedSlot({ type, index });
          setSelectedRank(null);
        }}
        activeOpacity={0.7}
      >
        {card ? (
          hidden ? (
            <View style={styles.cardContent}>
              <Ionicons name="eye-off" size={20} color={colors.textMuted} />
            </View>
          ) : (
            <View style={styles.cardContent}>
              <Text style={[styles.cardRank, { color: suitData?.color || colors.textPrimary }]}>
                {card.rank}
              </Text>
              <Text style={[styles.cardSuit, { color: suitData?.color || colors.textPrimary }]}>
                {suitData?.symbol}
              </Text>
            </View>
          )
        ) : (
          <Text style={[styles.cardPlaceholder, { color: colors.textMuted }]}>Tap</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* BETA Badge */}
        <View style={[styles.betaBadge, { backgroundColor: COLORS.glass.glowOrange }]}>
          <Text style={[styles.betaText, { color: colors.orange }]}>BETA</Text>
        </View>

        {/* Disclaimer Banner */}
        <View style={[styles.disclaimerBanner, { backgroundColor: COLORS.glass.glowWarning, borderColor: "rgba(245, 158, 11, 0.3)" }]}>
          <Ionicons name="warning" size={18} color={colors.warning} />
          <Text style={[styles.disclaimerText, { color: colors.warning }]}>
            Suggestions are educational and for entertainment only. They do not guarantee outcomes.
          </Text>
        </View>

        {/* Your Hand */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Hand</Text>
            <TouchableOpacity
              style={[styles.visibilityToggle, { backgroundColor: colors.glassBg }]}
              onPress={() => setShowHand(!showHand)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showHand ? "eye" : "eye-off"} 
                size={18} 
                color={colors.textMuted} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardRow}>
            {handCards.map((card, idx) => renderCardSlot(card, "hand", idx, !showHand))}
          </View>
        </View>

        {/* Community Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Community Cards</Text>
          <View style={styles.cardRow}>
            {communityCards.map((card, idx) => renderCardSlot(card, "community", idx))}
          </View>
        </View>

        {/* Duplicate Warning */}
        {hasDuplicates && (
          <View style={[styles.warningBanner, { backgroundColor: COLORS.glass.glowRed, borderColor: "rgba(239, 68, 68, 0.3)" }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.warningText, { color: colors.danger }]}>Duplicate card detected</Text>
          </View>
        )}

        {/* Card Input */}
        {selectedSlot && (
          <View style={[styles.inputSection, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <Text style={[styles.inputTitle, { color: colors.textSecondary }]}>
              Select {selectedRank ? "Suit" : "Rank"}
            </Text>

            {!selectedRank ? (
              <View style={styles.rankGrid}>
                {RANKS.map((rank) => (
                  <TouchableOpacity
                    key={rank}
                    style={[styles.rankButton, { borderColor: colors.glassBorder }]}
                    onPress={() => setSelectedRank(rank)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.rankButtonText, { color: colors.textPrimary }]}>{rank}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.suitRow}>
                {SUITS.map((suit) => (
                  <TouchableOpacity
                    key={suit.name}
                    style={[styles.suitButton, { borderColor: colors.glassBorder }]}
                    onPress={() => setCard(selectedRank, suit.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suitSymbol, { color: suit.color }]}>{suit.symbol}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Consent Checkbox */}
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setConsentChecked(!consentChecked)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, { borderColor: consentChecked ? colors.orange : colors.glassBorder, backgroundColor: consentChecked ? colors.orange : "transparent" }]}>
            {consentChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={[styles.consentText, { color: colors.textSecondary }]}>
            AI suggestions only - I decide my actions
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: colors.glassBorder }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            <Text style={[styles.resetText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              { backgroundColor: colors.orange },
              !canAnalyze && styles.buttonDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            activeOpacity={0.8}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.analyzeText}>Get Suggestion</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Validation Hints */}
        {!canAnalyze && !suggestion && (
          <View style={styles.hintsContainer}>
            {!handComplete && (
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                • Need {2 - handCards.filter(Boolean).length} more hand card(s)
              </Text>
            )}
            {communityCount < 3 && (
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                • Need {3 - communityCount} more community card(s) (minimum: flop)
              </Text>
            )}
            {!consentChecked && handComplete && communityCount >= 3 && (
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                • Please accept the consent checkbox
              </Text>
            )}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Suggestion Result */}
        {suggestion && (
          <View style={[styles.suggestionCard, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <View style={styles.suggestionHeader}>
              <Ionicons name="bulb" size={20} color={colors.orange} />
              <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>AI Suggestion</Text>
            </View>

            <View style={styles.suggestionContent}>
              {/* Action Badge */}
              <View style={[
                styles.actionBadge,
                suggestion.action === "FOLD" && { backgroundColor: COLORS.glass.glowRed },
                suggestion.action === "CALL" && { backgroundColor: COLORS.glass.glowBlue },
                suggestion.action === "RAISE" && { backgroundColor: COLORS.glass.glowGreen },
                suggestion.action === "CHECK" && { backgroundColor: "rgba(128, 128, 128, 0.15)" },
              ]}>
                <Text style={[
                  styles.actionText,
                  suggestion.action === "FOLD" && { color: colors.danger },
                  suggestion.action === "CALL" && { color: colors.trustBlue },
                  suggestion.action === "RAISE" && { color: colors.success },
                  suggestion.action === "CHECK" && { color: colors.textMuted },
                ]}>
                  {suggestion.action}
                </Text>
              </View>

              {/* Potential */}
              <View style={styles.potentialRow}>
                <Text style={[styles.potentialLabel, { color: colors.textMuted }]}>Potential:</Text>
                <Text style={[
                  styles.potentialValue,
                  suggestion.potential === "High" && { color: colors.success },
                  suggestion.potential === "Medium" && { color: "#fbbf24" },
                  suggestion.potential === "Low" && { color: colors.textMuted },
                ]}>
                  {suggestion.potential}
                </Text>
              </View>

              {/* Reasoning */}
              <Text style={[styles.reasoningText, { color: colors.textSecondary }]}>
                {suggestion.reasoning}
              </Text>

              {/* Hand Strength */}
              {suggestion.hand_strength && (
                <View style={[styles.handStrengthBadge, { backgroundColor: colors.glassBg }]}>
                  <Text style={[styles.handStrengthText, { color: colors.textPrimary }]}>
                    {suggestion.hand_strength}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer Note */}
        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          For learning and practice only
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 28,
  },
  betaBadge: {
    position: "absolute",
    top: 0,
    right: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  betaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 28,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  visibilityToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  cardSlot: {
    width: 56,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    alignItems: "center",
  },
  cardRank: {
    fontSize: 22,
    fontWeight: "700",
  },
  cardSuit: {
    fontSize: 20,
  },
  cardPlaceholder: {
    fontSize: 12,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
  },
  warningText: {
    fontSize: 14,
  },
  inputSection: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  inputTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
    textAlign: "center",
  },
  rankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  rankButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rankButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  suitButton: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  suitSymbol: {
    fontSize: 32,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  consentText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 15,
    fontWeight: "600",
  },
  analyzeButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 52,
  },
  analyzeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  hintsContainer: {
    marginBottom: 18,
    gap: 6,
  },
  hintText: {
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass.glowRed,
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
    gap: 10,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    flex: 1,
  },
  suggestionCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 18,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  suggestionContent: {
    alignItems: "center",
    gap: 16,
  },
  actionBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 24,
    fontWeight: "700",
  },
  potentialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  potentialLabel: {
    fontSize: 14,
  },
  potentialValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  reasoningText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  handStrengthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  handStrengthText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
