import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
} from "react-native";
import Reanimated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { usePokerAI } from "../context/PokerAIContext";
import { getThemedColors, COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, SPRINGS, ANIMATION } from "../styles/liquidGlass";
import { AIGlowBorder, SnakeGlowBorder } from "../components/ui";
import { AnimatedModal } from "../components/AnimatedModal";
import { GlassHeader, GLASS_HEADER_HEIGHT } from "../components/ui/GlassHeader";
import { GlassButton, GlassIconButton } from "../components/ui/GlassButton";
import { useScrollGlass } from "../hooks/useScrollGlass";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = [
  { symbol: "\u2660", name: "spades", color: "#000" },
  { symbol: "\u2665", name: "hearts", color: "#DC2626" },
  { symbol: "\u2666", name: "diamonds", color: "#DC2626" },
  { symbol: "\u2663", name: "clubs", color: "#000" },
];

const STRONG_HANDS = ["Royal Flush", "Straight Flush", "Four of a Kind", "Full House", "Flush", "Straight"];
const CONFETTI_COLORS = ["#EE6C29", "#FF6EA8", "#7848FF", "#3B82F6", "#22C55E"];

type Card = { rank: string; suit: string } | null;

/* ─── Animated Card Slot (spring press feedback) ─── */
function AnimatedCardSlot({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style: any }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => { scale.value = withSpring(ANIMATION.scale.cardPressed, SPRINGS.press); }}
        onPressOut={() => { scale.value = withSpring(1, SPRINGS.snap); }}
        activeOpacity={0.9}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Reanimated.View>
  );
}

/* ─── Animated Picker Button (spring press feedback) ─── */
function AnimatedPickerButton({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style: any }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(ANIMATION.scale.pressed, SPRINGS.press); }}
        onPressOut={() => { scale.value = withSpring(1, SPRINGS.snap); }}
        activeOpacity={0.9}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Reanimated.View>
  );
}

