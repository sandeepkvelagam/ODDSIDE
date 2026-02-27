import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
  Modal,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useHaptics } from "../context/HapticsContext";
import { api } from "../api/client";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { GlassButton } from "../components/ui/GlassButton";
import { CreateAutomationSheet, Template } from "../components/CreateAutomationSheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Types ─────────────────────────────────────────────────

type HealthScore = {
  status: "healthy" | "warning" | "critical" | "disabled" | "new";
  score: number;
  reasons: string[];
};

type Automation = {
  automation_id: string;
  name: string;
  description?: string;
  trigger: { type: string; config?: any };
  actions: Array<{ type: string; params?: any }>;
  enabled: boolean;
  run_count?: number;
  error_count?: number;
  skip_count?: number;
  consecutive_errors?: number;
  last_run?: string;
  last_run_result?: string;
  health?: HealthScore;
  engine_version?: string;
};

type RunHistory = {
  run_id: string;
  status: string;
  reason?: string;
  created_at?: string;
  started_at?: string;
  duration_ms?: number;
  trigger_latency_ms?: number;
  policy_block_reason_enum?: string;
  force_replay?: boolean;
  engine_version?: string;
  action_results?: Array<{ type: string; success: boolean }>;
};

const HEALTH_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: { bg: "#22c55e15", text: "#16a34a", dot: "#22c55e" },
  warning: { bg: "#eab30815", text: "#ca8a04", dot: "#eab308" },
  critical: { bg: "#ef444415", text: "#dc2626", dot: "#ef4444" },
  disabled: { bg: "#9ca3af15", text: "#6b7280", dot: "#9ca3af" },
  new: { bg: "#3b82f615", text: "#2563eb", dot: "#3b82f6" },
};

const HEALTH_LABELS: Record<string, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  disabled: "Disabled",
  new: "New",
};

const TRIGGER_META: Record<string, { emoji: string; label: string }> = {
  game_created: { emoji: "🎮", label: "Game Created" },
  game_ended: { emoji: "🏁", label: "Game Ended" },
  settlement_generated: { emoji: "💰", label: "Settlement Generated" },
  payment_due: { emoji: "💳", label: "Payment Due" },
  payment_overdue: { emoji: "⚠️", label: "Payment Overdue" },
  payment_received: { emoji: "✅", label: "Payment Received" },
  player_confirmed: { emoji: "👤", label: "Player Confirmed" },
  all_players_confirmed: { emoji: "👥", label: "All Confirmed" },
  schedule: { emoji: "🕐", label: "Scheduled" },
};

const ACTION_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  send_notification: { icon: "notifications-outline", label: "Send Notification" },
  send_email: { icon: "mail-outline", label: "Send Email" },
  send_payment_reminder: { icon: "card-outline", label: "Payment Reminder" },
  auto_rsvp: { icon: "hand-left-outline", label: "Auto-RSVP" },
  create_game: { icon: "add-circle-outline", label: "Create Game" },
  generate_summary: { icon: "document-text-outline", label: "Generate Summary" },
};

// ── Typewriter Hook (matches OnboardingAgent pattern) ─────

function useTypewriter(text: string, active: boolean, speed = 30, delay = 300) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplay(""); setDone(false); return; }
    setDisplay(""); setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplay(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, active]);

  return { display, done };
}

// ── Thinking Dots ─────────────────────────────────────────

function ThinkingDots() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 4, paddingVertical: 8, paddingHorizontal: 4 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: "#EE6C29",
            opacity: dot,
          }}
        />
      ))}
    </View>
  );
}

// ── Quick Template Cards for Empty State ──────────────────

