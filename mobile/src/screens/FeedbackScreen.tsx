import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useHaptics } from "../context/HapticsContext";
import { api } from "../api/client";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { GlassSurface } from "../components/ui/GlassSurface";
import { GlassButton } from "../components/ui/GlassButton";
import { StarRating } from "../components/ui/StarRating";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../styles/liquidGlass";

// ── Copy map (single source of truth) ────────────────────────────────

const COPY = {
  header: {
    title: "Report an Issue",
    subtitle: "Every submission is reviewed by our team.",
  },
  type: {
    label: "CATEGORY",
    helper: "Select the option that best reflects your experience.",
  },
  details: {
    label: "DETAILS",
    helper: "Include steps to reproduce, expected behavior, and what occurred.",
  },
  severity: {
    label: "IMPACT",
    helper: "Rate the impact on your experience.",
  },
  submit: {
    button: "Submit Report",
    disclaimer: "Your report is linked to your account for follow-up.",
  },
  success: {
    title: "Thank You",
    body: "We've logged your report and routed it for review. If we need clarification, we'll reach out.",
    bodyPraise: "We appreciate the kind words — it means a lot to our team.",
    ticketLabel: "Reference ID",
    done: "Done",
  },
  errors: {
    noType: { title: "Select a category", msg: "Choose the type of feedback." },
    noContent: { title: "Add details", msg: "Please add a brief description before submitting." },
    generic: "We couldn't submit your report at this time. Please try again in a moment.",
  },
};

const MAX_CONTENT_LENGTH = 1000;

const FEEDBACK_TYPES = [
  { key: "bug", label: "Bug Report", icon: "bug-outline" as const, color: COLORS.status.danger },
  { key: "feature_request", label: "Feature Request", icon: "bulb-outline" as const, color: COLORS.status.warning },
  { key: "ux_issue", label: "UX Issue", icon: "hand-left-outline" as const, color: COLORS.trustBlue },
  { key: "complaint", label: "Complaint", icon: "sad-outline" as const, color: "#9333EA" },
  { key: "praise", label: "Praise", icon: "heart-outline" as const, color: COLORS.status.success },
  { key: "other", label: "Other", icon: "chatbox-outline" as const, color: COLORS.moonstone },
];

/**
 * FeedbackScreen - Fortune 500-grade feedback submission form.
 *
 * Accessible from Settings > "Report an Issue".
 * Bottom-sheet presentation with staggered entrance animations.
 *
 * Features:
 * - Category selector with checkmark badges
 * - Custom glass textarea with focus animation and character count
 * - Optional impact/severity rating for bugs and complaints
 * - Submits to POST /feedback, shows Reference ID on success
 * - Premium warm copy throughout
 */
