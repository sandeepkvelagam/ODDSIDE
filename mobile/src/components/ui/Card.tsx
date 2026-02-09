import React from "react";
import { Pressable, View } from "react-native";

export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="bg-[#141421] border border-white/10 rounded-2xl p-4"
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className="bg-[#141421] border border-white/10 rounded-2xl p-4">
      {children}
    </View>
  );
}
