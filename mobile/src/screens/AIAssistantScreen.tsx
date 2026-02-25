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
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useTheme } from "../context/ThemeContext";
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
  source?: string;
  navigation?: { screen: string; params?: Record<string, any> };
};

const SUGGESTIONS = [
  "How do I create a group?",
  "How does buy-in work?",
  "How do I cash out?",
  "What is settlement?",
  "Poker hand rankings",
];

/* ─── Gradient Orb Character ─── */
export function AIGradientOrb({ size = 28 }: { size?: number }) {
  const showEyes = size >= 40;
  const eyeSize = Math.max(size * 0.08, 3);
  const eyeTop = size * 0.38;
  const eyeGap = size * 0.14;
  const highlightSize = size * 0.35;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient
        colors={["#FF6EA8", "#7848FF", "#281A5A"]}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.7, y: 0.9 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Specular highlight */}
        <View
          style={{
            position: "absolute",
            top: size * 0.12,
            left: size * 0.15,
            width: highlightSize,
            height: highlightSize,
            borderRadius: highlightSize / 2,
            backgroundColor: "rgba(255,255,255,0.25)",
            transform: [{ rotate: "-30deg" }, { scaleX: 0.8 }],
          }}
        />
        {/* Eyes - triangular (rotated squares) */}
        {showEyes && (
          <>
            <View
              style={{
                position: "absolute",
                top: eyeTop,
                left: size / 2 - eyeGap - eyeSize,
                width: eyeSize,
                height: eyeSize,
                backgroundColor: "#fff",
                transform: [{ rotate: "45deg" }],
              }}
            />
            <View
              style={{
                position: "absolute",
                top: eyeTop,
                left: size / 2 + eyeGap,
                width: eyeSize,
                height: eyeSize,
                backgroundColor: "#fff",
                transform: [{ rotate: "45deg" }],
              }}
            />
          </>
        )}
      </LinearGradient>
    </View>
  );
}

