import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface FloatingCartSummaryProps {
  itemCount: number;
  totalPrice: number;
  onCancel: () => void;
  onPay: () => void;
}

const FloatingCartSummary: React.FC<FloatingCartSummaryProps> = ({
  itemCount,
  totalPrice,
  onCancel,
  onPay,
}) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.itemText}>{itemCount} item</Text>
        <Text style={styles.priceText}>
          Rp {totalPrice.toLocaleString("id-ID")}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Batalkan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.payButton} onPress={onPay}>
          <Text style={styles.payText}>Bayar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#B71C1C", // merah sesuai gambar
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
  },
  itemText: {
    color: "#fff",
    fontSize: 12,
  },
  priceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelText: {
    color: "#fff",
    fontSize: 14,
  },
  payButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  payText: {
    color: "#B71C1C",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default FloatingCartSummary;
