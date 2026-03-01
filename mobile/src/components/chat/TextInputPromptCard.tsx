import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { GlassSurface } from "../ui/GlassSurface";
import { GlassButton } from "../ui/GlassButton";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";
import { useTheme } from "../../context/ThemeContext";
import type { TextInputPromptPayload } from "./messageTypes";

interface TextInputPromptCardProps {
  payload: TextInputPromptPayload;
  isLatest: boolean;
  onSubmit: (text: string) => void;
  submittedText?: string;
}

// Simple check for common PII patterns
const PII_PATTERN = /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/;

export function TextInputPromptCard({
  payload,
  isLatest,
  onSubmit,
  submittedText,
}: TextInputPromptCardProps) {
  const { colors: lc } = useTheme();
  const [text, setText] = useState("");
  const minLen = payload.min_length || 0;
  const maxLen = payload.max_length || 1000;
  const isEditable = isLatest && !submittedText;
  const hasPII = PII_PATTERN.test(text);
  const canSubmit = text.length >= minLen && text.length <= maxLen;

  if (!isEditable) {
    // Read-only: show submitted text
    return (
      <GlassSurface style={styles.card} blur={false}>
        <Text style={[styles.prompt, { color: lc.textPrimary }]}>
          {payload.prompt}
        </Text>
        <View style={[styles.readOnlyBox, { backgroundColor: lc.glassBg, borderColor: lc.glassBorder }]}>
          <Text style={[styles.readOnlyText, { color: lc.textSecondary }]}>
            {submittedText || "..."}
          </Text>
        </View>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface style={styles.card} blur={false}>
      <Text style={[styles.prompt, { color: lc.textPrimary }]}>
        {payload.prompt}
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            color: lc.textPrimary,
            backgroundColor: lc.glassBg,
            borderColor: text.length > 0 ? COLORS.orange + "60" : lc.glassBorder,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder={payload.placeholder || "Type here..."}
        placeholderTextColor={lc.textMuted}
        multiline
        maxLength={maxLen}
        textAlignVertical="top"
      />

      <View style={styles.metaRow}>
        <Text
          style={[
            styles.charCount,
            {
              color: text.length < minLen ? COLORS.status.warning : lc.textMuted,
            },
          ]}
        >
          {text.length}/{maxLen}
          {text.length < minLen ? ` (min ${minLen})` : ""}
        </Text>
        {hasPII && (
          <Text style={[styles.piiNudge, { color: COLORS.status.warning }]}>
            Avoid sharing personal info
          </Text>
        )}
      </View>

      <GlassButton
        onPress={() => onSubmit(text)}
        variant="primary"
        size="medium"
        disabled={!canSubmit}
        fullWidth
      >
        {payload.submit_label || "Submit"}
      </GlassButton>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
  },
  prompt: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: SPACING.md,
  },
  input: {
    minHeight: 100,
    maxHeight: 200,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  charCount: {
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  piiNudge: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  readOnlyBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  readOnlyText: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 20,
  },
});