export function AIAssistantScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Welcome → Chat transition
  const [hasStarted, setHasStarted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Kvitt assistant. Ask me anything about the app — creating groups, games, buy-ins, settlements, or poker rules!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestsRemaining, setRequestsRemaining] = useState<number | null>(null);

  // Visibility toggle state
  const [chatVisible, setChatVisible] = useState(true);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Welcome stagger
  const welcomeBubble = useRef(new Animated.Value(0)).current;
  const welcomeOrb = useRef(new Animated.Value(0)).current;
  const welcomeText = useRef(new Animated.Value(0)).current;
  const welcomeCta = useRef(new Animated.Value(0)).current;

  // Orb breathing
  const orbBreathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();

    // Stagger welcome elements
    Animated.stagger(120, [
      Animated.spring(welcomeBubble, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(welcomeOrb, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(welcomeText, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(welcomeCta, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();

    // Orb breathing loop
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(orbBreathe, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbBreathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    breathe.start();

    return () => breathe.stop();
  }, []);

  // Fetch usage on mount
  useEffect(() => {
    api.get("/assistant/usage").then((res) => {
      setRequestsRemaining(res.data.requests_remaining);
    }).catch(() => {});
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
    if (!hasStarted) setHasStarted(true);

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    if (!chatVisible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setChatVisible(true);
    }

    try {
      const response = await api.post("/assistant/ask", {
        message: text,
        context: { current_page: "mobile_app" },
      });
      const data = response.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          source: data.source,
          navigation: data.navigation,
        },
      ]);
      if (data.requests_remaining !== undefined) {
        setRequestsRemaining(data.requests_remaining);
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        const upgradeMsg = err.response.data?.upgrade_message || "Daily limit reached. Upgrade to Premium for more.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: upgradeMsg, error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't process that. Please try again later.",
            error: true,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (nav: { screen: string; params?: Record<string, any> }) => {
    navigation.navigate(nav.screen as any, nav.params as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.contentBg }]}>
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
          <AIGradientOrb size={32} />
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Kvitt Assistant</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaBadgeText}>BETA</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {requestsRemaining !== null
                ? `${requestsRemaining} requests left`
                : chatVisible
                ? "Ask me anything"
                : `${messages.length - 1} message${messages.length - 1 !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
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

      {/* ── Welcome Screen ── */}
      {!hasStarted ? (
        <View style={styles.welcomeContainer}>
          {/* Speech bubble */}
          <Animated.View
            style={{
              opacity: welcomeBubble,
              transform: [
                {
                  translateY: welcomeBubble.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            }}
          >
            <View style={styles.speechBubble}>
              <Text style={styles.speechBubbleText}>Hello!</Text>
              <View style={styles.speechBubbleTail} />
            </View>
          </Animated.View>

          {/* Orb */}
          <Animated.View
            style={{
              opacity: welcomeOrb,
              transform: [{ scale: orbBreathe }],
            }}
          >
            <AIGradientOrb size={120} />
          </Animated.View>

          {/* Heading + subtitle */}
          <Animated.View
            style={{
              opacity: welcomeText,
              transform: [
                {
                  translateY: welcomeText.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              alignItems: "center",
            }}
          >
            <Text style={styles.welcomeHeading}>
              Your{" "}
              <Text style={{ color: "#A78BFA" }}>Smart</Text>
              {" "}Assistant
            </Text>
            <Text style={styles.welcomeHeading}>for Any Task</Text>
            <Text style={styles.welcomeSubtext}>
              Instant help for planning, questions, and quick decisions.
            </Text>
          </Animated.View>

          {/* CTA */}
          <Animated.View
            style={{
              opacity: welcomeCta,
              transform: [
                {
                  translateY: welcomeCta.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              width: "100%",
              paddingHorizontal: 24,
            }}
          >
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => setHasStarted(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaButtonText}>Get started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <>
          {/* ── Minimized bar ── */}
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

          {/* ── Chat body ── */}
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
                  <View key={i}>
                    <Animated.View
                      style={[
                        styles.messageRow,
                        msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
                        { opacity: fadeAnim },
                      ]}
                    >
                      {msg.role === "assistant" && (
                        <View style={styles.avatarBot}>
                          <AIGradientOrb size={28} />
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
                        {msg.source === "quick_answer" && (
                          <Text style={styles.quickAnswerTag}>⚡ Quick answer</Text>
                        )}
                      </View>
                      {msg.role === "user" && (
                        <View style={styles.avatarUser}>
                          <Ionicons name="person" size={12} color="#fff5ee" />
                        </View>
                      )}
                    </Animated.View>

                    {/* Navigation button */}
                    {msg.navigation && (
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={() => handleNavigation(msg.navigation!)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="arrow-forward-circle" size={16} color={COLORS.orange} />
                        <Text style={styles.navButtonText}>
                          Go to {msg.navigation.screen} →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {loading && (
                  <View style={[styles.messageRow, styles.messageRowAssistant]}>
                    <View style={styles.avatarBot}>
                      <AIGradientOrb size={28} />
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  betaBadge: {
    backgroundColor: "rgba(124,58,237,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  betaBadgeText: {
    color: "#A78BFA",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
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

  /* ── Welcome Screen ── */
  welcomeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  speechBubble: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  speechBubbleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  speechBubbleTail: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
  },
  welcomeHeading: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text.primary,
    textAlign: "center",
    lineHeight: 34,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: COLORS.text.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: COLORS.text.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  /* ── Minimized state ── */
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

  /* ── Chat ── */
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
  messageBubbleUser: { backgroundColor: "#7C3AED" },
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
  quickAnswerTag: {
    fontSize: 9,
    color: COLORS.text.muted,
    marginTop: 4,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 36,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.glass.glowOrange,
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  navButtonText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: "600",
  },

  /* ── Suggestions ── */
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

  /* ── Input ── */
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
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: COLORS.glass.bg },
});

export default AIAssistantScreen;
