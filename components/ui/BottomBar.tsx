import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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
  return (
    <View style={styles.bottomBar}>
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
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#B71C1C",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
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
