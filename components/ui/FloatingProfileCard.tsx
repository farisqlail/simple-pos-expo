import React from "react";
import { View, Text, ViewStyle } from "react-native";

type Props = {
  initials?: string;
  title: string;
  subtitle?: string;
  top?: number; 
  horizontal?: number;  
  style?: ViewStyle;
};

export default function FloatingProfileCard({
  initials = "N7",
  title,
  subtitle,
  top = 64,
  horizontal = 16,
  style,
}: Props) {
  return (
    <View
      style={{
        position: "absolute",
        left: horizontal,
        right: horizontal,
        top,
        zIndex: 50,
        elevation: 8, // Android
        ...style,
      }}
    >
      <View
        className="bg-white rounded-2xl px-4 py-3 flex-row items-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mr-3">
          <Text className="text-orange-700 font-bold text-lg">{initials}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-gray-900">{title}</Text>
          {!!subtitle && <Text className="text-[12px] text-gray-500">{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}
