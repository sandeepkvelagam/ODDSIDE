import React from "react";
import {
  STRUCTURED_MESSAGE_TYPES,
  StructuredContent,
  FlowEvent,
  OptionSelectorPayload,
  TextInputPromptPayload,
  ConfirmationPayload,
  InfoCardPayload,
} from "./messageTypes";
import { OptionSelectorCard } from "./OptionSelectorCard";
import { TextInputPromptCard } from "./TextInputPromptCard";
import { ConfirmationCard } from "./ConfirmationCard";
import { InfoCard } from "./InfoCard";

interface StructuredMessageRendererProps {
  content: StructuredContent;
  isLatest: boolean;
  onFlowAction: (flowEvent: FlowEvent) => void;
  selectedValue?: string;
  submittedText?: string;
  actedAction?: string;
}

export function StructuredMessageRenderer({
  content,
  isLatest,
  onFlowAction,
  selectedValue,
  submittedText,
  actedAction,
}: StructuredMessageRendererProps) {

  const emitFlowEvent = (action: string, value: string) => {
    onFlowAction({
      flow_id: content.flow_id || "",
      step: content.flow_step || 0,
      action,
      value,
      flow_data: content.flow_data,
      interaction_id: `${content.flow_id || "x"}_${content.flow_step || 0}_${Date.now()}`,
    });
  };

  switch (content.type) {
    case STRUCTURED_MESSAGE_TYPES.OPTION_SELECTOR:
      return (
        <OptionSelectorCard
          payload={content.payload as OptionSelectorPayload}
          isLatest={isLatest}
          selectedValue={selectedValue}
          onSelect={(value) => emitFlowEvent("option_selected", value)}
        />
      );

    case STRUCTURED_MESSAGE_TYPES.TEXT_INPUT_PROMPT:
      return (
        <TextInputPromptCard
          payload={content.payload as TextInputPromptPayload}
          isLatest={isLatest}
          submittedText={submittedText}
          onSubmit={(text) => emitFlowEvent("text_submitted", text)}
        />
      );

    case STRUCTURED_MESSAGE_TYPES.CONFIRMATION:
      return (
        <ConfirmationCard
          payload={content.payload as ConfirmationPayload}
          isLatest={isLatest}
          actedAction={actedAction}
          onAction={(action) => emitFlowEvent(action, action)}
        />
      );

    case STRUCTURED_MESSAGE_TYPES.INFO_CARD:
      return (
        <InfoCard
          payload={content.payload as InfoCardPayload}
          isLatest={isLatest}
          onAction={(action) => emitFlowEvent(action, action)}
        />
      );

    default:
      return null;
  }
}
