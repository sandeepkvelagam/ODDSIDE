import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useHaptics } from "../context/HapticsContext";
import { api } from "../api/client";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { GlassInput } from "../components/ui/GlassInput";
import { GlassButton } from "../components/ui/GlassButton";
import { StarRating } from "../components/ui/StarRating";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../styles/liquidGlass";

const FEEDBACK_TYPES = [
  { key: "bug", label: "Bug Report", icon: "bug-outline" as const, color: COLORS.status.danger },
  { key: "feature_request", label: "Feature Request", icon: "bulb-outline" as const, color: COLORS.status.warning },
  { key: "ux_issue", label: "UX Issue", icon: "hand-left-outline" as const, color: COLORS.trustBlue },
  { key: "complaint", label: "Complaint", icon: "sad-outline" as const, color: "#9333EA" },
  { key: "praise", label: "Praise", icon: "heart-outline" as const, color: COLORS.status.success },
  { key: "other", label: "Other", icon: "chatbox-outline" as const, color: COLORS.moonstone },
];

/**
 * FeedbackScreen - Full feedback submission form.
 *
 * Accessible from Settings > "Report an Issue".
 * Bottom-sheet presentation matching Settings, Profile, etc.
 *
 * Features:
 * - Feedback type selector (bug, feature request, complaint, praise, etc.)
 * - Content text input with placeholder guidance per type
 * - Optional severity rating for bugs
 * - Submits to POST /feedback
 * - Success/error states with haptic feedback
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

  const getPlaceholder = () => {
    switch (selectedType) {
      case "bug":
        return "What happened? What did you expect to happen?";
      case "feature_request":
        return "What feature would you like to see?";
      case "ux_issue":
        return "What was confusing or hard to use?";
      case "complaint":
        return "What went wrong? We want to make it right.";
      case "praise":
        return "What did you love? We appreciate the kind words!";
      default:
        return "Tell us what's on your mind...";
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert("Select a type", "Choose the type of feedback.");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Add details", "Describe your feedback.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/feedback", {
        feedback_type: selectedType,
        content: content.trim(),
        tags: severity > 0 ? [`severity_${severity}`] : [],
        context: {
          source: "mobile_feedback_screen",
          severity_rating: severity || undefined,
        },
      });

      triggerHaptic("medium");
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Submission unavailable. Please try again.";
      Alert.alert("Submission unavailable", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <BottomSheetScreen>
        <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: COLORS.glass.glowGreen }]}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.status.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Feedback Sent!
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              {selectedType === "praise"
                ? "Thanks for the love! It means a lot to our team."
                : "We'll review this and take action. You'll be notified when there's an update."}
            </Text>
            <GlassButton
              variant="primary"
              size="large"
              fullWidth
              onPress={() => navigation.goBack()}
            >
              Done
            </GlassButton>
          </View>
        </View>
      </BottomSheetScreen>
    );
  }

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && styles.glassButtonPressed,
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Report an Issue</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type Selector */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            WHAT TYPE OF FEEDBACK?
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
                      backgroundColor: isSelected
                        ? type.color + "20"
                        : colors.glassBg,
                      borderColor: isSelected ? type.color : colors.glassBorder,
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
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          <GlassInput
            label="DETAILS"
            placeholder={getPlaceholder()}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            style={styles.contentInput}
            containerStyle={styles.contentContainer}
          />

          {/* Severity (for bugs and complaints) */}
          {(selectedType === "bug" || selectedType === "complaint") && (
            <View style={styles.severitySection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                HOW SEVERE IS THIS?
              </Text>
              <StarRating
                rating={severity}
                onRatingChange={setSeverity}
                size="medium"
                showLabel={false}
              />
              <Text style={[styles.severityHint, { color: colors.textMuted }]}>
                1 = minor annoyance, 5 = can't use the app
              </Text>
            </View>
          )}

          {/* Submit */}
          <GlassButton
            variant="primary"
            size="large"
            fullWidth
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!selectedType || !content.trim()}
            style={styles.submitButton}
          >
            Submit Feedback
          </GlassButton>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  glassButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
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
  contentContainer: {
    marginBottom: SPACING.xxl,
  },
  contentInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: SPACING.md,
  },
  severitySection: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  severityHint: {
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: SPACING.sm,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
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
});