export function FeedbackScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { triggerHaptic } = useHaptics();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Textarea focus animation
  const focusProgress = useSharedValue(0);
  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.glassBorder, COLORS.input.focusBorder],
    ),
  }));

  const getPlaceholder = () => {
    switch (selectedType) {
      case "bug":
        return "Describe what happened, what you expected, and what you observed\u2026";
      case "feature_request":
        return "What feature would you like to see? How would it help you?";
      case "ux_issue":
        return "What was confusing or difficult to use?";
      case "complaint":
        return "What went wrong? We want to make it right.";
      case "praise":
        return "What did you enjoy? We appreciate the feedback.";
      default:
        return "Tell us about your experience\u2026";
    }
  };

  const getCharCountColor = () => {
    if (content.length >= MAX_CONTENT_LENGTH) return COLORS.status.danger;
    if (content.length >= MAX_CONTENT_LENGTH * 0.8) return COLORS.status.warning;
    return colors.textMuted;
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert(COPY.errors.noType.title, COPY.errors.noType.msg);
      return;
    }
    if (!content.trim()) {
      Alert.alert(COPY.errors.noContent.title, COPY.errors.noContent.msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/feedback", {
        feedback_type: selectedType,
        content: content.trim(),
        tags: severity > 0 ? [`severity_${severity}`] : [],
        context: {
          source: "mobile_feedback_screen",
          severity_rating: severity || undefined,
        },
      });

      const feedbackId = res.data?.data?.feedback_id;
      setTicketId(feedbackId || null);
      triggerHaptic("medium");
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || COPY.errors.generic;
      Alert.alert("Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success State ──────────────────────────────────────────────────

  if (submitted) {
    return (
      <BottomSheetScreen>
        <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
          <View style={styles.successContainer}>
            <Animated.View entering={FadeIn.delay(100).springify()}>
              <View style={[styles.successIcon, { backgroundColor: COLORS.glass.glowGreen }]}>
                <Ionicons name="checkmark-circle" size={56} color={COLORS.status.success} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).springify().damping(12)}>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                {COPY.success.title}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).springify().damping(12)}>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                {selectedType === "praise" ? COPY.success.bodyPraise : COPY.success.body}
              </Text>
            </Animated.View>

            {ticketId && (
              <Animated.View entering={FadeInDown.delay(550).springify().damping(12)}>
                <View style={styles.ticketContainer}>
                  <Text style={[styles.ticketLabel, { color: colors.textMuted }]}>
                    {COPY.success.ticketLabel}
                  </Text>
                  <View style={[styles.ticketPill, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
                    <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.ticketId, { color: colors.textPrimary }]}>
                      {ticketId}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(700).springify().damping(12)} style={styles.successButtonWrap}>
              <GlassButton
                variant="primary"
                size="large"
                fullWidth
                onPress={() => navigation.goBack()}
              >
                {COPY.success.done}
              </GlassButton>
            </Animated.View>
          </View>
        </View>
      </BottomSheetScreen>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────────

  const showSeverity = selectedType === "bug" || selectedType === "complaint";

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && styles.closeButtonPressed,
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {COPY.header.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {COPY.header.subtitle}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* ── Card A: Category Selector ── */}
          <Animated.View entering={FadeInDown.delay(100).springify().damping(14)}>
            <GlassSurface noPadding style={styles.sectionCard}>
              <View style={styles.sectionInner}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {COPY.type.label}
                </Text>
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  {COPY.type.helper}
                </Text>
                <View style={styles.typeGrid}>
                  {FEEDBACK_TYPES.map((type) => {
                    const isSelected = selectedType === type.key;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: isSelected ? type.color + "20" : colors.glassBg,
                            borderColor: isSelected ? type.color : colors.glassBorder,
                            borderWidth: isSelected ? 2 : 1.5,
                          },
                          isSelected && {
                            ...SHADOWS.subtle,
                            shadowColor: type.color,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedType(type.key);
                          triggerHaptic("selection");
                        }}
                      >
                        <Ionicons
                          name={type.icon}
                          size={18}
                          color={isSelected ? type.color : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.typeLabel,
                            { color: isSelected ? type.color : colors.textPrimary },
                          ]}
                        >
                          {type.label}
                        </Text>
                        {isSelected && (
                          <View style={[styles.chipCheck, { backgroundColor: type.color }]}>
                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </GlassSurface>
          </Animated.View>

          {/* ── Card B: Details TextArea ── */}
          <Animated.View entering={FadeInDown.delay(200).springify().damping(14)}>
            <GlassSurface noPadding style={styles.sectionCard}>
              <View style={styles.sectionInner}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {COPY.details.label}
                </Text>
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  {COPY.details.helper}
                </Text>
                <Animated.View
                  style={[
                    styles.textAreaWrap,
                    { backgroundColor: colors.inputBg },
                    animatedBorder,
                  ]}
                >
                  <TextInput
                    placeholder={getPlaceholder()}
                    placeholderTextColor={colors.textMuted}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={MAX_CONTENT_LENGTH}
                    style={[styles.textArea, { color: colors.textPrimary }]}
                    textAlignVertical="top"
                    onFocus={() => {
                      focusProgress.value = withTiming(1, { duration: 200 });
                    }}
                    onBlur={() => {
                      focusProgress.value = withTiming(0, { duration: 200 });
                    }}
                  />
                </Animated.View>
                <View style={styles.charCountRow}>
                  <Text style={[styles.charCount, { color: getCharCountColor() }]}>
                    {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
                  </Text>
                </View>
              </View>
            </GlassSurface>
          </Animated.View>

          {/* ── Card C: Impact / Severity (conditional) ── */}
          {showSeverity && (
            <Animated.View entering={FadeInDown.delay(300).springify().damping(14)}>
              <GlassSurface noPadding style={styles.sectionCard}>
                <View style={[styles.sectionInner, styles.severityInner]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {COPY.severity.label}
                  </Text>
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    {COPY.severity.helper}
                  </Text>
                  <StarRating
                    rating={severity}
                    onRatingChange={setSeverity}
                    size="medium"
                    showLabel
                  />
                </View>
              </GlassSurface>
            </Animated.View>
          )}

          {/* ── Submit Area ── */}
          <Animated.View entering={FadeInDown.delay(showSeverity ? 400 : 300).springify().damping(14)}>
            <View style={[styles.submitDivider, { backgroundColor: colors.glassBorder }]} />
            <GlassButton
              variant="secondary"
              size="large"
              fullWidth
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!selectedType || !content.trim()}
              style={styles.submitButton}
            >
              {COPY.submit.button}
            </GlassButton>
            <Text style={[styles.submitDisclaimer, { color: colors.textMuted }]}>
              {COPY.submit.disclaimer}
            </Text>
          </Animated.View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </BottomSheetScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.micro,
    marginTop: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.container,
  },

  // Section cards
  sectionCard: {
    marginBottom: SPACING.lg,
  },
  sectionInner: {
    padding: SPACING.cardPadding,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  helperText: {
    fontSize: TYPOGRAPHY.sizes.caption,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },

  // Type chips
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  chipCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -2,
  },

  // Custom textarea
  textAreaWrap: {
    minHeight: 160,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    overflow: "hidden",
  },
  textArea: {
    minHeight: 136,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 24,
    padding: 0,
  },
  charCountRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SPACING.xs,
  },
  charCount: {
    fontSize: TYPOGRAPHY.sizes.micro,
  },

  // Severity
  severityInner: {
    alignItems: "center",
  },

  // Submit
  submitDivider: {
    height: 1,
    marginBottom: SPACING.lg,
  },
  submitButton: {
    marginBottom: SPACING.md,
  },
  submitDisclaimer: {
    fontSize: TYPOGRAPHY.sizes.micro,
    textAlign: "center",
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.container,
    gap: SPACING.lg,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: TYPOGRAPHY.sizes.heading2,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: SPACING.xl,
  },
  successButtonWrap: {
    width: "100%",
    paddingHorizontal: SPACING.xl,
  },

  // Ticket pill
  ticketContainer: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  ticketLabel: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  ticketPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  ticketId: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
});
