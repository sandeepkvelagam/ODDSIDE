import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import Animated, {
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassBottomSheet } from "./ui/GlassModal";
import { GlassListSection, GlassListDivider } from "./ui/GlassListItem";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SPRINGS } from "../styles/liquidGlass";
import { getGroupAISettings, updateGroupAISettings } from "../api/groupMessages";

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  isAdmin: boolean;
};

type AISettings = {
  ai_enabled: boolean;
  smart_scheduling: boolean;
  auto_poll_suggestions: boolean;
  chat_summaries: boolean;
  safety_filters: boolean;
};

const DEFAULT_SETTINGS: AISettings = {
  ai_enabled: true,
  smart_scheduling: true,
  auto_poll_suggestions: true,
  chat_summaries: true,
  safety_filters: true,
};

const TOGGLE_CONFIG = [
  {
    key: "ai_enabled" as keyof AISettings,
    icon: "sparkles" as const,
    label: "AI Assistant (Kvitt)",
    description:
      "Kvitt helps schedule games, run polls, summarize decisions, and keep plans on track.",
    color: "#EE6C29",
  },
  {
    key: "smart_scheduling" as keyof AISettings,
    icon: "calendar" as const,
    label: "Smart Scheduling",
    description: "Detects availability talk and offers time suggestions & polls.",
    color: "#3B82F6",
  },
  {
    key: "auto_poll_suggestions" as keyof AISettings,
    icon: "bar-chart" as const,
    label: "Auto Poll Suggestions",
    description: "When the group debates dates, Kvitt recommends a quick poll.",
    color: "#7AA6B3",
  },
  {
    key: "chat_summaries" as keyof AISettings,
    icon: "document-text" as const,
    label: "Chat Summaries",
    description: "Kvitt posts brief recaps after busy threads.",
    color: "#22C55E",
  },
  {
    key: "safety_filters" as keyof AISettings,
    icon: "shield-checkmark" as const,
    label: "Safety Filters",
    description: "Blocks offensive content and de-escalates conflicts.",
    color: "#F59E0B",
  },
];

// ─── Kvitt Orb (small, for header) ───
function KvittOrbSmall() {
  return (
    <LinearGradient
      colors={["#FF8C42", "#FF6EA8", "#EE6C29"]}
      start={{ x: 0.3, y: 0.3 }}
      end={{ x: 0.7, y: 0.9 }}
      style={styles.kvittOrb}
    >
      <View style={styles.kvittOrbHighlight} />
    </LinearGradient>
  );
}

export function GroupChatSettingsSheet({ visible, onClose, groupId, isAdmin }: Props) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible, groupId]);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await getGroupAISettings(groupId);
      setSettings({
        ai_enabled: data.ai_enabled ?? true,
        smart_scheduling: data.smart_scheduling ?? true,
        auto_poll_suggestions: data.auto_poll_suggestions ?? true,
        chat_summaries: data.chat_summaries ?? true,
        safety_filters: data.safety_filters ?? true,
      });
    } catch {
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(key: keyof AISettings, value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Confirm before disabling AI
    if (key === "ai_enabled" && !value) {
      Alert.alert(
        "Disable Kvitt AI",
        "Do you want to disable Kvitt AI for this group?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: () => saveToggle("ai_enabled", false),
          },
        ]
      );
      return;
    }

    await saveToggle(key, value);
  }

  async function saveToggle(key: keyof AISettings, value: boolean) {
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(key);
    try {
      await updateGroupAISettings(groupId, { [key]: value });
    } catch {
      setSettings((s) => ({ ...s, [key]: prev }));
      Alert.alert("Error", "Failed to update setting. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
      <GlassBottomSheet visible={visible} onClose={onClose} title="Chat Settings">
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.trustBlue} />
          </View>
        ) : (
          <>
            {/* Kvitt status pill */}
            <View style={styles.statusRow}>
              <KvittOrbSmall />
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: settings.ai_enabled ? COLORS.status.success : COLORS.status.danger },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: settings.ai_enabled ? COLORS.moonstone : COLORS.text.muted },
                ]}
              >
                {settings.ai_enabled ? "Kvitt is active" : "Kvitt is disabled"}
              </Text>
            </View>

            {/* Toggle section */}
            <GlassListSection title="KVITT AI">
              {TOGGLE_CONFIG.map((toggle, idx) => {
                const isSubToggle = toggle.key !== "ai_enabled";
                const disabled = !isAdmin || (isSubToggle && !settings.ai_enabled);

                return (
                  <React.Fragment key={toggle.key}>
                    <Animated.View
                      entering={FadeInDown.delay(idx * 40)
                        .springify()
                        .damping(SPRINGS.layout.damping)}
                      style={[
                        styles.toggleRow,
                        disabled && isSubToggle && styles.toggleRowDisabled,
                      ]}
                    >
                      <View style={[styles.toggleIcon, { backgroundColor: toggle.color + "18" }]}>
                        <Ionicons name={toggle.icon} size={18} color={toggle.color} />
                      </View>
                      <View style={styles.toggleBody}>
                        <Text style={styles.toggleLabel}>{toggle.label}</Text>
                        <Text style={styles.toggleDesc}>{toggle.description}</Text>
                        {!isAdmin && (
                          <Text style={styles.adminOnly}>Admin only</Text>
                        )}
                      </View>
                      {saving === toggle.key ? (
                        <ActivityIndicator size="small" color={COLORS.trustBlue} />
                      ) : (
                        <Switch
                          value={settings[toggle.key]}
                          onValueChange={(val) => handleToggle(toggle.key, val)}
                          disabled={disabled}
                          trackColor={{ false: "rgba(255,255,255,0.1)", true: COLORS.orange }}
                          thumbColor="#fff"
                        />
                      )}
                    </Animated.View>
                    {idx < TOGGLE_CONFIG.length - 1 && <GlassListDivider />}
                  </React.Fragment>
                );
              })}
            </GlassListSection>

            <View style={{ height: SPACING.xl }} />
          </>
        )}
      </GlassBottomSheet>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  // Status pill
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  kvittOrb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  kvittOrbHighlight: {
    position: "absolute",
    top: 3,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    transform: [{ rotate: "-30deg" }, { scaleX: 0.8 }],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  // Toggle rows
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBody: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: TYPOGRAPHY.sizes.caption,
    lineHeight: 16,
    color: COLORS.text.muted,
  },
  adminOnly: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontStyle: "italic",
    marginTop: 2,
    color: COLORS.text.muted,
  },
});
