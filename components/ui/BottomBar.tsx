import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomBarProps = {
  itemCount: number;
  total: number;
  buttonText: string;
  onPress: () => void;
  formatCurrency: (val: number) => string;
};

const BottomBar = ({
  itemCount,
  total,
  buttonText,
  onPress,
  formatCurrency,
}: BottomBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
      <View>
        <Text style={styles.itemCount}>{itemCount} item</Text>
        <Text style={styles.totalText}>{formatCurrency(total)}</Text>
      </View>
      <TouchableOpacity style={styles.completeButton} onPress={onPress}>
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
    bottom: 0, // biar nempel ke safe area
    backgroundColor: "#B71C1C",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingBottom ditambahin lewat insets.bottom
  },
  itemCount: { color: "#fff", fontSize: 12 },
  totalText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  completeButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: { color: "#B71C1C", fontWeight: "bold" },
});

export default BottomBar;
