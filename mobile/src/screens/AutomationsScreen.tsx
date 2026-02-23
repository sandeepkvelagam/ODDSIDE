import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useHaptics } from "../context/HapticsContext";
import { api } from "../api/client";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { GlassButton } from "../components/ui/GlassButton";

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

type Template = {
  name: string;
  description: string;
  trigger: { type: string };
  actions: Array<{ type: string; params?: any }>;
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

const TRIGGER_OPTIONS = Object.entries(TRIGGER_META).map(([key, val]) => ({
  key,
  ...val,
}));

const ACTION_OPTIONS = Object.entries(ACTION_META).map(([key, val]) => ({
  key,
  ...val,
}));

export function AutomationsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { triggerHaptic } = useHaptics();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formAction, setFormAction] = useState("");
  const [creating, setCreating] = useState(false);

  // Picker modal state
  const [pickerType, setPickerType] = useState<"trigger" | "action" | null>(null);

  // History modal
  const [historyAutomationId, setHistoryAutomationId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<RunHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Templates modal
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Cost budget
  const [costBudget, setCostBudget] = useState<{ remaining: number; max: number } | null>(null);

  useEffect(() => {
    fetchAutomations();
    fetchCostBudget();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await api.get("/automations");
      setAutomations(res.data?.data?.automations || []);
    } catch {
      Alert.alert("Error", "Failed to load automations");
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

  const handleToggle = async (id: string) => {
    triggerHaptic("light");
    try {
      await api.post(`/automations/${id}/toggle`);
      fetchAutomations();
    } catch {
      Alert.alert("Error", "Failed to toggle automation");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Automation", "This cannot be undone.", [
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
            Alert.alert("Error", "Failed to delete automation");
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
      Alert.alert("Error", err?.response?.data?.detail || "Dry run failed");
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
      Alert.alert("Error", err?.response?.data?.detail || "Replay failed");
    }
  };

  const handleViewHistory = async (id: string) => {
    setHistoryAutomationId(id);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/automations/${id}/history`);
      setHistoryData(res.data?.data || []);
    } catch {
      Alert.alert("Error", "Failed to load history");
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
      Alert.alert("Error", "Failed to load templates");
    }
  };

  const applyTemplate = (tpl: Template) => {
    setFormName(tpl.name);
    setFormTrigger(tpl.trigger?.type || "");
    setFormAction(tpl.actions?.[0]?.type || "");
    setShowTemplates(false);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formTrigger || !formAction) {
      Alert.alert("Missing fields", "Please fill in name, trigger, and action.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/automations", {
        name: formName.trim(),
        trigger: { type: formTrigger },
        actions: [{ type: formAction, params: {} }],
      });
      triggerHaptic("medium");
      setShowCreate(false);
      resetForm();
      fetchAutomations();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormTrigger("");
    setFormAction("");
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

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Automations</Text>

          <Pressable
            style={[
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
            ]}
            onPress={() => {
              triggerHaptic("light");
              resetForm();
              setShowCreate(true);
            }}
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
          {/* Quick Actions */}
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

          {/* Loading */}
          {loading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.orange} />
            </View>
          )}

          {/* Empty State */}
          {!loading && automations.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="flash-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No automations yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create IFTTT-style rules that run automatically — like auto-RSVP, payment reminders, or post-game summaries.
              </Text>
              <View style={{ marginTop: 16 }}>
                <GlassButton onPress={() => { resetForm(); setShowCreate(true); }} variant="primary" size="medium">
                  Create Automation
                </GlassButton>
              </View>
            </View>
          )}

          {/* Automation Cards */}
          {automations.map((auto) => {
            const triggerInfo = TRIGGER_META[auto.trigger?.type] || { emoji: "⚡", label: auto.trigger?.type };
            const actionInfo = ACTION_META[auto.actions?.[0]?.type] || { icon: "flash-outline" as const, label: auto.actions?.[0]?.type };
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
                    {/* Health indicator */}
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
                    onValueChange={() => handleToggle(auto.automation_id)}
                    trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }}
                    thumbColor="#fff"
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

      {/* ==================== CREATE MODAL ==================== */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Automation</Text>
              <TouchableOpacity
                style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                onPress={() => setShowCreate(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Name */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
              <View style={[styles.inputField, { backgroundColor: colors.inputBg || colors.glassBg, borderColor: colors.border }]}>
                <Ionicons name="text-outline" size={18} color={colors.textMuted} />
                <Text
                  style={[styles.inputText, { color: formName ? colors.textPrimary : colors.textMuted }]}
                  numberOfLines={1}
                >
                  {formName || "e.g., Auto-RSVP to games"}
                </Text>
              </View>
              {/* Simple text input via Alert (matching mobile UX pattern) */}
              <TouchableOpacity
                style={[styles.setValueBtn, { backgroundColor: colors.orange + "12" }]}
                onPress={() => {
                  Alert.prompt?.(
                    "Automation Name",
                    "Enter a name for your automation",
                    (text) => text && setFormName(text),
                    "plain-text",
                    formName
                  ) || (() => {
                    // Fallback for Android which doesn't support Alert.prompt
                    // Set a default name based on selections
                    const trigLabel = TRIGGER_META[formTrigger]?.label || "trigger";
                    const actLabel = ACTION_META[formAction]?.label || "action";
                    setFormName(`${actLabel} on ${trigLabel}`);
                  })();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.setValueBtnText, { color: colors.orange }]}>
                  {formName ? "Change Name" : "Set Name"}
                </Text>
              </TouchableOpacity>

              {/* Trigger */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>
                When this happens (Trigger)
              </Text>
              <TouchableOpacity
                style={[styles.pickerField, { backgroundColor: colors.inputBg || colors.glassBg, borderColor: colors.border }]}
                onPress={() => setPickerType("trigger")}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>{TRIGGER_META[formTrigger]?.emoji || "⚡"}</Text>
                <Text style={[styles.pickerText, { color: formTrigger ? colors.textPrimary : colors.textMuted }]}>
                  {TRIGGER_META[formTrigger]?.label || "Select a trigger..."}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Action */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>
                Do this (Action)
              </Text>
              <TouchableOpacity
                style={[styles.pickerField, { backgroundColor: colors.inputBg || colors.glassBg, borderColor: colors.border }]}
                onPress={() => setPickerType("action")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={ACTION_META[formAction]?.icon || ("flash-outline" as any)}
                  size={20}
                  color={formAction ? colors.orange : colors.textMuted}
                />
                <Text style={[styles.pickerText, { color: formAction ? colors.textPrimary : colors.textMuted }]}>
                  {ACTION_META[formAction]?.label || "Select an action..."}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={{ height: 24 }} />

              <GlassButton
                onPress={handleCreate}
                variant="primary"
                size="large"
                fullWidth
                loading={creating}
                disabled={creating}
              >
                Create Automation
              </GlassButton>

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== PICKER MODAL ==================== */}
      <Modal visible={!!pickerType} transparent animationType="fade" onRequestClose={() => setPickerType(null)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerType(null)}>
          <Pressable style={[styles.pickerPopup, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
              {pickerType === "trigger" ? "Select Trigger" : "Select Action"}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(pickerType === "trigger" ? TRIGGER_OPTIONS : ACTION_OPTIONS).map((opt) => {
                const selected = pickerType === "trigger" ? formTrigger === opt.key : formAction === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.pickerOption,
                      { borderColor: selected ? colors.orange : colors.border },
                      selected && { backgroundColor: colors.orange + "10" },
                    ]}
                    onPress={() => {
                      triggerHaptic("light");
                      if (pickerType === "trigger") setFormTrigger(opt.key);
                      else setFormAction(opt.key);
                      setPickerType(null);
                    }}
                    activeOpacity={0.7}
                  >
                    {"emoji" in opt ? (
                      <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                    ) : (
                      <Ionicons name={(opt as any).icon} size={20} color={selected ? colors.orange : colors.textPrimary} />
                    )}
                    <Text style={[styles.pickerOptionText, { color: selected ? colors.orange : colors.textPrimary }]}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={colors.orange} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: "70%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Templates</Text>
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
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>No templates available</Text>
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
                    <Text style={[styles.templateName, { color: colors.textPrimary }]}>{tpl.name}</Text>
                    <Text style={[styles.templateDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {tpl.description}
                    </Text>
                    <View style={styles.badgeRow}>
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
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
  errorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  errorBadgeText: {
    fontSize: 10,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputText: {
    fontSize: 15,
    flex: 1,
  },
  setValueBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  setValueBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  // Picker overlay
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerPopup: {
    width: 300,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
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
  templateName: {
    fontSize: 15,
    fontWeight: "600",
  },
  templateDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