/* ─── Confetti Burst Component ─── */
function ConfettiBurst({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 24 }, () => ({
      x: new RNAnimated.Value(0),
      y: new RNAnimated.Value(0),
      rotate: new RNAnimated.Value(0),
      opacity: new RNAnimated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      targetX: (Math.random() - 0.5) * 300,
      targetY: (Math.random() - 0.7) * 400,
      size: 6 + Math.random() * 6,
    }))
  ).current;

  useEffect(() => {
    if (!active) return;

    particles.forEach((p) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.rotate.setValue(0);
      p.opacity.setValue(1);
    });

    RNAnimated.parallel(
      particles.map((p) =>
        RNAnimated.parallel([
          RNAnimated.timing(p.x, { toValue: p.targetX, duration: 1200, useNativeDriver: true }),
          RNAnimated.timing(p.y, { toValue: p.targetY, duration: 1200, useNativeDriver: true }),
          RNAnimated.timing(p.rotate, { toValue: 360, duration: 1200, useNativeDriver: true }),
          RNAnimated.timing(p.opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      )
    ).start();
  }, [active]);

  if (!active) return null;

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <RNAnimated.View
          key={i}
          style={[
            confettiStyles.particle,
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? p.size / 2 : 2,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  particle: {
    position: "absolute",
  },
});

/* ─── PokerAI Screen ─── */
export function PokerAIScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const lc = getThemedColors(isDark, colors);
  const { scrollY, scrollHandler } = useScrollGlass();

  // Persistent state from context (survives navigation)
  const {
    handCards, setHandCards,
    communityCards, setCommunityCards,
    consentChecked, setConsentChecked,
    suggestion, setSuggestion,
    showHand, setShowHand,
    resetAll,
  } = usePokerAI();

  // Transient UI state (local only)
  const [selectedSlot, setSelectedSlot] = useState<{ type: "hand" | "community"; index: number } | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Auto-hide timer for hand privacy
  const revealTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  const revealHand = () => {
    setShowHand(true);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowHand(false), 5000);
  };

  const toggleHandVisibility = () => {
    if (showHand) {
      setShowHand(false);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    } else {
      revealHand();
    }
  };

  // Check for duplicate cards
  const allCards = [...handCards, ...communityCards].filter(Boolean) as { rank: string; suit: string }[];
  const cardStrings = allCards.map((c) => `${c.rank}${c.suit}`);
  const hasDuplicates = new Set(cardStrings).size !== cardStrings.length;

  // Validation
  const handComplete = handCards.every((c) => c !== null);
  const communityCount = communityCards.filter((c) => c !== null).length;
  const canAnalyze = handComplete && communityCount >= 3 && consentChecked && !hasDuplicates;

  // Get suit color — black suits always dark (#1a1a1a) since card bg is white
  const getSuitColor = (color: string | undefined) => {
    if (!color) return lc.suitBlack;
    return color === "#000" ? lc.suitBlack : color;
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
    resetAll();
    setSelectedSlot(null);
    setSelectedRank(null);
    setError(null);
  };

  // Analyze hand
  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalyzing(true);
    setError(null);
    setSuggestion(null);

    try {
      const yourHand = handCards.map((c) => `${c!.rank} of ${c!.suit}`);
      const community = communityCards.filter(Boolean).map((c) => `${c!.rank} of ${c!.suit}`);

      const res = await api.post("/poker/analyze", {
        your_hand: yourHand,
        community_cards: community,
      });
      setSuggestion(res.data);
      setShowResultModal(true);

      // Check for strong hand → confetti + success haptic
      const strength = res.data?.hand_strength || "";
      if (STRONG_HANDS.some((h) => strength.toLowerCase().includes(h.toLowerCase()))) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1500);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // Cancel picker
  const cancelPicker = () => {
    setSelectedSlot(null);
    setSelectedRank(null);
  };

  // Render card slot
  const renderCardSlot = (card: Card, type: "hand" | "community", index: number, hidden: boolean = false) => {
    const isSelected = selectedSlot?.type === type && selectedSlot?.index === index;
    const suitData = card ? SUITS.find((s) => s.name === card.suit) : null;

    return (
      <AnimatedCardSlot
        key={`${type}-${index}`}
        style={[
          styles.cardSlot,
          { borderColor: isSelected ? lc.orange : lc.liquidGlassBorder, backgroundColor: lc.cardSlotBg },
          isSelected && { borderWidth: 2, borderStyle: "solid" as any },
        ]}
        onPress={() => {
          if (type === "hand" && !showHand) revealHand();
          setSelectedSlot({ type, index });
          setSelectedRank(null);
        }}
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
      </AnimatedCardSlot>
    );
  };

  // Suggestion modal content (reused in modal and inline)
  const renderSuggestionContent = (inModal: boolean) => (
    <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
      <View style={[styles.liquidInner, { backgroundColor: inModal ? (isDark ? "#282B2B" : "#FFFFFF") : lc.liquidInnerBg }]}>
        <View style={styles.suggestionHeader}>
          <Ionicons name="bulb" size={20} color={lc.orange} />
          <Text style={[styles.suggestionTitle, { color: lc.textPrimary }]}>AI Suggestion</Text>
        </View>

        <View style={styles.suggestionContent}>
          {/* Action Badge */}
          <View style={[
            styles.actionBadge,
            suggestion?.action === "FOLD" && { backgroundColor: lc.glowRed },
            suggestion?.action === "CALL" && { backgroundColor: lc.glowBlue },
            suggestion?.action === "RAISE" && { backgroundColor: lc.glowGreen },
            suggestion?.action === "CHECK" && { backgroundColor: lc.glassBg },
          ]}>
            <Text style={[
              styles.actionText,
              suggestion?.action === "FOLD" && { color: lc.danger },
              suggestion?.action === "CALL" && { color: lc.trustBlue },
              suggestion?.action === "RAISE" && { color: lc.success },
              suggestion?.action === "CHECK" && { color: lc.textMuted },
            ]}>
              {suggestion?.action}
            </Text>
          </View>

          {/* Potential */}
          <View style={styles.potentialRow}>
            <Text style={[styles.potentialLabel, { color: lc.textSecondary }]}>Potential:</Text>
            <Text style={[
              styles.potentialValue,
              suggestion?.potential === "High" && { color: lc.success },
              suggestion?.potential === "Medium" && { color: lc.warning },
              suggestion?.potential === "Low" && { color: lc.textMuted },
            ]}>
              {suggestion?.potential}
            </Text>
          </View>

          {/* Reasoning */}
          <Text style={[styles.reasoningText, { color: lc.textPrimary }]}>
            {suggestion?.reasoning}
          </Text>

          {/* Hand Strength */}
          {suggestion?.hand_strength && (
            <View style={[styles.handStrengthBadge, { backgroundColor: lc.liquidGlassBg }]}>
              <Text style={[styles.handStrengthText, { color: lc.textPrimary }]}>
                {suggestion.hand_strength}
              </Text>
            </View>
          )}
        </View>

        {/* "Got it" button — only in modal */}
        {inModal && (
          <View style={{ marginTop: SPACING.xl }}>
            <GlassButton
              variant="primaryDark"
              onPress={() => setShowResultModal(false)}
              fullWidth
              size="large"
            >
              Got it
            </GlassButton>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <AIGlowBorder backgroundColor={lc.jetDark}>
      <View style={styles.wrapper}>
        {/* Scroll-aware glass header */}
        <GlassHeader
          scrollY={scrollY}
          title="Poker AI"
          leftElement={
            <GlassIconButton
              icon={<Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />}
              onPress={() => navigation.goBack()}
              variant="ghost"
              size="small"
              accessibilityLabel="Go back"
            />
          }
          rightElement={
            <GlassIconButton
              icon={<Ionicons name="home-outline" size={20} color={COLORS.text.primary} />}
              onPress={() => navigation.navigate("Dashboard" as any)}
              variant="ghost"
              size="small"
              accessibilityLabel="Home"
            />
          }
        />

        <Reanimated.ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: GLASS_HEADER_HEIGHT + insets.top }]}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {/* BETA Badge */}
          <Reanimated.View entering={FadeInDown.springify().damping(SPRINGS.layout.damping)}>
            <View style={[styles.betaBadge, { backgroundColor: lc.liquidGlowOrange }]}>
              <Text style={[styles.betaText, { color: lc.orange }]}>BETA</Text>
            </View>
          </Reanimated.View>

          {/* Disclaimer Banner */}
          <Reanimated.View entering={FadeInDown.delay(50).springify().damping(SPRINGS.layout.damping)}>
            <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
              <View style={[styles.liquidInner, { backgroundColor: lc.glowWarning }]}>
                <View style={styles.disclaimerRow}>
                  <Ionicons name="warning" size={18} color={lc.warning} />
                  <Text style={[styles.disclaimerText, { color: lc.warning }]}>
                    Suggestions are educational and for entertainment only. They do not guarantee outcomes.
                  </Text>
                </View>
              </View>
            </View>
          </Reanimated.View>

          {/* Card Selection Area */}
          <Reanimated.View entering={FadeInDown.delay(100).springify().damping(SPRINGS.layout.damping)}>
            <SnakeGlowBorder
              borderRadius={RADIUS.xxl}
              glowColors={["#EE6C29", "#FF6EA8", "#7848FF"]}
              dashedColor={lc.dashedBorder}
              backgroundColor={lc.liquidGlassBg}
            >
              <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg, borderRadius: RADIUS.xl }]}>
                {/* Your Hand */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: lc.textPrimary }]}>Your Hand</Text>
                    <GlassIconButton
                      icon={<Ionicons name={showHand ? "eye" : "eye-off"} size={18} color={lc.textMuted} />}
                      onPress={toggleHandVisibility}
                      variant="ghost"
                      size="small"
                      accessibilityLabel="Toggle hand visibility"
                    />
                  </View>
                  <View style={styles.cardRow}>
                    {handCards.map((card, idx) => renderCardSlot(card, "hand", idx, !showHand))}
                  </View>
                </View>

                {/* Community Cards */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: lc.textPrimary }]}>Community Cards</Text>
                  <View style={styles.cardRow}>
                    {communityCards.map((card, idx) => renderCardSlot(card, "community", idx))}
                  </View>
                </View>

                {/* Duplicate Warning */}
                {hasDuplicates && (
                  <Reanimated.View entering={FadeInDown.duration(200).springify()}>
                    <View style={[styles.warningBanner, { backgroundColor: lc.glowRed, borderColor: lc.danger + "30" }]}>
                      <Ionicons name="alert-circle" size={16} color={lc.danger} />
                      <Text style={[styles.warningText, { color: lc.danger }]}>Duplicate card detected</Text>
                    </View>
                  </Reanimated.View>
                )}

                {/* Card Input (Rank/Suit Picker) */}
                {selectedSlot && (
                  <Reanimated.View
                    entering={FadeInDown.duration(200).springify().damping(SPRINGS.layout.damping)}
                    exiting={FadeOutDown.duration(150)}
                  >
                    <View style={[styles.inputSection, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
                      {!selectedRank ? (
                        <>
                          <Text style={[styles.inputTitle, { color: lc.textPrimary }]}>
                            Select Rank
                          </Text>
                          <View style={styles.rankGrid}>
                            {RANKS.map((rank) => (
                              <AnimatedPickerButton
                                key={rank}
                                style={[styles.rankButton, { borderColor: lc.liquidGlassBorder, backgroundColor: lc.cardSlotBg }]}
                                onPress={() => setSelectedRank(rank)}
                              >
                                <Text style={[styles.rankButtonText, { color: lc.cardText }]}>{rank}</Text>
                              </AnimatedPickerButton>
                            ))}
                          </View>
                          <TouchableOpacity onPress={cancelPicker} style={styles.cancelButton} activeOpacity={0.7}>
                            <Text style={[styles.cancelText, { color: lc.textMuted }]}>Cancel</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          {/* Back + title row */}
                          <View style={styles.pickerHeaderRow}>
                            <TouchableOpacity onPress={() => setSelectedRank(null)} activeOpacity={0.7}>
                              <Ionicons name="chevron-back" size={20} color={lc.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.inputTitle, { color: lc.textPrimary, marginBottom: 0 }]}>
                              Suit for {selectedRank}
                            </Text>
                          </View>
                          <View style={styles.suitRow}>
                            {SUITS.map((suit) => (
                              <AnimatedPickerButton
                                key={suit.name}
                                style={[styles.suitButton, { borderColor: lc.liquidGlassBorder, backgroundColor: lc.cardSlotBg }]}
                                onPress={() => setCard(selectedRank, suit.name)}
                              >
                                <Text style={[styles.suitSymbol, { color: getSuitColor(suit.color) }]}>{suit.symbol}</Text>
                              </AnimatedPickerButton>
                            ))}
                          </View>
                          <TouchableOpacity onPress={cancelPicker} style={styles.cancelButton} activeOpacity={0.7}>
                            <Text style={[styles.cancelText, { color: lc.textMuted }]}>Cancel</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </Reanimated.View>
                )}
              </View>
            </SnakeGlowBorder>
          </Reanimated.View>

          {/* Consent Checkbox */}
          <Reanimated.View entering={FadeInDown.delay(150).springify().damping(SPRINGS.layout.damping)}>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setConsentChecked(!consentChecked);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, { borderColor: consentChecked ? lc.orange : lc.liquidGlassBorder, backgroundColor: consentChecked ? lc.orange : "transparent" }]}>
                {consentChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={[styles.consentText, { color: lc.textPrimary }]}>
                AI suggestions only - I decide my actions
              </Text>
            </TouchableOpacity>
          </Reanimated.View>

          {/* Action Buttons */}
          <Reanimated.View entering={FadeInDown.delay(200).springify().damping(SPRINGS.layout.damping)}>
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <GlassButton
                  variant="ghost"
                  onPress={handleReset}
                  size="medium"
                  fullWidth
                  leftIcon={<Ionicons name="refresh" size={18} color={lc.textPrimary} />}
                >
                  Reset
                </GlassButton>
              </View>
              <View style={{ flex: 2 }}>
                <GlassButton
                  variant="primaryDark"
                  onPress={handleAnalyze}
                  disabled={!canAnalyze || analyzing}
                  loading={analyzing}
                  size="medium"
                  fullWidth
                  leftIcon={!analyzing ? <Ionicons name="sparkles" size={18} color="#fff" /> : undefined}
                >
                  Get Suggestion
                </GlassButton>
              </View>
            </View>
          </Reanimated.View>

          {/* Validation Hints */}
          {!canAnalyze && !suggestion && (
            <View style={styles.hintsContainer}>
              {!handComplete && (
                <Text style={[styles.hintText, { color: lc.textSecondary }]}>
                  • Need {2 - handCards.filter(Boolean).length} more hand card(s)
                </Text>
              )}
              {communityCount < 3 && (
                <Text style={[styles.hintText, { color: lc.textSecondary }]}>
                  • Need {3 - communityCount} more community card(s) (minimum: flop)
                </Text>
              )}
              {!consentChecked && handComplete && communityCount >= 3 && (
                <Text style={[styles.hintText, { color: lc.textSecondary }]}>
                  • Please accept the consent checkbox
                </Text>
              )}
            </View>
          )}

          {/* Error */}
          {error && (
            <Reanimated.View entering={FadeInDown.duration(200).springify()}>
              <View style={[styles.errorBanner, { backgroundColor: lc.glowRed }]}>
                <Ionicons name="alert-circle" size={16} color={lc.danger} />
                <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
              </View>
            </Reanimated.View>
          )}

          {/* Inline Suggestion Result (persistent, shown after modal dismissal) */}
          {suggestion && !showResultModal && (
            <Reanimated.View entering={FadeInUp.springify().damping(SPRINGS.layout.damping)}>
              {renderSuggestionContent(false)}
            </Reanimated.View>
          )}

          {/* Footer Note */}
          <Text style={[styles.footerNote, { color: lc.textSecondary }]}>
            For learning and practice only
          </Text>

          <View style={{ height: 40 }} />
        </Reanimated.ScrollView>

        {/* Suggestion Preview Modal */}
        <AnimatedModal
          visible={showResultModal}
          onClose={() => setShowResultModal(false)}
        >
          <View style={{ position: "relative" }}>
            <ConfettiBurst active={showConfetti} />
            {renderSuggestionContent(true)}
          </View>
        </AnimatedModal>
      </View>
    </AIGlowBorder>
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
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.bold,
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
    gap: SPACING.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.caption,
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
    marginBottom: SPACING.gap,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
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
    borderRadius: RADIUS.md,
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
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  cardSuit: {
    fontSize: TYPOGRAPHY.sizes.heading3,
  },
  cardPlaceholder: {
    fontSize: TYPOGRAPHY.sizes.micro,
  },

  // Warnings
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  warningText: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },

  // Card input
  inputSection: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  pickerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.gap,
    justifyContent: "center",
  },
  inputTitle: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.gap,
    textAlign: "center",
  },
  rankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "center",
  },
  rankButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rankButtonText: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.lg,
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
  cancelButton: {
    marginTop: SPACING.md,
    alignItems: "center",
  },
  cancelText: {
    fontSize: TYPOGRAPHY.sizes.caption,
  },

  // Consent
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.gap,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  consentText: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    flex: 1,
    lineHeight: 20,
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: SPACING.gap,
  },

  // Hints
  hintsContainer: {
    gap: 6,
  },
  hintText: {
    fontSize: TYPOGRAPHY.sizes.caption,
  },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.gap,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    flex: 1,
  },

  // Suggestion
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: SPACING.lg,
  },
  suggestionTitle: {
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  suggestionContent: {
    alignItems: "center",
    gap: SPACING.lg,
  },
  actionBadge: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionText: {
    fontSize: TYPOGRAPHY.sizes.heading2,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  potentialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  potentialLabel: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  potentialValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  reasoningText: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 22,
    textAlign: "center",
  },
  handStrengthBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  handStrengthText: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  footerNote: {
    fontSize: TYPOGRAPHY.sizes.caption,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});
