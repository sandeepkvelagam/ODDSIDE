import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";

// Screens
import LoginScreen from "../screens/LoginScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { GroupHubScreen } from "../screens/GroupHubScreen";
import { GameNightScreen } from "../screens/GameNightScreen";

// Type definitions
export type RootStackParamList = {
  Login: undefined;
  Groups: undefined;
  GroupHub: { groupId: string; groupName?: string };
  GameNight: { gameId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Loading state while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
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
          // Auth screens
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Authenticated screens
          <>
            <Stack.Screen
              name="Groups"
              component={GroupsScreen}
              options={{ title: "Kvitt" }}
            />
            <Stack.Screen
              name="GroupHub"
              component={GroupHubScreen}
              options={({ route }) => ({
                title: route.params?.groupName || "Group",
              })}
            />
            <Stack.Screen
              name="GameNight"
              component={GameNightScreen}
              options={{ title: "Game" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
});