const QUICK_TEMPLATES: Array<{
  emoji: string;
  title: string;
  subtitle: string;
  template: Template;
}> = [
  {
    emoji: "🤚",
    title: "Auto-RSVP",
    subtitle: "Auto-confirm when games are created",
    template: {
      name: "Auto-RSVP to games",
      description: "Automatically confirm your attendance when a new game is created",
      trigger: { type: "game_created" },
      actions: [{ type: "auto_rsvp", params: { response: "confirmed" } }],
    },
  },
  {
    emoji: "💸",
    title: "Payment Reminders",
    subtitle: "Nudge players who owe you",
    template: {
      name: "Payment reminder after 3 days",
      description: "Remind people who owe you if they haven't paid within 3 days",
      trigger: { type: "payment_overdue" },
      actions: [{ type: "send_payment_reminder", params: { urgency: "gentle" } }],
    },
  },
  {
    emoji: "📊",
    title: "Game Recaps",
    subtitle: "Auto-generate summaries after games",
    template: {
      name: "Game summary after every game",
      description: "Automatically generate and share a game summary when a game ends",
      trigger: { type: "game_ended" },
      actions: [{ type: "generate_summary", params: { share_to: "group" } }],
    },
  },
  {
    emoji: "🔔",
    title: "Self-Reminder",
    subtitle: "Get notified when you owe money",
    template: {
      name: "Self-reminder when I owe",
      description: "Get a reminder notification when you owe someone money",
      trigger: { type: "payment_due" },
      actions: [{ type: "send_notification", params: { title: "You owe money", message: "Don't forget to settle up!", target: "self" } }],
    },
  },
];

// How it works steps
const HOW_IT_WORKS = [
  { icon: "flash-outline" as const, title: "Pick a trigger", desc: "Choose what starts the flow" },
  { icon: "arrow-forward" as const, title: "Set an action", desc: "What should happen automatically" },
  { icon: "checkmark-circle-outline" as const, title: "Done!", desc: "It runs on autopilot from now on" },
];

// ── Main Component ────────────────────────────────────────

