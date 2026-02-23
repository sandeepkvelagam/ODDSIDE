import React, { useRef, useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { setupNotificationListeners } from "../services/pushNotifications";

// Screens
import LoginScreen from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DashboardScreenV2 } from "../screens/DashboardScreenV2";
import { GroupsScreen } from "../screens/GroupsScreen";
import { GroupHubScreen } from "../screens/GroupHubScreen";
import { GameNightScreen } from "../screens/GameNightScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { BillingScreen } from "../screens/BillingScreen";
import { LanguageScreen } from "../screens/LanguageScreen";
import { AIAssistantScreen } from "../screens/AIAssistantScreen";
import { SettlementScreen } from "../screens/SettlementScreen";
import { PokerAIScreen } from "../screens/PokerAIScreen";
import { AIToolkitScreen } from "../screens/AIToolkitScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { FeedbackScreen } from "../screens/FeedbackScreen";
import { AutomationsScreen } from "../screens/AutomationsScreen";

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Groups: undefined;
  GroupHub: { groupId: string; groupName?: string };
  GameNight: { gameId: string };
  Settlement: { gameId: string };
  PokerAI: undefined;
  Settings: undefined;
  Profile: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Privacy: undefined;
  Billing: undefined;
  Language: undefined;
  AIAssistant: undefined;
  AIToolkit: undefined;
  Feedback: undefined;
  Automations: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Global navigation ref for use outside React components (e.g. push notification handler)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Routes a notification tap to the correct screen based on notification data.type
 */
function handleNotificationDeepLink(data: Record<string, any>) {
  if (!navigationRef.isReady()) return;

  const type: string = data?.type || "";

  switch (type) {
    case "game_started":
    case "game_ended":
    case "buy_in":
    case "cash_out":
      if (data.game_id) {
        navigationRef.navigate("GameNight", { gameId: data.game_id });
      }
      break;

    case "settlement_generated":
      if (data.game_id) {
        navigationRef.navigate("Settlement", { gameId: data.game_id });
      }
      break;

    case "wallet_received":
    case "withdrawal_requested":
      navigationRef.navigate("Wallet");
      break;

    case "group_invite_request":
    case "invite_accepted":
      navigationRef.navigate("Notifications");
      break;

    case "admin_transferred":
    case "invite_sent":
      if (data.group_id) {
        navigationRef.navigate("GroupHub", { groupId: data.group_id });
      } else {
        navigationRef.navigate("Groups");
      }
      break;

    case "post_game_survey":
      // Survey notification — go to the game screen (survey modal is triggered there)
      if (data.game_id) {
        navigationRef.navigate("GameNight", { gameId: data.game_id });
      }
      break;

    case "feedback_update":
    case "issue_responded":
      navigationRef.navigate("Notifications");
      break;

    case "automation_disabled":
    case "automation_error":
      navigationRef.navigate("Automations");
      break;

    default:
      // Fallback: go to Notifications inbox
      navigationRef.navigate("Notifications");
      break;
  }
}

function SplashOverlay({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onFinish());
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={styles.splashTitle}>Kvitt</Text>
        <Text style={styles.splashSubtitle}>Your side, settled.</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { colors } = useTheme();
  const [showSplash, setShowSplash] = React.useState(false);
  const prevSession = useRef(session);

  useEffect(() => {
    if (!prevSession.current && session) setShowSplash(true);
    prevSession.current = session;
  }, [session]);

  // Setup push notification deep link listener (only when logged in)
  useEffect(() => {
    if (!session) return;

    const cleanup = setupNotificationListeners(
      // Foreground notification received — no navigation, just show
      undefined,
      // User tapped notification
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        handleNotificationDeepLink(data);
      }
    );

    return cleanup;
  }, [session]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>Kvitt</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {!session ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreenV2} options={{ headerShown: false }} />
              <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="GroupHub" component={GroupHubScreen} options={{ headerShown: false }} />
              <Stack.Screen name="GameNight" component={GameNightScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: "Settlement", headerBackTitle: "" }} />
              <Stack.Screen name="PokerAI" component={PokerAIScreen} options={{ title: "Poker AI", headerBackTitle: "" }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Billing" component={BillingScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Language" component={LanguageScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="AIToolkit" component={AIToolkitScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
              <Stack.Screen name="Automations" component={AutomationsScreen} options={{ headerShown: false, animation: "slide_from_bottom", presentation: "transparentModal", contentStyle: { backgroundColor: "transparent" } }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {showSplash && session && <SplashOverlay onFinish={() => setShowSplash(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#282B2B",
  },
  loadingLogo: { fontSize: 36, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  loadingText: { color: "#666", fontSize: 14 },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#282B2B", zIndex: 100,
  },
  splashTitle: { fontSize: 48, fontWeight: "bold", color: "#fff", textAlign: "center" },
  splashSubtitle: { fontSize: 16, color: "#EE6C29", textAlign: "center", marginTop: 8 },
});
