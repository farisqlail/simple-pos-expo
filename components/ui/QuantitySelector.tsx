import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sizeConfig = {
    small: { buttonSize: 32, iconSize: 14, fontSize: 14 },
    medium: { buttonSize: 40, iconSize: 16, fontSize: 18 },
    large: { buttonSize: 48, iconSize: 20, fontSize: 20 },
  };

  const config = sizeConfig[size];

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

  const isMinValue = value <= min;
  const isMaxValue = value >= max;

  return (
    <View style={[styles.container, { height: "auto" }]}>
      {/* Minus */}
      <TouchableOpacity
        onPress={handleDecrease}
        onPressIn={() => !isMinValue && startLongPress("decrease")}
        onPressOut={clearTimers}
        disabled={isMinValue}
        style={[
          styles.button,
          {
            backgroundColor: isMinValue ? "#E0E0E0" : "#FEE2E2",
            width: config.buttonSize,
            height: config.buttonSize,
            borderRadius: 10,
          },
        ]}
        activeOpacity={0.7}>
        <Ionicons
          name="remove"
          size={config.iconSize}
          color={isMinValue ? "#6A6A6A" : "#B81D1D"}
        />
      </TouchableOpacity>

      {/* Value */}
      <View style={styles.valueContainer}>
        <Text style={[styles.valueText, { fontSize: config.fontSize }]}>
          {value}
        </Text>
      </View>

      {/* Plus */}
      <TouchableOpacity
        onPress={handleIncrease}
        onPressIn={() => !isMaxValue && startLongPress("increase")}
        onPressOut={clearTimers}
        disabled={isMaxValue}
        style={[
          styles.button,
          {
            backgroundColor: isMaxValue ? "#E5E7EB" : "#DC2626",
            width: config.buttonSize,
            height: config.buttonSize,
            borderRadius: 10,
          },
        ]}
        activeOpacity={0.7}>
        <Ionicons
          name="add"
          size={config.iconSize}
          color={isMaxValue ? "#9CA3AF" : "#FFFFFF"}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
  },
  valueContainer: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  valueText: {
    fontWeight: "600",
    color: "#1F2937",
  },
});

export default QuantitySelector;
