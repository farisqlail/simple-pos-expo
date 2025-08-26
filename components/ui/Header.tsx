import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  backIconColor?: string;
  style?: string;
  titleStyle?: string;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  backgroundColor = "bg-red-600",
  textColor = "text-white",
  backIconColor = "#ffffff",
  style = "",
  titleStyle = "",
  rightComponent,
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View
      className={`flex-row items-center gap-2 ${backgroundColor}`}
      style={{ paddingTop: 20, paddingBottom: 20, paddingLeft: 20 }}>
      <View className="w-10 justify-center items-start">
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            className="-ml-2 p-2"
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={backIconColor} />
          </TouchableOpacity>
        )}
      </View>

      <View>
        <Text
          className={`font-semibold text-center ${textColor}`}
          style={{ fontSize: 17 }}>
          {title}
        </Text>
      </View>
    </View>
  );
};

export default Header;
