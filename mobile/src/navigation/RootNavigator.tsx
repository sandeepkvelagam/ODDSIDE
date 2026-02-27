import React, { useRef, useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { setupNotificationListeners } from "../services/pushNotifications";
import Svg, { Rect, Path } from "react-native-svg";

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
import { ChatsScreen } from "../screens/ChatsScreen";
import { PendingRequestsScreen } from "../screens/PendingRequestsScreen";
import { SettlementHistoryScreen } from "../screens/SettlementHistoryScreen";
import { RequestAndPayScreen } from "../screens/RequestAndPayScreen";

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Groups: undefined;
  Chats: undefined;
  PendingRequests: undefined;
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
  SettlementHistory: undefined;
  RequestAndPay: undefined;
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
      // Survey notification — go to settlement (survey modal auto-triggers there)
      if (data.game_id) {
        navigationRef.navigate("Settlement", { gameId: data.game_id });
      }
      break;

    case "settlement":
    case "payment_received":
      // Payment/settlement notifications — go to settlement screen
      if (data.game_id) {
        navigationRef.navigate("Settlement", { gameId: data.game_id });
      } else {
        navigationRef.navigate("Notifications");
      }
      break;

    case "payment_request":
      navigationRef.navigate("RequestAndPay" as any);
      break;

    case "reminder":
      // Payment or game reminders — route to settlement if ledger, else game
      if (data.game_id && data.ledger_id) {
        navigationRef.navigate("Settlement", { gameId: data.game_id });
      } else if (data.game_id) {
        navigationRef.navigate("GameNight", { gameId: data.game_id });
      } else {
        navigationRef.navigate("Notifications");
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

function AppSplash() {
  const scaleAnim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.splashContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Svg width={120} height={120} viewBox="0 0 40 40">
          <Rect x="2" y="2" width="36" height="36" rx="8" fill="#262626" />
          <Path
            d="M12 10V30M12 20L24 10M12 20L24 30"
            stroke="#EF6E59"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
      <Text style={styles.splashCaption}>TRACK. PLAY. SQUARE UP</Text>
    </View>
  );
}

export default function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { colors } = useTheme();

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
    return <AppSplash />;
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
              <Stack.Screen name="Chats" component={ChatsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="GroupHub" component={GroupHubScreen} options={{ headerShown: false }} />
              <Stack.Screen name="GameNight" component={GameNightScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Settlement" component={SettlementScreen} options={{ headerShown: false }} />
              <Stack.Screen name="PokerAI" component={PokerAIScreen} options={{ headerShown: false }} />
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
              <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SettlementHistory" component={SettlementHistoryScreen} options={{ headerShown: false }} />
              <Stack.Screen name="RequestAndPay" component={RequestAndPayScreen} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  splashCaption: {
    position: "absolute",
    bottom: 52,
    color: "#444",
    fontSize: 11,
    letterSpacing: 2,
  },
});
