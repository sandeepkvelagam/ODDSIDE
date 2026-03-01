/**
 * Structured Message Types for AI Chat
 *
 * Defines the versioned contract between backend and frontend for
 * rendering rich, interactive AI assistant messages.
 */

export const SCHEMA_VERSION = 1;

// ─── Message Type Constants ───────────────────────────────────────

export const STRUCTURED_MESSAGE_TYPES = {
  OPTION_SELECTOR: "option_selector",
  TEXT_INPUT_PROMPT: "text_input_prompt",
  CONFIRMATION: "confirmation",
  INFO_CARD: "info_card",
} as const;

export type StructuredMessageType =
  (typeof STRUCTURED_MESSAGE_TYPES)[keyof typeof STRUCTURED_MESSAGE_TYPES];

// ─── Option Selector ──────────────────────────────────────────────

export interface OptionItem {
  label: string;
  value: string;
  icon?: string; // Ionicons name
  description?: string;
}

export interface OptionSelectorPayload {
  prompt: string;
  options: OptionItem[];
  allow_custom?: boolean;
}

// ─── Text Input Prompt ────────────────────────────────────────────

export interface TextInputPromptPayload {
  prompt: string;
  placeholder?: string;
  min_length?: number;
  max_length?: number;
  submit_label?: string;
}

// ─── Confirmation ─────────────────────────────────────────────────

export interface ConfirmationDetailRow {
  label: string;
  value: string;
}

export interface ConfirmationAction {
  label: string;
  action: string; // e.g. "email:support@kvitt.app" or "link:https://..."
  variant?: "primary" | "secondary" | "ghost";
}

export interface ConfirmationPayload {
  title: string;
  message: string;
  variant: "success" | "info" | "warning" | "error";
  details?: ConfirmationDetailRow[];
  actions?: ConfirmationAction[];
}

// ─── Info Card ────────────────────────────────────────────────────

export interface InfoCardAction {
  label: string;
  action: string;
}

export interface InfoCardPayload {
  title: string;
  body: string;
  icon?: string;
  footer?: string;
  actions?: InfoCardAction[];
}

// ─── Structured Content (top-level response shape) ────────────────

export type StructuredPayload =
  | OptionSelectorPayload
  | TextInputPromptPayload
  | ConfirmationPayload
  | InfoCardPayload;

export interface StructuredContent {
  schema_version: number;
  type: StructuredMessageType;
  flow_id?: string;
  flow_step?: number;
  flow_data?: Record<string, any>;
  payload: StructuredPayload;
}

// ─── Flow Event (sent from frontend → backend) ───────────────────

export interface FlowEvent {
  flow_id: string;
  step: number;
  action: string; // "option_selected" | "text_submitted"
  value: string;
  flow_data?: Record<string, any>;
  interaction_id: string;
}
