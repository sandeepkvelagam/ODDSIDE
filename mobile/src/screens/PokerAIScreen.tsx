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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { getThemedColors, COLORS, SPACING, RADIUS, SHADOWS } from "../styles/liquidGlass";
import { AIGlowBorder } from "../components/ui";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = [
  { symbol: "\u2660", name: "spades", color: "#000" },
  { symbol: "\u2665", name: "hearts", color: "#DC2626" },
  { symbol: "\u2666", name: "diamonds", color: "#DC2626" },
  { symbol: "\u2663", name: "clubs", color: "#000" },
];

type Card = { rank: string; suit: string } | null;

export function PokerAIScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const lc = getThemedColors(isDark, colors);

  // Card state
  const [handCards, setHandCards] = useState<Card[]>([null, null]);
  const [communityCards, setCommunityCards] = useState<Card[]>([null, null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<{ type: "hand" | "community"; index: number } | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [showHand, setShowHand] = useState(true);

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

  // Get suit color - fixes invisible #000 on dark backgrounds
  const getSuitColor = (color: string | undefined) => {
    if (!color) return lc.textPrimary;
    return color === "#000" ? lc.textPrimary : color;
  };

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
          { borderColor: isSelected ? lc.orange : lc.liquidGlassBorder },
          isSelected && { borderWidth: 2, borderStyle: "solid" as any },
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
              <Ionicons name="eye-off" size={20} color={lc.textMuted} />
            </View>
          ) : (
            <View style={styles.cardContent}>
              <Text style={[styles.cardRank, { color: getSuitColor(suitData?.color) }]}>
                {card.rank}
              </Text>
              <Text style={[styles.cardSuit, { color: getSuitColor(suitData?.color) }]}>
                {suitData?.symbol}
              </Text>
            </View>
          )
        ) : (
          <Text style={[styles.cardPlaceholder, { color: lc.textMuted }]}>Tap</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <AIGlowBorder backgroundColor={lc.jetDark}>
      <View style={[styles.wrapper, { paddingTop: insets.top }]}>
        {/* Page Header */}
        <View style={[styles.pageHeader, { borderBottomColor: lc.liquidGlassBorder }]}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: lc.textPrimary }]}>Poker AI</Text>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
            onPress={() => navigation.navigate("Dashboard" as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={20} color={lc.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* BETA Badge */}
          <View style={[styles.betaBadge, { backgroundColor: COLORS.glass.glowOrange }]}>
            <Text style={[styles.betaText, { color: lc.orange }]}>BETA</Text>
          </View>

          {/* Disclaimer Banner */}
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
            <View style={[styles.liquidInner, { backgroundColor: COLORS.glass.glowWarning }]}>
              <View style={styles.disclaimerRow}>
                <Ionicons name="warning" size={18} color={lc.warning} />
                <Text style={[styles.disclaimerText, { color: lc.warning }]}>
                  Suggestions are educational and for entertainment only. They do not guarantee outcomes.
                </Text>
              </View>
            </View>
          </View>

          {/* Card Selection Area */}
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
            <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
              {/* Your Hand */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: lc.textSecondary }]}>Your Hand</Text>
                  <TouchableOpacity
                    style={[styles.visibilityToggle, { backgroundColor: lc.liquidGlassBg }]}
                    onPress={() => setShowHand(!showHand)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showHand ? "eye" : "eye-off"}
                      size={18}
                      color={lc.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardRow}>
                  {handCards.map((card, idx) => renderCardSlot(card, "hand", idx, !showHand))}
                </View>
              </View>

              {/* Community Cards */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: lc.textSecondary }]}>Community Cards</Text>
                <View style={styles.cardRow}>
                  {communityCards.map((card, idx) => renderCardSlot(card, "community", idx))}
                </View>
              </View>

              {/* Duplicate Warning */}
              {hasDuplicates && (
                <View style={[styles.warningBanner, { backgroundColor: COLORS.glass.glowRed, borderColor: "rgba(239, 68, 68, 0.3)" }]}>
                  <Ionicons name="alert-circle" size={16} color={lc.danger} />
                  <Text style={[styles.warningText, { color: lc.danger }]}>Duplicate card detected</Text>
                </View>
              )}

              {/* Card Input (Rank/Suit Picker) */}
              {selectedSlot && (
                <View style={[styles.inputSection, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
                  <Text style={[styles.inputTitle, { color: lc.textSecondary }]}>
                    Select {selectedRank ? "Suit" : "Rank"}
                  </Text>

                  {!selectedRank ? (
                    <View style={styles.rankGrid}>
                      {RANKS.map((rank) => (
                        <TouchableOpacity
                          key={rank}
                          style={[styles.rankButton, { borderColor: lc.liquidGlassBorder }]}
                          onPress={() => setSelectedRank(rank)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.rankButtonText, { color: lc.textPrimary }]}>{rank}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.suitRow}>
                      {SUITS.map((suit) => (
                        <TouchableOpacity
                          key={suit.name}
                          style={[styles.suitButton, { borderColor: lc.liquidGlassBorder }]}
                          onPress={() => setCard(selectedRank, suit.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.suitSymbol, { color: getSuitColor(suit.color) }]}>{suit.symbol}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Consent Checkbox */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsentChecked(!consentChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: consentChecked ? lc.orange : lc.liquidGlassBorder, backgroundColor: consentChecked ? lc.orange : "transparent" }]}>
              {consentChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={[styles.consentText, { color: lc.textSecondary }]}>
              AI suggestions only - I decide my actions
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: lc.liquidGlassBorder }]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={lc.textSecondary} />
              <Text style={[styles.resetText, { color: lc.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                { backgroundColor: lc.orange },
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
                <Text style={[styles.hintText, { color: lc.textMuted }]}>
                  • Need {2 - handCards.filter(Boolean).length} more hand card(s)
                </Text>
              )}
              {communityCount < 3 && (
                <Text style={[styles.hintText, { color: lc.textMuted }]}>
                  • Need {3 - communityCount} more community card(s) (minimum: flop)
                </Text>
              )}
              {!consentChecked && handComplete && communityCount >= 3 && (
                <Text style={[styles.hintText, { color: lc.textMuted }]}>
                  • Please accept the consent checkbox
                </Text>
              )}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: COLORS.glass.glowRed }]}>
              <Ionicons name="alert-circle" size={16} color="#fca5a5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Suggestion Result */}
          {suggestion && (
            <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
              <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
                <View style={styles.suggestionHeader}>
                  <Ionicons name="bulb" size={20} color={lc.orange} />
                  <Text style={[styles.suggestionTitle, { color: lc.textPrimary }]}>AI Suggestion</Text>
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
                      suggestion.action === "FOLD" && { color: lc.danger },
                      suggestion.action === "CALL" && { color: lc.trustBlue },
                      suggestion.action === "RAISE" && { color: lc.success },
                      suggestion.action === "CHECK" && { color: lc.textMuted },
                    ]}>
                      {suggestion.action}
                    </Text>
                  </View>

                  {/* Potential */}
                  <View style={styles.potentialRow}>
                    <Text style={[styles.potentialLabel, { color: lc.textMuted }]}>Potential:</Text>
                    <Text style={[
                      styles.potentialValue,
                      suggestion.potential === "High" && { color: lc.success },
                      suggestion.potential === "Medium" && { color: "#fbbf24" },
                      suggestion.potential === "Low" && { color: lc.textMuted },
                    ]}>
                      {suggestion.potential}
                    </Text>
                  </View>

                  {/* Reasoning */}
                  <Text style={[styles.reasoningText, { color: lc.textSecondary }]}>
                    {suggestion.reasoning}
                  </Text>

                  {/* Hand Strength */}
                  {suggestion.hand_strength && (
                    <View style={[styles.handStrengthBadge, { backgroundColor: lc.liquidGlassBg }]}>
                      <Text style={[styles.handStrengthText, { color: lc.textPrimary }]}>
                        {suggestion.hand_strength}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Footer Note */}
          <Text style={[styles.footerNote, { color: lc.textMuted }]}>
            For learning and practice only
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </AIGlowBorder>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.container,
    gap: SPACING.sectionGap,
  },
  betaBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  betaText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Liquid Glass Card pattern
  liquidCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.innerPadding,
    borderWidth: 1.5,
    ...SHADOWS.glassCard,
  },
  liquidInner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },

  // Disclaimer
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: SPACING.sectionGap,
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

  // Card slots
  cardRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  cardSlot: {
    width: 52,
    height: 76,
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
    fontSize: 20,
    fontWeight: "700",
  },
  cardSuit: {
    fontSize: 18,
  },
  cardPlaceholder: {
    fontSize: 11,
  },

  // Warnings
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
  },

  // Card input
  inputSection: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rankButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  suitButton: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  suitSymbol: {
    fontSize: 30,
  },

  // Consent
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: 14,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
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
    paddingVertical: 14,
    borderRadius: RADIUS.md,
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

  // Hints
  hintsContainer: {
    gap: 6,
  },
  hintText: {
    fontSize: 13,
  },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    flex: 1,
  },

  // Suggestion
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
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
    borderRadius: RADIUS.md,
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
    borderRadius: RADIUS.sm,
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
