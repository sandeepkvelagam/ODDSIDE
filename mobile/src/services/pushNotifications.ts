/**
 * Expo Push Notification Service
 * Handles permission requests, token registration, and notification listeners.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "../api/client";

// Configure how foreground notifications are shown
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let notificationSubscription: Notifications.Subscription | null = null;
let responseSubscription: Notifications.Subscription | null = null;

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return null;
    }

    // Android: Create notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Kvitt",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EE6C29",
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("wallet", {
        name: "Wallet",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#22C55E",
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("games", {
        name: "Games",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }

    // Get Expo Push Token (works with Expo Go and production)
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

export async function sendTokenToBackend(token: string): Promise<boolean> {
  try {
    await api.post("/users/push-token", { expo_push_token: token });
    return true;
  } catch (error) {
    console.error("Failed to register push token with backend:", error);
    return false;
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete("/users/push-token");
  } catch {
    // Best-effort
  }
}

export function setupNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  // Handle notification when app is in foreground
  notificationSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      onNotification?.(notification);
    }
  );

  // Handle user tapping on a notification
  responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      onResponse?.(response);
    }
  );

  return () => {
    if (notificationSubscription) {
      Notifications.removeNotificationSubscription(notificationSubscription);
    }
    if (responseSubscription) {
      Notifications.removeNotificationSubscription(responseSubscription);
    }
  };
}

export async function setupPushNotifications(): Promise<void> {
  const token = await registerForPushNotifications();
  if (token) {
    await sendTokenToBackend(token);
  }
}
