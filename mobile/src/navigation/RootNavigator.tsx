import React, { useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useAuth } from "../context/AuthContext";

// Screens
import LoginScreen from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { GroupHubScreen } from "../screens/GroupHubScreen";
import { GameNightScreen } from "../screens/GameNightScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Groups: undefined;
  GroupHub: { groupId: string; groupName?: string };
  GameNight: { gameId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashOverlay({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.splashContainer, { opacity: fadeAnim }]}
      pointerEvents="none"
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={styles.splashTitle}>Kvitt</Text>
        <Text style={styles.splashSubtitle}>Your side, settled.</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(false);
  const prevSession = useRef(session);

  useEffect(() => {
    if (!prevSession.current && session) {
      setShowSplash(true);
    }
    prevSession.current = session;
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
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#0B0B0F" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#0B0B0F" },
          }}
        >
          {!session ? (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Groups"
                component={GroupsScreen}
                options={{ title: "Groups", headerBackTitle: "Back" }}
              />
              <Stack.Screen
                name="GroupHub"
                component={GroupHubScreen}
                options={({ route }) => ({
                  title: route.params?.groupName || "Group",
                  headerBackTitle: "Back",
                })}
              />
              <Stack.Screen
                name="GameNight"
                component={GameNightScreen}
                options={{ title: "Game Night", headerBackTitle: "Back" }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: "Settings", headerBackTitle: "Back" }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {showSplash && session && (
        <SplashOverlay onFinish={() => setShowSplash(false)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
  loadingLogo: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
    zIndex: 100,
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  splashSubtitle: {
    fontSize: 16,
    color: "#EF6E59",
    textAlign: "center",
    marginTop: 8,
  },
});
