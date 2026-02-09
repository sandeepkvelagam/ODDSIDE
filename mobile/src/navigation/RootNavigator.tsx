import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import LoginScreen from "../screens/LoginScreen";
import TestScreen from "../screens/TestScreen";
import { RootStackParamList } from "./types";
import { ActivityIndicator, View } from "react-native";
import * as Linking from "expo-linking";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Deep linking configuration
  const linking = {
    prefixes: ["kvitt://"],
    config: {
      screens: {
        Login: "login",
        Test: "test",
      },
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0a0a0a",
          },
          headerTintColor: "#fff",
          headerShadowVisible: false,
        }}
      >
        {!session ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Test"
            component={TestScreen}
            options={{ title: "Phase 0 Tests" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
