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
  Animated,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassIconButton } from "../components/ui";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
        "Hi! I'm your Kvitt assistant. Ask me anything about the app — creating groups, games, buy-ins, settlements, or poker rules!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Visibility toggle state
  const [chatVisible, setChatVisible] = useState(true);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
  }, []);

  useEffect(() => {
    if (chatVisible) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, chatVisible]);

  const toggleChatVisibility = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setChatVisible((v) => !v);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // If chat was hidden, show it when a message is sent
    if (!chatVisible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setChatVisible(true);
    }

    try {
      const response = await api.post("/assistant/ask", {
        message: text,
        context: { current_page: "mobile_app" },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.response }]);
    } catch {
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <Animated.View
        style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <GlassIconButton
          icon={<Ionicons name="chevron-down" size={22} color={COLORS.text.secondary} />}
          onPress={() => navigation.goBack()}
          variant="ghost"
        />

        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={16} color={COLORS.orange} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kvitt Assistant</Text>
            <Text style={styles.headerSubtitle}>
              {chatVisible ? "Ask me anything" : `${messages.length - 1} message${messages.length - 1 !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* ── Visibility toggle ── */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={toggleChatVisibility}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="ai-chat-visibility-toggle"
          >
            <Ionicons
              name={chatVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={COLORS.text.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pokerAIButton}
            onPress={() => navigation.navigate("PokerAI")}
            activeOpacity={0.7}
          >
            <Ionicons name="diamond" size={16} color={COLORS.orange} />
            <Text style={styles.pokerAIText}>Poker AI</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Minimized bar — shown when chat is hidden ── */}
      {!chatVisible && (
        <TouchableOpacity
          style={styles.minimizedBar}
          onPress={toggleChatVisibility}
          activeOpacity={0.8}
          testID="ai-chat-show-bar"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.orange} />
          <Text style={styles.minimizedText}>
            {loading ? "Thinking..." : "Tap to show conversation"}
          </Text>
          {loading && <ActivityIndicator size="small" color={COLORS.orange} />}
        </TouchableOpacity>
      )}

      {/* ── Chat body — collapsed when !chatVisible ── */}
      {chatVisible && (
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
              <Animated.View
                key={i}
                style={[
                  styles.messageRow,
                  msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
                  { opacity: fadeAnim },
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
                  <Text style={[styles.messageText, msg.role === "user" && styles.messageTextUser]}>
                    {msg.content}
                  </Text>
                </View>
                {msg.role === "user" && (
                  <View style={styles.avatarUser}>
                    <Ionicons name="person" size={12} color="#fff5ee" />
                  </View>
                )}
              </Animated.View>
            ))}

            {loading && (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <View style={styles.avatarBot}>
                  <Ionicons name="sparkles" size={12} color={COLORS.orange} />
                </View>
                <View style={styles.messageBubbleAssistant}>
                  <ActivityIndicator size="small" color={COLORS.text.secondary} />
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
                    onPress={() => sendMessage(s)}
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
                placeholderTextColor={COLORS.text.muted}
                editable={!loading}
                onSubmitEditing={() => sendMessage(input)}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={!input.trim() || loading ? COLORS.text.muted : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginLeft: SPACING.md,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  headerSubtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pokerAIButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.glass.glowOrange,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  pokerAIText: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },

  // Minimized state
  minimizedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    margin: SPACING.container,
    padding: SPACING.lg,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.orange + "40",
    borderRadius: RADIUS.xl,
  },
  minimizedText: {
    flex: 1,
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },

  keyboardView: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: {
    padding: SPACING.container,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
  },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAssistant: { justifyContent: "flex-start" },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.orangeDark,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  messageBubbleAssistant: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  messageBubbleUser: { backgroundColor: COLORS.orangeDark },
  messageBubbleError: {
    backgroundColor: COLORS.glass.glowRed,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  messageText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 20,
  },
  messageTextUser: { color: "#ffffff" },
  suggestionsContainer: {
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass.border,
  },
  suggestionsLabel: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginBottom: SPACING.sm,
  },
  suggestionsList: { gap: SPACING.sm },
  suggestionChip: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  suggestionText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  inputContainer: {
    paddingHorizontal: SPACING.container,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass.border,
    backgroundColor: COLORS.jetDark,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.xs,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    paddingVertical: SPACING.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: COLORS.glass.bg },
});

export default AIAssistantScreen;
