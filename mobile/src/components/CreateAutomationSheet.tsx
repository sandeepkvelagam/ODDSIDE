import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Switch,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useHaptics } from "../context/HapticsContext";
import { api } from "../api/client";
import { GlassBottomSheet } from "./ui/GlassModal";
import { GlassButton } from "./ui/GlassButton";
import { GlassInput } from "./ui/GlassInput";
import { SPACING, RADIUS } from "../styles/liquidGlass";

// ── Types ─────────────────────────────────────────────────

export type Template = {
  template_id?: string;
  name: string;
  description: string;
  trigger: { type: string; schedule?: string; [key: string]: any };
  actions: Array<{ type: string; params?: Record<string, any> }>;
  conditions?: Record<string, any>;
};

type BackendTrigger = {
  type: string;
  description: string;
  event_fields: string[];
};

type BackendAction = {
  type: string;
  description: string;
  required_params: string[];
  optional_params: string[];
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialTemplate?: Template | null;
}

// ── UI Decoration ─────────────────────────────────────────

const TRIGGER_META: Record<string, { emoji: string; label: string; hint: string }> = {
  game_created: { emoji: "🎮", label: "Game Created", hint: "Fires when someone creates a new game in your group" },
  game_ended: { emoji: "🏁", label: "Game Ended", hint: "Fires when a game session wraps up" },
  settlement_generated: { emoji: "💰", label: "Settlement Generated", hint: "Fires when the app calculates who owes what" },
  payment_due: { emoji: "💳", label: "Payment Due", hint: "Fires when you owe someone money" },
  payment_overdue: { emoji: "⚠️", label: "Payment Overdue", hint: "Fires when a payment is past due" },
  payment_received: { emoji: "✅", label: "Payment Received", hint: "Fires when someone pays you" },
  player_confirmed: { emoji: "👤", label: "Player Confirmed", hint: "Fires when a player RSVPs yes" },
  all_players_confirmed: { emoji: "👥", label: "All Confirmed", hint: "Fires when every invited player confirms" },
  schedule: { emoji: "🕐", label: "Scheduled", hint: "Runs on a recurring schedule you set" },
};

const ACTION_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string }> = {
  send_notification: { icon: "notifications-outline", label: "Send Notification", hint: "Push a notification to yourself or your group" },
  send_email: { icon: "mail-outline", label: "Send Email", hint: "Send an email when the trigger fires" },
  send_payment_reminder: { icon: "card-outline", label: "Payment Reminder", hint: "Remind people who owe you to settle up" },
  auto_rsvp: { icon: "hand-left-outline", label: "Auto-RSVP", hint: "Automatically confirm your spot in new games" },
  create_game: { icon: "add-circle-outline", label: "Create Game", hint: "Auto-create a game with preset settings" },
  generate_summary: { icon: "document-text-outline", label: "Generate Summary", hint: "AI-generated recap of the game" },
};

const PARAM_PLACEHOLDERS: Record<string, string> = {
  title: "e.g., Game night reminder",
  message: "e.g., Don't forget tonight's game!",
  subject: "e.g., Friday poker recap",
  body: "e.g., Here's how the game went...",
  custom_message: "e.g., Settle up when you can!",
};

const PARAM_LABELS: Record<string, string> = {
  title: "Title",
  message: "Message",
  subject: "Subject",
  body: "Body",
  target: "Send To",
  urgency: "Urgency",
  response: "RSVP Response",
  custom_message: "Custom Message (optional)",
  share_to: "Share To",
  buy_in: "Buy-in Amount",
  max_players: "Max Players",
  game_type: "Game Type",
};

const PARAM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  target: [
    { value: "self", label: "Just Me" },
    { value: "group", label: "Entire Group" },
    { value: "host", label: "Host Only" },
  ],
  urgency: [
    { value: "gentle", label: "Gentle" },
    { value: "normal", label: "Normal" },
    { value: "urgent", label: "Urgent" },
  ],
  response: [
    { value: "confirmed", label: "Confirmed (Yes)" },
    { value: "declined", label: "Declined (No)" },
  ],
  share_to: [
    { value: "self", label: "Just Me" },
    { value: "group", label: "Entire Group" },
  ],
};

