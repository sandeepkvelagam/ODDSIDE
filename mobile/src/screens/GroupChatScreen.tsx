import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Text,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { getThemedColors } from "../styles/liquidGlass";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  getGroupMessages,
  postGroupMessage,
  voteOnPoll,
  closePoll,
  getPoll,
} from "../api/groupMessages";
import { useGroupSocket, type GroupMessage } from "../hooks/useGroupSocket";
import { PollCard } from "../components/PollCard";
import { GroupChatSettingsSheet } from "../components/GroupChatSettingsSheet";
import { getGroup } from "../api/groups";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "GroupChat">;

// ─── Kvitt Gradient Orb (reused from AIAssistantScreen) ───
function KvittOrb({ size = 32 }: { size?: number }) {
  const showEyes = size >= 40;
  const eyeSize = Math.max(size * 0.08, 3);
  const eyeTop = size * 0.38;
  const eyeGap = size * 0.14;
  const highlightSize = size * 0.35;

  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={["#FF8C42", "#FF6EA8", "#EE6C29"]}
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

// ─── Time formatter ───
function formatMessageTime(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return (
    date.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export function GroupChatScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const lc = getThemedColors(isDark, colors);
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const { groupId, groupName: routeGroupName } = route.params;

  // State
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [groupName, setGroupName] = useState(routeGroupName || "Group Chat");
  const [isAdmin, setIsAdmin] = useState(false);
  const [votingPoll, setVotingPoll] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [polls, setPolls] = useState<Record<string, any>>({});

  // Socket.IO
  const onSocketMessage = useCallback((msg: GroupMessage) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.message_id === msg.message_id)) return prev;
      return [msg, ...prev];
    });
  }, []);

  const { connected, typingUsers, emitTyping } = useGroupSocket(groupId, onSocketMessage);

  // Load initial data
  useEffect(() => {
    loadMessages();
    loadGroupInfo();
    checkBanner();
  }, [groupId]);

  async function checkBanner() {
    const key = `kvitt-banner-dismissed-${groupId}`;
    const dismissed = await AsyncStorage.getItem(key);
    setBannerDismissed(dismissed === "true");
  }

  async function dismissBanner() {
    const key = `kvitt-banner-dismissed-${groupId}`;
    await AsyncStorage.setItem(key, "true");
    setBannerDismissed(true);
  }

  async function loadGroupInfo() {
    try {
      const group = await getGroup(groupId);
      if (group?.name) setGroupName(group.name);
      if (group?.user_role === "admin") setIsAdmin(true);
    } catch {
      // Keep defaults
    }
  }

  async function loadMessages() {
    try {
      setLoadingMessages(true);
      const msgs = await getGroupMessages(groupId, 50);
      // API returns chronological order; we display inverted (newest first)
      setMessages(msgs.reverse());
      setHasMore(msgs.length >= 50);

      // Load poll data for messages with poll metadata
      const pollMsgIds = msgs
        .filter((m: any) => m.metadata?.poll_id)
        .map((m: any) => m.metadata.poll_id);
      for (const pollId of pollMsgIds) {
        try {
          const poll = await getPoll(groupId, pollId);
          setPolls((prev) => ({ ...prev, [pollId]: poll }));
        } catch {
          // Skip failed poll loads
        }
      }
    } catch {
      // Show empty state on error
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadOlderMessages() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    try {
      setLoadingMore(true);
      const older = await getGroupMessages(groupId, 50, oldest.message_id);
      if (older.length < 50) setHasMore(false);
      setMessages((prev) => [...prev, ...older.reverse()]);
    } catch {
      // Silent fail
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSend() {
    const content = newMessage.trim();
    if (!content || sendingMessage) return;

    setSendingMessage(true);
    setNewMessage("");
    try {
      const result = await postGroupMessage(groupId, content);
      // Optimistic insert — socket handler deduplicates by message_id
      const optimistic: GroupMessage = {
        message_id: result.message_id,
        group_id: groupId,
        user_id: user?.user_id ?? "",
        content,
        type: "user",
        created_at: new Date().toISOString(),
        user: { user_id: user?.user_id ?? "", name: user?.name ?? "You" },
      };
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === result.message_id)) return prev;
        return [optimistic, ...prev];
      });
    } catch {
      setNewMessage(content); // Restore on failure
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    setVotingPoll(pollId);
    try {
      const result = await voteOnPoll(groupId, pollId, optionId);
      if (result.poll) {
        setPolls((prev) => ({ ...prev, [pollId]: result.poll }));
      }
    } catch {
      // Silent fail
    } finally {
      setVotingPoll(null);
    }
  }

  async function handleClosePoll(pollId: string) {
    try {
      await closePoll(groupId, pollId);
      // Refresh poll data
      const poll = await getPoll(groupId, pollId);
      setPolls((prev) => ({ ...prev, [pollId]: poll }));
    } catch {
      // Silent fail
    }
  }

  function handleTextChange(text: string) {
    setNewMessage(text);
    if (text.length > 0 && user?.name) {
      emitTyping(user.name);
    }
  }

  // Typing users (exclude self)
  const activeTyping = typingUsers.filter((t) => t.user_id !== user?.user_id);

  // ─── Render message ───
  const renderMessage = useCallback(
    ({ item: msg }: { item: GroupMessage }) => {
      const isOwn = msg.user_id === user?.user_id;
      const isAI = msg.user_id === "ai_assistant";
      const isSystem = msg.type === "system";

      // System message
      if (isSystem) {
        return (
          <View style={styles.systemRow}>
            <Text style={[styles.systemText, { color: lc.textMuted }]}>{msg.content}</Text>
          </View>
        );
      }

      // Poll message
      const pollId = msg.metadata?.poll_id;
      const pollData = pollId ? polls[pollId] : null;

      return (
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {/* Avatar */}
          {!isOwn && (
            <View style={styles.avatarContainer}>
              {isAI ? (
                <KvittOrb size={32} />
              ) : (
                <View style={[styles.messageAvatar, { backgroundColor: lc.glowBlue }]}>
                  <Text style={[styles.messageAvatarText, { color: lc.trustBlue }]}>
                    {(msg.user?.name || "?")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bubble */}
          <View
            style={[
              styles.messageBubble,
              isOwn
                ? { backgroundColor: lc.trustBlue }
                : {
                    backgroundColor: lc.liquidGlassBg,
                    borderColor: lc.liquidGlassBorder,
                    borderWidth: 1,
                  },
            ]}
          >
            {!isOwn && (
              <Text
                style={[
                  styles.messageSender,
                  { color: isAI ? lc.orange : lc.trustBlue },
                ]}
              >
                {isAI ? "Kvitt" : msg.user?.name || "Player"}
              </Text>
            )}
            <Text style={[styles.messageText, { color: isOwn ? "#fff" : lc.textPrimary }]}>
              {msg.content}
            </Text>

            {/* Inline poll */}
            {pollData && (
              <PollCard
                poll={pollData}
                groupId={groupId}
                currentUserId={user?.user_id || ""}
                isAdmin={isAdmin}
                onVote={handleVote}
                onClose={handleClosePoll}
                voting={votingPoll === pollId}
              />
            )}

            <Text
              style={[
                styles.messageTime,
                { color: isOwn ? "rgba(255,255,255,0.7)" : lc.textMuted },
              ]}
            >
              {formatMessageTime(msg.created_at)}
            </Text>
          </View>
        </View>
      );
    },
    [lc, user, isAdmin, polls, votingPoll, groupId]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: lc.jetDark }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: lc.jetSurface,
            borderBottomColor: lc.liquidGlassBorder,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={lc.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: lc.textPrimary }]} numberOfLines={1}>
            {groupName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: lc.textMuted }]}>
            {connected ? "Online" : "Connecting..."}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color={lc.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Privacy banner */}
      {!bannerDismissed && (
        <View style={[styles.banner, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
          <Ionicons name="shield-checkmark" size={16} color={lc.moonstone} />
          <Text style={[styles.bannerText, { color: lc.textSecondary }]}>
            Avoid sharing sensitive info in chat. Kvitt can help without it.
          </Text>
          <TouchableOpacity onPress={dismissBanner}>
            <Ionicons name="close" size={18} color={lc.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {loadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lc.trustBlue} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={lc.textMuted} />
          <Text style={[styles.emptyTitle, { color: lc.textSecondary }]}>No messages yet</Text>
          <Text style={[styles.emptySubtext, { color: lc.textMuted }]}>
            Start planning your next game!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.message_id}
          renderItem={renderMessage}
          inverted
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={lc.trustBlue} style={{ padding: 16 }} />
            ) : null
          }
        />
      )}

      {/* Typing indicator */}
      {activeTyping.length > 0 && (
        <View style={[styles.typingBar, { backgroundColor: lc.liquidGlassBg }]}>
          <Text style={[styles.typingText, { color: lc.textMuted }]}>
            {activeTyping.length === 1
              ? `${activeTyping[0].user_name} is typing...`
              : `${activeTyping.length} people typing...`}
          </Text>
        </View>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: lc.liquidGlassBg,
            borderTopColor: lc.liquidGlassBorder,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: lc.liquidInnerBg,
              color: lc.textPrimary,
              borderColor: lc.liquidGlassBorder,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={lc.textMuted}
          value={newMessage}
          onChangeText={handleTextChange}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: lc.trustBlue },
            (!newMessage.trim() || sendingMessage) && styles.buttonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sendingMessage}
          activeOpacity={0.8}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Settings sheet */}
      <GroupChatSettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        groupId={groupId}
        isAdmin={isAdmin}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  settingsButton: {
    padding: 8,
  },
  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  // Loading / Empty
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  systemRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  systemText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  avatarContainer: {
    marginRight: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 12,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  // Typing
  typingBar: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  typingText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  // Input
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