export function AutomationsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { triggerHaptic } = useHaptics();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Create sheet state
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Toggle debounce
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // History modal
  const [historyAutomationId, setHistoryAutomationId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<RunHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Templates modal
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Cost budget
  const [costBudget, setCostBudget] = useState<{ remaining: number; max: number } | null>(null);

  // AI intro animation state
  const [showIntro, setShowIntro] = useState(true);
  const introFade = useRef(new Animated.Value(0)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;
  const howItWorksFade = useRef(new Animated.Value(0)).current;

  const { display: typedIntro, done: introDone } = useTypewriter(
    "I can automate things for you. Set up a Smart Flow once and I'll handle the rest — reminders, RSVPs, recaps, all on autopilot.",
    !loading && !error && automations.length === 0 && showIntro
  );

  useEffect(() => {
    if (!loading && !error && automations.length === 0) {
      Animated.timing(introFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading, error, automations.length]);

  useEffect(() => {
    if (introDone) {
      Animated.stagger(200, [
        Animated.timing(cardsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(howItWorksFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [introDone]);

  useEffect(() => {
    fetchAutomations();
    fetchCostBudget();
  }, []);

  const fetchAutomations = async (isRetry = false) => {
    try {
      const res = await api.get("/automations");
      setAutomations(res.data?.data?.automations || []);
      setError(false);
    } catch (err: any) {
      const status = err?.response?.status;
      if (!isRetry && !status) {
        setTimeout(() => fetchAutomations(true), 1000);
        return;
      }
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCostBudget = async () => {
    try {
      const res = await api.get("/automations/usage/cost-budget");
      const data = res.data?.data;
      if (data) {
        setCostBudget({ remaining: data.cost_budget_remaining, max: data.max_daily_cost_points });
      }
    } catch {
      // Non-critical
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAutomations();
    fetchCostBudget();
  }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    triggerHaptic("light");
    setTogglingId(id);
    try {
      await api.post(`/automations/${id}/toggle`, { enabled: !currentEnabled });
      fetchAutomations();
    } catch {
      Alert.alert("Update unavailable", "Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Smart Flow", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/automations/${id}`);
            triggerHaptic("medium");
            fetchAutomations();
          } catch {
            Alert.alert("Removal unavailable", "Please try again.");
          }
        },
      },
    ]);
  };

  const handleDryRun = async (id: string) => {
    triggerHaptic("light");
    try {
      const res = await api.post(`/automations/${id}/run`);
      Alert.alert("Test Run", res.data?.message || "Dry run completed");
    } catch (err: any) {
      Alert.alert("Test unavailable", err?.response?.data?.detail || "Please try again.");
    }
  };

  const handleReplay = async (id: string) => {
    triggerHaptic("medium");
    try {
      const res = await api.post(`/automations/${id}/replay`);
      Alert.alert("Replay", res.data?.message || "Replay completed");
      fetchAutomations();
      fetchCostBudget();
    } catch (err: any) {
      Alert.alert("Replay unavailable", err?.response?.data?.detail || "Please try again.");
    }
  };

  const handleViewHistory = async (id: string) => {
    setHistoryAutomationId(id);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/automations/${id}/history`);
      setHistoryData(res.data?.data || []);
    } catch {
      Alert.alert("Not available right now", "Please try again.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.get("/automations/templates");
      setTemplates(res.data?.data?.templates || []);
      setShowTemplates(true);
    } catch {
      Alert.alert("Not available right now", "Please try again.");
    }
  };

  const applyTemplate = (tpl: Template) => {
    setSelectedTemplate({
      ...tpl,
      name: tpl.name || "",
      description: tpl.description || "",
      trigger: tpl.trigger || { type: "" },
      actions: tpl.actions || [{ type: "", params: {} }],
      conditions: tpl.conditions || {},
    });
    setShowTemplates(false);
    setShowCreate(true);
  };

  const handleCreateClose = () => {
    setShowCreate(false);
    setSelectedTemplate(null);
  };

  const openCreateBlank = () => {
    triggerHaptic("light");
    setSelectedTemplate(null);
    setShowCreate(true);
  };

  const openWithTemplate = (tpl: Template) => {
    triggerHaptic("light");
    setSelectedTemplate({
      ...tpl,
      name: tpl.name || "",
      description: tpl.description || "",
      trigger: tpl.trigger || { type: "" },
      actions: tpl.actions || [{ type: "", params: {} }],
      conditions: tpl.conditions || {},
    });
    setShowCreate(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Render ────────────────────────────────────────────

  const renderEmptyState = () => (
    <Animated.View style={{ opacity: introFade }}>
      {/* AI Agent Intro Bubble */}
      <View style={styles.aiIntroContainer}>
        <View style={[styles.aiAvatar, { backgroundColor: colors.orange + "20" }]}>
          <Ionicons name="flash" size={20} color={colors.orange} />
        </View>
        <View style={[styles.aiBubble, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          {typedIntro ? (
            <Text style={[styles.aiBubbleText, { color: colors.textPrimary }]}>
              {typedIntro}
              {!introDone && <Text style={{ color: colors.orange }}>|</Text>}
            </Text>
          ) : (
            <ThinkingDots />
          )}
        </View>
      </View>

      {/* How It Works - 3 step visual */}
      <Animated.View style={{ opacity: howItWorksFade }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          How it works
        </Text>
        <View style={styles.howItWorksRow}>
          {HOW_IT_WORKS.map((step, i) => (
            <React.Fragment key={i}>
              <View style={styles.howItWorksStep}>
                <View style={[styles.howItWorksIcon, { backgroundColor: colors.orange + "15" }]}>
                  <Ionicons name={step.icon} size={22} color={colors.orange} />
                </View>
                <Text style={[styles.howItWorksTitle, { color: colors.textPrimary }]}>
                  {step.title}
                </Text>
                <Text style={[styles.howItWorksDesc, { color: colors.textMuted }]}>
                  {step.desc}
                </Text>
              </View>
              {i < HOW_IT_WORKS.length - 1 && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                  style={{ marginTop: 16 }}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      </Animated.View>

      {/* Quick Start Templates */}
      <Animated.View style={{ opacity: cardsFade }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 28 }]}>
          Quick start — tap to set up
        </Text>
        {QUICK_TEMPLATES.map((qt, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.quickTemplateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => openWithTemplate(qt.template)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickTemplateEmoji}>{qt.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickTemplateTitle, { color: colors.textPrimary }]}>
                {qt.title}
              </Text>
              <Text style={[styles.quickTemplateSubtitle, { color: colors.textMuted }]}>
                {qt.subtitle}
              </Text>
            </View>
            <View style={[styles.oneTapBadge, { backgroundColor: colors.orange + "15" }]}>
              <Text style={[styles.oneTapText, { color: colors.orange }]}>Set up</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.orange} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Custom Flow CTA */}
        <TouchableOpacity
          style={[styles.customFlowBtn, { borderColor: colors.glassBorder }]}
          onPress={openCreateBlank}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.customFlowText, { color: colors.textSecondary }]}>
            Build a custom flow from scratch
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Smart Flows</Text>

          <Pressable
            style={[
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
            ]}
            onPress={openCreateBlank}
          >
            <Ionicons name="add" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Quick Actions - only show when there are automations */}
          {automations.length > 0 && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.orange + "15", borderColor: colors.orange + "30" }]}
                onPress={loadTemplates}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={18} color={colors.orange} />
                <Text style={[styles.quickActionLabel, { color: colors.orange }]}>Templates</Text>
              </TouchableOpacity>
              {costBudget && (
                <View style={[styles.quickActionBtn, { backgroundColor: colors.textMuted + "10", borderColor: colors.textMuted + "20" }]}>
                  <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>
                    {costBudget.remaining}/{costBudget.max} pts
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.orange} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading your flows...
              </Text>
            </View>
          )}

          {/* Error State */}
          {!loading && error && (
            <View style={styles.emptyContainer}>
              <View style={[styles.errorIconCircle, { backgroundColor: colors.danger + "15" }]}>
                <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Can't reach Smart Flows
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Check your internet connection and try again.
              </Text>
              <View style={{ marginTop: 16 }}>
                <GlassButton
                  onPress={() => { setError(false); setLoading(true); fetchAutomations(); }}
                  variant="primary"
                  size="medium"
                >
                  Try Again
                </GlassButton>
              </View>
            </View>
          )}

          {/* Empty State - AI Guided Intro */}
          {!loading && !error && automations.length === 0 && renderEmptyState()}

          {/* Automation Cards */}
          {automations.map((auto) => {
            const triggerInfo = TRIGGER_META[auto.trigger?.type] || { emoji: "⚡", label: auto.trigger?.type };
            return (
              <View
                key={auto.automation_id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: auto.enabled ? 1 : 0.55,
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={{ fontSize: 20 }}>{triggerInfo.emoji}</Text>
                    <Text
                      style={[styles.cardTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {auto.name}
                    </Text>
                    {auto.health && (() => {
                      const hc = HEALTH_COLORS[auto.health.status] || HEALTH_COLORS.new;
                      return (
                        <View style={[styles.healthBadge, { backgroundColor: hc.bg }]}>
                          <View style={[styles.healthDot, { backgroundColor: hc.dot }]} />
                          <Text style={[styles.healthBadgeText, { color: hc.text }]}>
                            {HEALTH_LABELS[auto.health.status] || auto.health.status}
                            {auto.health.score !== undefined && auto.health.status !== "new" && auto.health.status !== "disabled"
                              ? ` ${auto.health.score}`
                              : ""}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                  <Switch
                    value={auto.enabled}
                    onValueChange={() => handleToggle(auto.automation_id, auto.enabled)}
                    trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }}
                    thumbColor="#fff"
                    disabled={togglingId === auto.automation_id}
                  />
                </View>

                {/* Description */}
                {auto.description ? (
                  <Text
                    style={[styles.cardDescription, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {auto.description}
                  </Text>
                ) : null}

                {/* Trigger → Action badges */}
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.orange + "12" }]}>
                    <Text style={[styles.badgeText, { color: colors.orange }]}>
                      {triggerInfo.label}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                  {auto.actions?.map((a, i) => (
                    <View key={i} style={[styles.badge, { backgroundColor: colors.trustBlue + "12" }]}>
                      <Text style={[styles.badgeText, { color: colors.trustBlue }]}>
                        {ACTION_META[a.type]?.label || a.type}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Stats */}
                {(auto.run_count || 0) > 0 && (
                  <Text style={[styles.statsText, { color: colors.textMuted }]}>
                    {auto.run_count} runs
                    {(auto.error_count || 0) > 0 ? ` · ${auto.error_count} errors` : ""}
                    {auto.last_run ? ` · Last: ${formatDate(auto.last_run)}` : ""}
                    {auto.engine_version ? `  ${auto.engine_version}` : ""}
                  </Text>
                )}

                {/* Actions */}
                <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDryRun(auto.automation_id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Test</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleReplay(auto.automation_id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Replay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleViewHistory(auto.automation_id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(auto.automation_id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[styles.actionLabel, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {/* ==================== CREATE SHEET ==================== */}
      <CreateAutomationSheet
        visible={showCreate}
        onClose={handleCreateClose}
        onCreated={() => { fetchAutomations(); fetchCostBudget(); }}
        initialTemplate={selectedTemplate}
      />

      {/* ==================== HISTORY MODAL ==================== */}
      <Modal visible={!!historyAutomationId} transparent animationType="slide" onRequestClose={() => setHistoryAutomationId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: "70%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Run History</Text>
              <TouchableOpacity
                style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                onPress={() => setHistoryAutomationId(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.orange} />
              </View>
            ) : historyData.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="time-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptySubtitle, { color: colors.textMuted, marginTop: 8 }]}>No runs yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {historyData.map((run, i) => {
                  const statusColor =
                    run.status === "success" || run.status === "completed"
                      ? colors.success
                      : run.status === "skipped"
                      ? colors.warning
                      : colors.danger;
                  const successActions = run.action_results?.filter(a => a.success).length ?? 0;
                  const totalActions = run.action_results?.length ?? 0;
                  return (
                    <View key={run.run_id || i} style={[styles.historyItem, { borderColor: colors.border }]}>
                      <View style={styles.historyItemHeader}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {run.status}
                          </Text>
                        </View>
                        {run.force_replay && (
                          <View style={[styles.statusBadge, { backgroundColor: colors.textMuted + "15" }]}>
                            <Ionicons name="refresh-outline" size={10} color={colors.textMuted} />
                            <Text style={[styles.statusText, { color: colors.textMuted, marginLeft: 2 }]}>
                              replay
                            </Text>
                          </View>
                        )}
                        {run.policy_block_reason_enum && (
                          <Text style={[styles.skipReason, { color: colors.textMuted }]}>
                            {run.policy_block_reason_enum.replace(/_/g, " ")}
                          </Text>
                        )}
                        {run.reason && !run.policy_block_reason_enum && (
                          <Text style={[styles.skipReason, { color: colors.textMuted }]}>
                            {run.reason.replace(/_/g, " ")}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {formatDate(run.created_at || run.started_at)}
                        {run.duration_ms ? ` · ${run.duration_ms}ms` : ""}
                        {run.trigger_latency_ms ? ` · latency: ${run.trigger_latency_ms}ms` : ""}
                        {totalActions > 0 ? ` · ${successActions}/${totalActions} actions` : ""}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================== TEMPLATES MODAL ==================== */}
      <Modal visible={showTemplates} transparent animationType="slide" onRequestClose={() => setShowTemplates(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Templates</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Tap any template to start building
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                onPress={() => setShowTemplates(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {templates.length === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.orange} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {templates.map((tpl, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.templateCard, { backgroundColor: colors.glassBg, borderColor: colors.border }]}
                    onPress={() => applyTemplate(tpl)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.templateCardHeader}>
                      <Text style={{ fontSize: 24 }}>
                        {TRIGGER_META[tpl.trigger?.type]?.emoji || "⚡"}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.templateName, { color: colors.textPrimary }]}>{tpl.name}</Text>
                        <Text style={[styles.templateDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {tpl.description}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.templateFlowRow, { backgroundColor: colors.contentBg + "80" }]}>
                      <View style={[styles.badge, { backgroundColor: colors.orange + "12" }]}>
                        <Text style={[styles.badgeText, { color: colors.orange }]}>
                          {TRIGGER_META[tpl.trigger?.type]?.label || tpl.trigger?.type}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                      {tpl.actions?.map((a, j) => (
                        <View key={j} style={[styles.badge, { backgroundColor: colors.trustBlue + "12" }]}>
                          <Text style={[styles.badgeText, { color: colors.trustBlue }]}>
                            {ACTION_META[a.type]?.label || a.type}
                          </Text>
                        </View>
                      ))}
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.useBtnText, { color: colors.orange }]}>Use this</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.orange} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </BottomSheetScreen>
  );
}

// ── Styles ─────────────────────────────────────────────────

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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  // AI Intro
  aiIntroContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 24,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  aiBubble: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    padding: 14,
  },
  aiBubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  // How it works
  howItWorksRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  howItWorksStep: {
    alignItems: "center",
    flex: 1,
  },
  howItWorksIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  howItWorksTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  howItWorksDesc: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 15,
  },
  // Quick templates
  quickTemplateCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  quickTemplateEmoji: {
    fontSize: 28,
  },
  quickTemplateTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  quickTemplateSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  oneTapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  oneTapText: {
    fontSize: 12,
    fontWeight: "600",
  },
  customFlowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  customFlowText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Automation cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statsText: {
    fontSize: 11,
    marginTop: 8,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  // History
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  skipReason: {
    fontSize: 11,
  },
  historyDate: {
    fontSize: 11,
    marginTop: 4,
  },
  // Templates
  templateCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  templateCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  templateName: {
    fontSize: 15,
    fontWeight: "600",
  },
  templateDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  templateFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  useBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
