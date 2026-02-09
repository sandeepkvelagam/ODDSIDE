import React from "react";
import { Pressable, View } from "react-native";

export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className="bg-[#141421] border border-white/10 rounded-2xl p-4"
    >
      {children}
    </Wrapper>
  );
}
