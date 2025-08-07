import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: "small" | "medium" | "large";
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  size = "medium",
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  // ✅ FIX: Use correct return type for browser timers
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Size configurations
  const sizeConfig = {
    small: {
      buttonSize: "w-8 h-8",
      iconSize: 14,
      textSize: "text-sm",
      spacing: "mx-3",
    },
    medium: {
      buttonSize: "w-10 h-10",
      iconSize: 16,
      textSize: "text-lg",
      spacing: "mx-4",
    },
    large: {
      buttonSize: "w-12 h-12",
      iconSize: 20,
      textSize: "text-xl",
      spacing: "mx-5",
    },
  };

  const config = sizeConfig[size];

  // Update input value if not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const startLongPress = (action: "increase" | "decrease") => {
    clearTimers();

    longPressTimer.current = setTimeout(() => {
      intervalTimer.current = setInterval(() => {
        action === "increase" ? handleIncrease() : handleDecrease();
      }, 100);
    }, 500);
  };

  const clearTimers = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (intervalTimer.current) {
      clearInterval(intervalTimer.current);
      intervalTimer.current = null;
    }
  };

  const handleInputChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    setInputValue(numericText);
  };

  const handleInputSubmit = () => {
    const numericValue = parseInt(inputValue) || min;
    const clampedValue = Math.max(min, Math.min(max, numericValue));
    onChange(clampedValue);
    setInputValue(clampedValue.toString());
    setIsEditing(false);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleInputBlur = () => {
    handleInputSubmit();
  };

  const isMinValue = value <= min;
  const isMaxValue = value >= max;

  return (
    <View className="flex-row items-center border w-full justify-between p-1 rounded-lg">
      {/* Decrease Button */}
      <TouchableOpacity
        onPress={handleDecrease}
        onPressIn={() => !isMinValue && startLongPress("decrease")}
        onPressOut={clearTimers}
        disabled={isMinValue}
        className={`${config.buttonSize} rounded-lg items-center justify-center p-4 ${
          isMinValue ? "bg-gray-200" : "bg-[#FEE2E2] active:bg-[#FEE2E2]"
        }`}
        activeOpacity={0.7}
      >
        <Ionicons
          name="remove"
          size={config.iconSize}
          color={isMinValue ? "#9CA3AF" : "#EF4444"}
        />
      </TouchableOpacity>

      {/* Quantity Input */}
      <View className={config.spacing}>
        {isEditing ? (
          <TextInput
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleInputSubmit}
            onBlur={handleInputBlur}
            keyboardType="numeric"
            selectTextOnFocus
            className={`${config.textSize} font-semibold text-center text-gray-800 min-w-[40px] px-2 py-1 border border-gray-300 rounded`}
            style={{ minWidth: 40 }}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text
              className={`${config.textSize} font-semibold text-gray-800 text-center min-w-[40px]`}
            >
              {value}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Increase Button */}
      <TouchableOpacity
        onPress={handleIncrease}
        onPressIn={() => !isMaxValue && startLongPress("increase")}
        onPressOut={clearTimers}
        disabled={isMaxValue}
        className={`${config.buttonSize} rounded-lg items-center justify-center p-4 ${
          isMaxValue ? "bg-gray-200" : "bg-red-600 active:bg-red-600"
        }`}
        activeOpacity={0.7}
      >
        <Ionicons
          name="add"
          size={config.iconSize}
          color={isMaxValue ? "#9CA3AF" : "white"}
        />
      </TouchableOpacity>
    </View>
  );
};

export default QuantitySelector;
