import React from "react";
import { SafeAreaView } from "react-native";

export function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView className="flex-1 bg-[#0B0B0F] px-4">{children}</SafeAreaView>;
}
