import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Claude-style warm dark theme colors
const COLORS = {
  navBg: "#1a1816",
  contentBg: "#252320",
  textPrimary: "#ffffff",
  textSecondary: "#9a9a9a",
  textMuted: "#666666",
  border: "rgba(255, 255, 255, 0.06)",
  glassBg: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  orange: "#e8845c",
};

type Message = {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const SUGGESTIONS = [
  "How do I create a group?",
  "How does buy-in work?",
  "How do I cash out?",
  "What is settlement?",
];

export function AIAssistantScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Kvitt assistant. Ask me anything about the app - creating groups, games, buy-ins, settlements, or poker rules!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/assistant/ask", {
        message: text,
        context: { current_page: "mobile_app" },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.response,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again later.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.glassButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={16} color={COLORS.orange} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kvitt Assistant</Text>
            <Text style={styles.headerSubtitle}>Ask me anything</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.pokerAIButton}
          onPress={() => navigation.navigate("PokerAI")}
          activeOpacity={0.7}
        >
          <Ionicons name="diamond" size={16} color={COLORS.orange} />
          <Text style={styles.pokerAIText}>Poker AI</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.messageRow,
                msg.role === "user"
                  ? styles.messageRowUser
                  : styles.messageRowAssistant,
              ]}
            >
              {msg.role === "assistant" && (
                <View style={styles.avatarBot}>
                  <Ionicons name="sparkles" size={12} color={COLORS.orange} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.role === "user"
                    ? styles.messageBubbleUser
                    : msg.error
                    ? styles.messageBubbleError
                    : styles.messageBubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === "user" && styles.messageTextUser,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
              {msg.role === "user" && (
                <View style={styles.avatarUser}>
                  <Ionicons name="person" size={12} color="#fff5ee" />
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={styles.avatarBot}>
                <Ionicons name="sparkles" size={12} color={COLORS.orange} />
              </View>
              <View style={styles.messageBubbleAssistant}>
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Quick questions:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
            >
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestion(s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message Kvitt..."
              placeholderTextColor={COLORS.textMuted}
              editable={!loading}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="send"
                size={18}
                color={!input.trim() || loading ? COLORS.textMuted : "#fff5ee"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.contentBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(232,132,92,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  pokerAIButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(232,132,92,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(232,132,92,0.3)",
  },
  pokerAIText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.orange,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  avatarBot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(232,132,92,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.orange,
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderBottomLeftRadius: 4,
  },
  messageBubbleError: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextUser: {
    color: "#fff5ee",
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  suggestionsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.glassBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glassBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.glassBg,
  },
});
