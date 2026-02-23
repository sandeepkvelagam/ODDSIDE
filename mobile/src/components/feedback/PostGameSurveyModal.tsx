import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useHaptics } from "../../context/HapticsContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { GlassModal } from "../ui/GlassModal";
import { GlassButton } from "../ui/GlassButton";
import { GlassInput } from "../ui/GlassInput";
import { StarRating } from "../ui/StarRating";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface PostGameSurveyModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  groupId?: string;
}

/**
 * PostGameSurveyModal - Shown after a game ends to collect player feedback.
 *
 * Flow:
 * 1. Star rating (1-5) with animated selection
 * 2. Optional comment text input
 * 3. Submit -> POST /feedback/survey
 * 4. Success state with thank-you message
 *
 * Triggered by push notification deep link or in-app event after game_ended.
 */
export function PostGameSurveyModal({
  visible,
  onClose,
  gameId,
  groupId,
}: PostGameSurveyModalProps) {
  const { colors } = useTheme();
  const { triggerHaptic } = useHaptics();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/feedback/survey", {
        game_id: gameId,
        group_id: groupId,
        rating,
        comment: comment.trim(),
      });

      triggerHaptic("medium");
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to submit survey. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state for next use
    setRating(0);
    setComment("");
    setSubmitted(false);
    setError("");
    onClose();
  };

  if (submitted) {
    return (
      <GlassModal visible={visible} onClose={handleClose} size="small">
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: COLORS.glass.glowGreen }]}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.status.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            Thanks for the feedback!
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            {rating >= 4
              ? "Glad you enjoyed the game!"
              : "We'll use your feedback to make things better."}
          </Text>
          <GlassButton variant="ghost" onPress={handleClose} fullWidth>
            Done
          </GlassButton>
        </View>
      </GlassModal>
    );
  }

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      title="How was your game?"
      subtitle="Your feedback helps improve the experience"
      size="medium"
      avoidKeyboard
    >
      <View style={styles.content}>
        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            size="large"
            showLabel
          />
        </View>

        {/* Comment Input */}
        <GlassInput
          label="ANYTHING ELSE? (OPTIONAL)"
          placeholder={
            rating <= 2
              ? "What went wrong? We want to fix it..."
              : "Any thoughts or suggestions..."
          }
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
          style={styles.commentInput}
          containerStyle={styles.commentContainer}
        />

        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: COLORS.glass.glowRed }]}>
            <Ionicons name="alert-circle" size={16} color={COLORS.status.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <GlassButton
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={rating === 0}
        >
          Submit Rating
        </GlassButton>

        {/* Skip */}
        <GlassButton
          variant="ghost"
          size="small"
          onPress={handleClose}
          style={styles.skipButton}
        >
          Skip for now
        </GlassButton>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
  },
  ratingSection: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  commentContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  commentInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: SPACING.md,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.status.danger,
    fontSize: TYPOGRAPHY.sizes.caption,
    flex: 1,
  },
  skipButton: {
    alignSelf: "center",
    marginTop: SPACING.md,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    paddingHorizontal: SPACING.xl,
  },
});
