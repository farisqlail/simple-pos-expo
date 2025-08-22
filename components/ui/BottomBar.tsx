// components/ui/BottomBar.tsx
import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomBarProps = {
  itemCount: number;
  total: number;
  buttonText: string;
  onPress: () => void;
  formatCurrency: (val: number) => string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const BottomBar: React.FC<BottomBarProps> = ({
  itemCount,
  total,
  buttonText,
  onPress,
  formatCurrency,
  style,
  disabled = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomBar,
        // pastikan tidak ketutup nav bar/home indicator
        { bottom: Math.max(12, (insets?.bottom || 0) + 12) },
        style,
      ]}
      // accessibility
      accessibilityRole="toolbar"
    >
      <View style={{ gap: 4 }}>
        <Text style={styles.itemCount}>
          {itemCount} item
        </Text>
        <Text style={styles.totalText}>{formatCurrency(total)}</Text>
      </View>

      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.completeButton, disabled && { opacity: 0.6 }]}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={buttonText}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.completeButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    // bottom ditentukan dinamis via insets di atas
    backgroundColor: "#B71C1C",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    // shadow iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation Android
    elevation: 5,
  },
  itemCount: { color: "#fff", fontSize: 12 },
  totalText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  completeButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonText: { color: "#B71C1C", fontWeight: "bold" },
});

export default memo(BottomBar);
