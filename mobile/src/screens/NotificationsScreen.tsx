import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassIconButton, GlassSurface } from "../components/ui";

export function NotificationsScreen() {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [settlements, setSettlements] = useState(true);
  const [groupInvites, setGroupInvites] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...ANIMATION.spring.bouncy,
      }),
    ]).start();
  }, []);

  const handleToggleNotifications = (value: boolean) => {
    if (value) {
      Alert.alert(
        "Enable Notifications",
        "To receive notifications, enable them in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    }
    setNotificationsEnabled(value);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 48 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Main Toggle */}
            <GlassSurface style={styles.mainToggle}>
              <View style={styles.toggleRow}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.glass.glowOrange }]}>
                  <Ionicons name="notifications" size={22} color={COLORS.orange} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Push Notifications</Text>
                  <Text style={styles.toggleDesc}>
                    Receive alerts about your poker games
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                  thumbColor="#fff"
                />
              </View>
            </GlassSurface>

            {/* Notification Types */}
            {notificationsEnabled && (
              <>
                <Text style={styles.sectionTitle}>NOTIFICATION TYPES</Text>
                <GlassSurface noPadding>
                  <View style={[styles.toggleRow, styles.toggleRowInner, styles.borderBottom]}>
                    <View style={[styles.iconContainer, { backgroundColor: COLORS.glass.glowBlue }]}>
                      <Ionicons name="game-controller" size={20} color={COLORS.trustBlue} />
                    </View>
                    <View style={styles.toggleText}>
                      <Text style={styles.toggleTitle}>Game Updates</Text>
                      <Text style={styles.toggleDesc}>Buy-ins, cash-outs, game status</Text>
                    </View>
                    <Switch
                      value={gameUpdates}
                      onValueChange={setGameUpdates}
                      trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={[styles.toggleRow, styles.toggleRowInner, styles.borderBottom]}>
                    <View style={[styles.iconContainer, { backgroundColor: COLORS.glass.glowGreen }]}>
                      <Ionicons name="wallet" size={20} color={COLORS.status.success} />
                    </View>
                    <View style={styles.toggleText}>
                      <Text style={styles.toggleTitle}>Settlements</Text>
                      <Text style={styles.toggleDesc}>Payment requests and confirmations</Text>
                    </View>
                    <Switch
                      value={settlements}
                      onValueChange={setSettlements}
                      trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={[styles.toggleRow, styles.toggleRowInner]}>
                    <View style={[styles.iconContainer, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
                      <Ionicons name="people" size={20} color="#A855F7" />
                    </View>
                    <View style={styles.toggleText}>
                      <Text style={styles.toggleTitle}>Group Invites</Text>
                      <Text style={styles.toggleDesc}>Invitations to join groups</Text>
                    </View>
                    <Switch
                      value={groupInvites}
                      onValueChange={setGroupInvites}
                      trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                      thumbColor="#fff"
                    />
                  </View>
                </GlassSurface>
              </>
            )}

            {!notificationsEnabled && (
              <View style={styles.disabledNotice}>
                <Ionicons name="notifications-off-outline" size={48} color={COLORS.text.muted} />
                <Text style={styles.disabledTitle}>Notifications Disabled</Text>
                <Text style={styles.disabledDesc}>
                  Enable notifications to stay updated on your poker games and settlements
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.container,
  },
  mainToggle: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  toggleRowInner: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.cardPadding,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 2,
  },
  toggleDesc: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  disabledNotice: {
    alignItems: "center",
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  disabledTitle: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  disabledDesc: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
});

export default NotificationsScreen;
