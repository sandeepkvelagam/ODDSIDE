import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GroupsScreen } from "../screens/GroupsScreen";
import { GroupHubScreen } from "../screens/GroupHubScreen";
import { GameNightScreen } from "../screens/GameNightScreen";

export type MainStackParamList = {
  Groups: undefined;
  GroupHub: { groupId: string; groupName?: string };
  GameNight: { gameId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0B0F" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#0B0B0F" },
      }}
    >
      <Stack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: "Kvitt" }}
      />
      <Stack.Screen
        name="GroupHub"
        component={GroupHubScreen}
        options={({ route }) => ({ title: route.params.groupName ?? "Group" })}
      />
      <Stack.Screen
        name="GameNight"
        component={GameNightScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