const SCHEDULE_PRESETS = [
  { label: "Every day at 9am", cron: "0 9 * * *" },
  { label: "Every Friday at 5pm", cron: "0 17 * * 5" },
  { label: "Every Monday at 8am", cron: "0 8 * * 1" },
  { label: "Every Sunday at 7pm", cron: "0 19 * * 0" },
];

// Step-based AI hints shown at each phase
const STEP_HINTS: Record<number, string> = {
  0: "Give it a name so you can find it later. A short description helps too!",
  1: "What event should kick off this flow? Pick the moment that starts the magic.",
  2: "Now choose what happens automatically when the trigger fires.",
};

// ── Component ─────────────────────────────────────────────

export function CreateAutomationSheet({ visible, onClose, onCreated, initialTemplate }: Props) {
  const { colors } = useTheme();
  const { triggerHaptic } = useHaptics();

  // Schema
  const [availableTriggers, setAvailableTriggers] = useState<BackendTrigger[]>([]);
  const [availableActions, setAvailableActions] = useState<BackendAction[]>([]);
  const [schemaLoaded, setSchemaLoaded] = useState(false);

  // Step wizard: 0=basics, 1=trigger, 2=action
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formCustomSchedule, setFormCustomSchedule] = useState(false);
  const [formAction, setFormAction] = useState("");
  const [formActionParams, setFormActionParams] = useState<Record<string, any>>({});
  const [formStopOnFailure, setFormStopOnFailure] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Picker modal
  const [pickerType, setPickerType] = useState<"trigger" | "action" | null>(null);

  // Hint animation
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !schemaLoaded) fetchSchema();
  }, [visible]);

  useEffect(() => {
    if (visible && initialTemplate) {
      setFormName(initialTemplate.name || "");
      setFormDescription(initialTemplate.description || "");
      setFormTrigger(initialTemplate.trigger?.type || "");
      setFormSchedule(initialTemplate.trigger?.schedule || "");
      setFormCustomSchedule(
        !!initialTemplate.trigger?.schedule &&
        !SCHEDULE_PRESETS.some((p) => p.cron === initialTemplate.trigger?.schedule)
      );
      setFormAction(initialTemplate.actions?.[0]?.type || "");
      setFormActionParams(initialTemplate.actions?.[0]?.params || {});
      // If template has everything, jump to step 2 (action/review)
      if (initialTemplate.trigger?.type && initialTemplate.actions?.[0]?.type) {
        setCurrentStep(2);
      }
    }
  }, [visible, initialTemplate]);

  // Animate hint when step changes
  useEffect(() => {
    hintOpacity.setValue(0);
    Animated.timing(hintOpacity, {
      toValue: 1,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const fetchSchema = async () => {
    try {
      const [triggersRes, actionsRes] = await Promise.all([
        api.get("/automations/triggers/available"),
        api.get("/automations/actions/available"),
      ]);
      setAvailableTriggers(triggersRes.data?.data?.triggers || []);
      setAvailableActions(actionsRes.data?.data?.actions || []);
      setSchemaLoaded(true);
    } catch {
      setSchemaLoaded(true);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormDescription(""); setFormTrigger("");
    setFormSchedule(""); setFormCustomSchedule(false); setFormAction("");
    setFormActionParams({}); setFormStopOnFailure(false); setShowAdvanced(false);
    setCurrentStep(0); setShowSuccess(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const selectedActionSchema = availableActions.find((a) => a.type === formAction);
  const requiredParams = selectedActionSchema?.required_params || [];
  const optionalParams = selectedActionSchema?.optional_params || [];
  const allParams = [...requiredParams, ...optionalParams];

  // Step navigation
  const canGoNext = () => {
    if (currentStep === 0) return formName.trim().length > 0;
    if (currentStep === 1) {
      if (!formTrigger) return false;
      if (formTrigger === "schedule" && !formSchedule.trim()) return false;
      return true;
    }
    return true;
  };

  const goNext = () => {
    triggerHaptic("light");
    if (currentStep < 2) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    triggerHaptic("light");
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formTrigger || !formAction) {
      Alert.alert("Almost there", "Please fill in name, trigger, and action.");
      return;
    }
    if (formTrigger === "schedule" && !formSchedule.trim()) {
      Alert.alert("Missing schedule", "Set a schedule for this flow.");
      return;
    }
    for (const param of requiredParams) {
      if (!formActionParams[param]?.toString().trim()) {
        const label = PARAM_LABELS[param] || param;
        Alert.alert("Missing details", `Please fill in "${label}".`);
        return;
      }
    }

    setCreating(true);
    try {
      const triggerPayload: Record<string, any> = { type: formTrigger };
      if (formTrigger === "schedule" && formSchedule) triggerPayload.schedule = formSchedule;

      const cleanParams: Record<string, any> = {};
      for (const [k, v] of Object.entries(formActionParams)) {
        if (v !== undefined && v !== null && v !== "") cleanParams[k] = v;
      }

      const payload: Record<string, any> = {
        name: formName.trim(),
        trigger: triggerPayload,
        actions: [{ type: formAction, params: cleanParams }],
      };
      if (formDescription.trim()) payload.description = formDescription.trim();
      if (formStopOnFailure) payload.execution_options = { stop_on_failure: true };

      await api.post("/automations", payload);
      triggerHaptic("medium");

      // Show success animation
      setShowSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        handleClose();
        onCreated();
      }, 1800);
    } catch (err: any) {
      Alert.alert("Creation unavailable", err?.response?.data?.detail || "Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Build options
  const triggerOptions = availableTriggers.length > 0
    ? availableTriggers.map((t) => ({
        key: t.type,
        emoji: TRIGGER_META[t.type]?.emoji || "⚡",
        label: TRIGGER_META[t.type]?.label || t.type,
        description: t.description,
      }))
    : Object.entries(TRIGGER_META).map(([key, val]) => ({ key, emoji: val.emoji, label: val.label, description: val.hint }));

  const actionOptions = availableActions.length > 0
    ? availableActions.map((a) => ({
        key: a.type,
        icon: ACTION_META[a.type]?.icon || ("flash-outline" as keyof typeof Ionicons.glyphMap),
        label: ACTION_META[a.type]?.label || a.type,
        description: a.description,
      }))
    : Object.entries(ACTION_META).map(([key, val]) => ({ key, icon: val.icon, label: val.label, description: val.hint }));

  const isEnumParam = (p: string) => !!PARAM_OPTIONS[p];
  const isMultilineParam = (p: string) => ["message", "body", "custom_message"].includes(p);
  const isNumericParam = (p: string) => ["buy_in", "max_players"].includes(p);
  const updateParam = (key: string, value: any) => setFormActionParams((prev) => ({ ...prev, [key]: value }));

  // ── Render helpers ──────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2].map((step) => (
        <View key={step} style={styles.stepDotRow}>
          <View style={[
            styles.stepDot,
            {
              backgroundColor: step === currentStep ? colors.orange : step < currentStep ? colors.orange + "60" : colors.glassBorder,
              width: step === currentStep ? 24 : 8,
            },
          ]} />
        </View>
      ))}
    </View>
  );

  const renderHintBubble = () => (
    <Animated.View style={[styles.hintBubble, { backgroundColor: colors.orange + "10", borderColor: colors.orange + "25", opacity: hintOpacity }]}>
      <Ionicons name="sparkles" size={14} color={colors.orange} />
      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        {STEP_HINTS[currentStep]}
      </Text>
    </Animated.View>
  );

  const renderParamField = (param: string, isRequired: boolean) => {
    if (isEnumParam(param)) {
      const options = PARAM_OPTIONS[param] || [];
      const currentValue = formActionParams[param] || (param === "response" ? "confirmed" : "");
      return (
        <View key={param} style={{ marginTop: 12 }}>
          <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
            {PARAM_LABELS[param] || param}{isRequired ? " *" : ""}
          </Text>
          <View style={styles.chipRow}>
            {options.map((opt) => {
              const selected = currentValue === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { backgroundColor: selected ? colors.orange + "20" : colors.glassBg, borderColor: selected ? colors.orange : colors.glassBorder }]}
                  onPress={() => { triggerHaptic("light"); updateParam(param, opt.value); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: selected ? colors.orange : colors.textPrimary }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    return (
      <GlassInput
        key={param}
        label={`${PARAM_LABELS[param] || param}${isRequired ? " *" : ""}`}
        value={formActionParams[param]?.toString() || ""}
        onChangeText={(t) => updateParam(param, isNumericParam(param) ? t.replace(/[^0-9.]/g, "") : t)}
        placeholder={PARAM_PLACEHOLDERS[param] || `Enter ${param}`}
        keyboardType={isNumericParam(param) ? "numeric" : "default"}
        multiline={isMultilineParam(param)}
        numberOfLines={isMultilineParam(param) ? 3 : 1}
        containerStyle={{ marginTop: 12 }}
        leftIcon={<Ionicons name={param === "title" || param === "subject" ? "text-outline" : "create-outline"} size={18} color={colors.textMuted} />}
      />
    );
  };

  // ── Step Renders ────────────────────────────────────────

  const renderStep0 = () => (
    <>
      <GlassInput
        label="Name"
        value={formName}
        onChangeText={setFormName}
        placeholder="e.g., Auto-RSVP for Friday night"
        leftIcon={<Ionicons name="text-outline" size={18} color={colors.textMuted} />}
      />
      <GlassInput
        label="Description (optional)"
        value={formDescription}
        onChangeText={setFormDescription}
        placeholder="e.g., Runs after each game ends"
        multiline
        numberOfLines={2}
        containerStyle={{ marginTop: 16 }}
        leftIcon={<Ionicons name="chatbox-outline" size={18} color={colors.textMuted} />}
      />
    </>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>When this happens</Text>
      {triggerOptions.map((opt) => {
        const selected = formTrigger === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.triggerCard,
              { backgroundColor: selected ? colors.orange + "12" : colors.glassBg, borderColor: selected ? colors.orange : colors.glassBorder },
            ]}
            onPress={() => {
              triggerHaptic("light");
              setFormTrigger(opt.key);
              if (opt.key !== "schedule") { setFormSchedule(""); setFormCustomSchedule(false); }
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.triggerCardTitle, { color: selected ? colors.orange : colors.textPrimary }]}>{opt.label}</Text>
              {opt.description ? (
                <Text style={[styles.triggerCardDesc, { color: colors.textMuted }]} numberOfLines={1}>{opt.description}</Text>
              ) : null}
            </View>
            {selected && <Ionicons name="checkmark-circle" size={22} color={colors.orange} />}
          </TouchableOpacity>
        );
      })}

      {/* Schedule config inline */}
      {formTrigger === "schedule" && (
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Pick a schedule</Text>
          <View style={styles.chipRow}>
            {SCHEDULE_PRESETS.map((preset) => {
              const selected = !formCustomSchedule && formSchedule === preset.cron;
              return (
                <TouchableOpacity key={preset.cron} style={[styles.chip, { backgroundColor: selected ? colors.orange + "20" : colors.glassBg, borderColor: selected ? colors.orange : colors.glassBorder }]} onPress={() => { triggerHaptic("light"); setFormSchedule(preset.cron); setFormCustomSchedule(false); }} activeOpacity={0.7}>
                  <Text style={[styles.chipText, { color: selected ? colors.orange : colors.textPrimary }]}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.chip, { backgroundColor: formCustomSchedule ? colors.orange + "20" : colors.glassBg, borderColor: formCustomSchedule ? colors.orange : colors.glassBorder }]} onPress={() => { triggerHaptic("light"); setFormCustomSchedule(true); setFormSchedule(""); }} activeOpacity={0.7}>
              <Text style={[styles.chipText, { color: formCustomSchedule ? colors.orange : colors.textPrimary }]}>Custom</Text>
            </TouchableOpacity>
          </View>
          {formCustomSchedule && (
            <>
              <GlassInput label="Custom Schedule" value={formSchedule} onChangeText={setFormSchedule} placeholder="0 17 * * 5" containerStyle={{ marginTop: 8 }} leftIcon={<Ionicons name="time-outline" size={18} color={colors.textMuted} />} />
              <Text style={[styles.helperText, { color: colors.textMuted }]}>Format: min hour day month weekday (e.g., 0 17 * * 5 = Fridays at 5pm)</Text>
            </>
          )}
        </View>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Then do this</Text>
      {actionOptions.map((opt) => {
        const selected = formAction === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.triggerCard,
              { backgroundColor: selected ? colors.orange + "12" : colors.glassBg, borderColor: selected ? colors.orange : colors.glassBorder },
            ]}
            onPress={() => {
              triggerHaptic("light");
              setFormAction(opt.key);
              setFormActionParams({});
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={(opt as any).icon} size={22} color={selected ? colors.orange : colors.textPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.triggerCardTitle, { color: selected ? colors.orange : colors.textPrimary }]}>{opt.label}</Text>
              {opt.description ? (
                <Text style={[styles.triggerCardDesc, { color: colors.textMuted }]} numberOfLines={1}>{opt.description}</Text>
              ) : null}
            </View>
            {selected && <Ionicons name="checkmark-circle" size={22} color={colors.orange} />}
          </TouchableOpacity>
        );
      })}

      {/* Dynamic params */}
      {formAction && allParams.length > 0 && (
        <View style={[styles.paramsContainer, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={styles.paramsHeaderRow}>
            <Ionicons name="settings-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.paramsTitle, { color: colors.textSecondary }]}>Configure your action</Text>
          </View>
          {requiredParams.map((p) => renderParamField(p, true))}
          {optionalParams.map((p) => renderParamField(p, false))}
        </View>
      )}

      {/* Advanced */}
      <TouchableOpacity style={[styles.advancedToggle, { borderColor: colors.glassBorder }]} onPress={() => { triggerHaptic("light"); setShowAdvanced(!showAdvanced); }} activeOpacity={0.7}>
        <Text style={[styles.advancedToggleText, { color: colors.textSecondary }]}>Advanced Options</Text>
        <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {showAdvanced && (
        <View style={[styles.advancedContent, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Stop on first failure</Text>
              <Text style={[styles.toggleHint, { color: colors.textMuted }]}>If an action fails, skip the rest</Text>
            </View>
            <Switch value={formStopOnFailure} onValueChange={setFormStopOnFailure} trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }} thumbColor="#fff" />
          </View>
        </View>
      )}
    </>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <Animated.View style={{ transform: [{ scale: successScale }], opacity: successOpacity, alignItems: "center" }}>
        <View style={[styles.successCircle, { backgroundColor: "#22c55e20" }]}>
          <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
        </View>
        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Flow Created!</Text>
        <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
          "{formName}" is now running on autopilot.
        </Text>
      </Animated.View>
    </View>
  );

  // ── Preview bar (shows current selections) ──────────

  const renderPreviewBar = () => {
    if (!formTrigger && !formAction) return null;
    return (
      <View style={[styles.previewBar, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
        {formTrigger ? (
          <View style={[styles.previewBadge, { backgroundColor: colors.orange + "12" }]}>
            <Text style={{ fontSize: 14 }}>{TRIGGER_META[formTrigger]?.emoji || "⚡"}</Text>
            <Text style={[styles.previewBadgeText, { color: colors.orange }]}>{TRIGGER_META[formTrigger]?.label || formTrigger}</Text>
          </View>
        ) : null}
        {formTrigger && formAction ? (
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        ) : null}
        {formAction ? (
          <View style={[styles.previewBadge, { backgroundColor: colors.trustBlue + "12" }]}>
            <Ionicons name={ACTION_META[formAction]?.icon || "flash-outline"} size={14} color={colors.trustBlue} />
            <Text style={[styles.previewBadgeText, { color: colors.trustBlue }]}>{ACTION_META[formAction]?.label || formAction}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────

  return (
    <GlassBottomSheet
      visible={visible}
      onClose={handleClose}
      title={showSuccess ? "" : "New Smart Flow"}
      avoidKeyboard
    >
      {showSuccess ? renderSuccess() : (
        <>
          {renderStepIndicator()}
          {renderHintBubble()}
          {renderPreviewBar()}

          {/* Step content */}
          {currentStep === 0 && renderStep0()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            {currentStep > 0 ? (
              <TouchableOpacity style={[styles.backBtn, { borderColor: colors.glassBorder }]} onPress={goBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            ) : <View />}

            {currentStep < 2 ? (
              <GlassButton
                onPress={goNext}
                variant="primary"
                size="medium"
                disabled={!canGoNext()}
                rightIcon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
              >
                Next
              </GlassButton>
            ) : (
              <GlassButton
                onPress={handleCreate}
                variant="primary"
                size="medium"
                loading={creating}
                disabled={creating || !formAction}
                rightIcon={!creating ? <Ionicons name="checkmark" size={16} color="#fff" /> : undefined}
              >
                Create Flow
              </GlassButton>
            )}
          </View>

          <View style={{ height: 24 }} />
        </>
      )}
    </GlassBottomSheet>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  stepDotRow: {
    justifyContent: "center",
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
  },
  hintBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  triggerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  triggerCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  triggerCardDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  paramsContainer: {
    marginTop: 14,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  paramsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  paramsTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  advancedContent: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Success
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
