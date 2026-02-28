import React, { useState, useRef, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Pressable,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useHaptics } from "../context/HapticsContext";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { themeMode, setThemeMode, colors } = useTheme();
  const { language, t, supportedLanguages } = useLanguage();
  const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useHaptics();

  const [showAppearancePopup, setShowAppearancePopup] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [badgeData, setBadgeData] = useState<{
    level: { name: string; icon: string };
    badges: { id: string; icon: string; name: string; earned: boolean }[];
    earned_count: number;
    total_badges?: number;
    stats?: { total_games: number; wins: number; win_rate: number; total_profit: number };
    progress?: { next_level: string; games_needed: number; profit_needed: number; games_progress: number };
  } | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [voiceCommand, setVoiceCommand] = useState<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const userName = user?.name || user?.email?.split("@")[0] || "Player";

  useEffect(() => {
    if (user?.user_id) {
      AsyncStorage.getItem(`kvitt-avatar-${user.user_id}`)
        .then(uri => { if (uri) setAvatarUri(uri); })
        .catch(() => {});
    }
    api.get("/users/me/badges")
      .then(res => setBadgeData(res.data))
      .catch(() => {});
  }, [user?.user_id]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Enable photo library access in settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      if (user?.user_id) {
        await AsyncStorage.setItem(`kvitt-avatar-${user.user_id}`, uri);
      }
    }
  };
  
  // Get current language display name
  const currentLangInfo = supportedLanguages.find(l => l.code === language);
  const currentLangDisplay = currentLangInfo ? `${currentLangInfo.flag} ${currentLangInfo.nativeName}` : "English";

  const handleSignOut = () => {
    Alert.alert(t.settings.signOut, t.settings.signOutConfirm, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.settings.signOut, style: "destructive", onPress: signOut },
    ]);
  };

  const getAppearanceLabel = () => {
    switch (themeMode) {
      case "light": return t.settings.light;
      case "dark": return t.settings.dark;
      case "system": return t.settings.system;
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Microphone access needed", "Enable it in your device settings.");
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      setTranscribedText("");
      setVoiceCommand(null);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Recording unavailable", "Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsProcessing(false);
      Alert.alert("Recording unavailable", "Please try again.");
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      const formData = new FormData();
      
      // Add audio file
      formData.append("file", {
        uri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as any);
      
      // Add language code for Whisper
      formData.append("language", language);

      const response = await api.post("/voice/transcribe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setTranscribedText(response.data.text || "");
      setVoiceCommand(response.data.command);
    } catch (error) {
      console.error("Transcription error:", error);
      Alert.alert("Transcription unavailable", "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <BottomSheetScreen>
      <View
        testID="settings-screen"
        style={[styles.container, { backgroundColor: colors.contentBg }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 16 }]}>
          <Pressable
            testID="settings-close-button"
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && styles.glassButtonPressed
            ]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close settings"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t.settings.title}</Text>

          <Pressable
            testID="settings-info-button"
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && styles.glassButtonPressed,
            ]}
            onPress={() => {
              triggerHaptic("light");
              setShowInfoPopup(true);
            }}
            accessibilityLabel="App info"
            accessibilityRole="button"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Card - Compact Horizontal */}
          <View style={[styles.profileCardOuter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileCardRow}>
              {/* Left: Avatar */}
              <View style={styles.profileAvatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
                ) : (
                  <LinearGradient
                    colors={['#EE6C29', '#C45A22', '#8B3A15']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileAvatar}
                  >
                    <Text style={styles.profileAvatarInitial}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                <TouchableOpacity
                  style={styles.profileCameraButton}
                  onPress={handlePickAvatar}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={11} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Right: Info */}
              <View style={styles.profileInfoCol}>
                <View style={styles.profileOverlayNameRow}>
                  <Text style={[styles.profileOverlayName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {userName}
                  </Text>
                  {badgeData?.level && (
                    <View style={[styles.profileLevelChip, { backgroundColor: colors.orange + "20" }]}>
                      <Text style={[styles.profileLevelChipText, { color: colors.orange }]}>
                        {badgeData.level.icon} {badgeData.level.name}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.profileOverlayEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {user?.email || ""}
                </Text>

                {/* Stats inline */}
                <View style={styles.profileStatsRow}>
                  <View style={styles.profileStatItem}>
                    <Text style={[styles.profileStatValue, { color: colors.textPrimary }]}>
                      {badgeData?.stats?.total_games ?? 0}
                    </Text>
                    <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Games</Text>
                  </View>
                  <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.profileStatItem}>
                    <Text style={[styles.profileStatValue, { color: colors.textPrimary }]}>
                      {badgeData?.stats?.win_rate?.toFixed(0) ?? 0}%
                    </Text>
                    <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Win Rate</Text>
                  </View>
                  <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.profileStatItem}>
                    <Text style={[styles.profileStatValue, { color: colors.textPrimary }]}>
                      {badgeData?.earned_count ?? 0}
                    </Text>
                    <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>Badges</Text>
                  </View>
                </View>

                {/* Earned badges inline */}
                {badgeData && badgeData.earned_count > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileBadgesScroll}>
                    {badgeData.badges.filter(b => b.earned).map(badge => (
                      <View key={badge.id} style={[styles.profileBadgePill, { backgroundColor: colors.orange + "14" }]}>
                        <Text style={styles.profileBadgeEmoji}>{badge.icon}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* Bottom gradient overlay across full card */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.15)']}
              style={styles.profileGradientOverlay}
              pointerEvents="none"
            />
          </View>

          {/* Section 1: Profile & Billing */}
          <TouchableOpacity
            testID="settings-profile-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.profile}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-billing-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Billing")}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.billing}</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-wallet-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Wallet")}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Wallet</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-requestpay-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("RequestAndPay" as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Request & Pay</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.spacer} />

          {/* Section 2: Appearance, Language, Voice, Notifications, Privacy */}
          <TouchableOpacity
            testID="settings-appearance-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => setShowAppearancePopup(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="moon-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.appearance}</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{getAppearanceLabel()}</Text>
            <Ionicons name="chevron-expand" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-language-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Language")}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.language}</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{currentLangDisplay}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-voice-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => setShowVoiceModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.voiceCommands}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-notifications-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.notifications}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-privacy-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Privacy")}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.privacy}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-automations-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Automations" as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Smart Flows</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="settings-feedback-button"
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Feedback")}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Report an Issue</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.spacer} />

          {/* Section 3: Haptic feedback */}
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.hapticFeedback}</Text>
            <Switch
              testID="settings-haptic-switch"
              value={hapticsEnabled}
              onValueChange={(value) => {
                setHapticsEnabled(value);
                if (value) Haptics.selectionAsync().catch(() => {});
              }}
              trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.spacer} />

          {/* Section 4: Log out */}
          <TouchableOpacity
            testID="settings-signout-button"
            style={[styles.menuItem, { borderBottomColor: "transparent" }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t.settings.signOut}</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>

      {/* Appearance Popup */}
      <Modal
        visible={showAppearancePopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppearancePopup(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAppearancePopup(false)}
        >
          <Pressable style={[styles.appearancePopup, { backgroundColor: colors.popupBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.popupTitle, { color: colors.textPrimary }]}>{t.settings.appearance}</Text>

            <TouchableOpacity
              testID="appearance-light-option"
              style={[
                styles.popupOption,
                themeMode === "light" && styles.popupOptionSelected,
                { borderColor: themeMode === "light" ? colors.orange : colors.border }
              ]}
              onPress={() => {
                setThemeMode("light");
                setShowAppearancePopup(false);
              }}
            >
              <Ionicons name="sunny-outline" size={20} color={themeMode === "light" ? colors.orange : colors.textPrimary} />
              <Text style={[styles.popupOptionText, { color: themeMode === "light" ? colors.orange : colors.textPrimary }]}>{t.settings.light}</Text>
              {themeMode === "light" && <Ionicons name="checkmark" size={20} color={colors.orange} />}
            </TouchableOpacity>

            <TouchableOpacity
              testID="appearance-dark-option"
              style={[
                styles.popupOption,
                themeMode === "dark" && styles.popupOptionSelected,
                { borderColor: themeMode === "dark" ? colors.orange : colors.border }
              ]}
              onPress={() => {
                setThemeMode("dark");
                setShowAppearancePopup(false);
              }}
            >
              <Ionicons name="moon-outline" size={20} color={themeMode === "dark" ? colors.orange : colors.textPrimary} />
              <Text style={[styles.popupOptionText, { color: themeMode === "dark" ? colors.orange : colors.textPrimary }]}>{t.settings.dark}</Text>
              {themeMode === "dark" && <Ionicons name="checkmark" size={20} color={colors.orange} />}
            </TouchableOpacity>

            <TouchableOpacity
              testID="appearance-system-option"
              style={[
                styles.popupOption,
                themeMode === "system" && styles.popupOptionSelected,
                { borderColor: themeMode === "system" ? colors.orange : colors.border }
              ]}
              onPress={() => {
                setThemeMode("system");
                setShowAppearancePopup(false);
              }}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={themeMode === "system" ? colors.orange : colors.textPrimary} />
              <Text style={[styles.popupOptionText, { color: themeMode === "system" ? colors.orange : colors.textPrimary }]}>{t.settings.system}</Text>
              {themeMode === "system" && <Ionicons name="checkmark" size={20} color={colors.orange} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Voice Commands Modal */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <View style={styles.voiceModalContainer}>
          <View style={[styles.voiceModalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.voiceModalHeader}>
              <Text style={[styles.voiceModalTitle, { color: colors.textPrimary }]}>
                {t.voice.title}
              </Text>
              <TouchableOpacity
                testID="voice-modal-close"
                onPress={() => setShowVoiceModal(false)}
                style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                activeOpacity={0.7}
                accessibilityLabel="Close voice commands"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Voice Recording Button */}
            <View style={styles.voiceRecordingSection}>
              <TouchableOpacity
                testID="voice-record-button"
                style={[
                  styles.voiceButton,
                  isRecording && styles.voiceButtonRecording,
                  { backgroundColor: isRecording ? "#ef4444" : colors.orange }
                ]}
                onPress={handleVoiceButtonPress}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={48}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
              
              <Text style={[styles.voiceStatusText, { color: colors.textSecondary }]}>
                {isProcessing
                  ? t.voice.processing
                  : isRecording
                  ? t.voice.listening
                  : t.voice.tapToSpeak}
              </Text>
            </View>

            {/* Transcription Result */}
            {transcribedText ? (
              <View style={[styles.transcriptionBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.transcriptionLabel, { color: colors.textSecondary }]}>
                  {t.voice.commandRecognized}
                </Text>
                <Text style={[styles.transcriptionText, { color: colors.textPrimary }]}>
                  "{transcribedText}"
                </Text>
                {voiceCommand && (
                  <View style={[styles.commandBadge, { backgroundColor: colors.orange + "20" }]}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.orange} />
                    <Text style={[styles.commandText, { color: colors.orange }]}>
                      {voiceCommand.type?.replace("_", " ")}
                      {voiceCommand.amount ? `: $${voiceCommand.amount}` : ""}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Voice Command Examples */}
            <View style={styles.examplesSection}>
              <Text style={[styles.examplesTitle, { color: colors.textSecondary }]}>
                {t.voice.examples}
              </Text>
              <View style={styles.examplesList}>
                <Text style={[styles.exampleText, { color: colors.textMuted }]}>
                  {t.voice.buyInExample}
                </Text>
                <Text style={[styles.exampleText, { color: colors.textMuted }]}>
                  {t.voice.rebuyExample}
                </Text>
                <Text style={[styles.exampleText, { color: colors.textMuted }]}>
                  {t.voice.cashOutExample}
                </Text>
                <Text style={[styles.exampleText, { color: colors.textMuted }]}>
                  {t.voice.helpExample}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Info Popup */}
      <Modal
        visible={showInfoPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoPopup(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowInfoPopup(false)}
        >
          <Pressable
            style={[
              styles.infoPopup,
              {
                backgroundColor: colors.popupBg,
                top: insets.top + 70,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.infoVersionText, { color: colors.textMuted }]}>Kvitt v1.0.0</Text>

            <TouchableOpacity
              style={[styles.infoItem, { borderTopColor: colors.border }]}
              onPress={() => { setShowInfoPopup(false); Linking.openURL("https://kvitt.app/acceptable-use"); }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>Acceptable Use Policy</Text>
              <Ionicons name="open-outline" size={15} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoItem, { borderTopColor: colors.border }]}
              onPress={() => { setShowInfoPopup(false); Linking.openURL("https://kvitt.app/terms"); }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>Consumer Terms</Text>
              <Ionicons name="open-outline" size={15} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoItem, { borderTopColor: colors.border }]}
              onPress={() => { setShowInfoPopup(false); Linking.openURL("https://kvitt.app/privacy"); }}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
    marginTop: 8,
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
  glassButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCardOuter: {
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  profileCardRow: {
    flexDirection: "row",
    padding: 14,
    gap: 14,
  },
  profileAvatarWrap: {
    position: "relative",
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarInitial: {
    fontSize: 28,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
  },
  profileCameraButton: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  profileInfoCol: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  profileOverlayNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileOverlayName: {
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },
  profileLevelChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  profileLevelChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  profileOverlayEmail: {
    fontSize: 12,
    marginBottom: 4,
  },
  profileGradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  profileStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  profileStatItem: {
    flex: 1,
    alignItems: "center",
  },
  profileStatValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  profileStatLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  profileStatDivider: {
    width: 1,
    height: 20,
  },
  profileBadgesScroll: {
    flexDirection: "row",
    gap: 5,
    marginTop: 4,
  },
  profileBadgePill: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profileBadgeEmoji: {
    fontSize: 14,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    borderBottomWidth: 1,
    gap: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
  },
  menuValue: {
    fontSize: 16,
    marginRight: 4,
  },
  spacer: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  appearancePopup: {
    width: 280,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  popupOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  popupOptionSelected: {
    backgroundColor: "rgba(232, 132, 92, 0.08)",
  },
  popupOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  comingSoonBadge: {
    backgroundColor: "rgba(239, 110, 89, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#EF6E59",
  },
  versionText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  // Voice Modal Styles
  voiceModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  voiceModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 24,
    maxHeight: "80%",
  },
  voiceModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  voiceModalTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  voiceRecordingSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  voiceButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  voiceButtonRecording: {
    transform: [{ scale: 1.1 }],
  },
  voiceStatusText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  transcriptionBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptionText: {
    fontSize: 18,
    fontWeight: "500",
    fontStyle: "italic",
  },
  commandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  commandText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  examplesSection: {
    marginTop: 8,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  examplesList: {
    gap: 8,
  },
  exampleText: {
    fontSize: 15,
    fontStyle: "italic",
  },
  infoPopup: {
    position: "absolute",
    right: 16,
    width: 240,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoVersionText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  infoItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
