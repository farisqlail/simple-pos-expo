import React from "react";
import { View, TextInput, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ icon, className = "", ...props }) => {
  return (
    <View className={`flex-row items-center border border-neutral-400 rounded-lg px-4 py-1 ${className}`}>
      {icon && <View className="mr-2">{icon}</View>}
      <TextInput
        className="flex-1 text-base text-black text-xl"
        placeholderTextColor="#9ca3af"
        {...props}
      />
    </View>
  );
};

export default Input;
