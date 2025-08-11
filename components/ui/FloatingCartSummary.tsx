import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";

const dummyCartItems = [
  {
    id: 1,
    name: "Matcha Latte",
    price: 25000,
    quantity: 1,
  },
  {
    id: 2,
    name: "Matcha Latte",
    price: 25000,
    quantity: 1,
  },
  {
    id: 3,
    name: "Matcha Latte",
    price: 35000,
    quantity: 1,
    note: {
      size: "Large",
      sugar: "Normal",
      toppings: ["Boba", "Grass Jelly", "Coffee Jelly"],
      message: 'Beri pesan "Happy Birthday" pada cup',
    },
  },
];

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
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      {/* Floating Bar */}
      <View style={styles.container}>
        <View>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Text style={styles.itemText}>{itemCount} item</Text>
          </TouchableOpacity>
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

      {/* Modal Cart */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Keranjang Belanja</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {dummyCartItems.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                    <Text style={{ color: "#666" }}>
                      Rp {item.price.toLocaleString("id-ID")}
                    </Text>
                    {item.note && (
                      <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        Ukuran Cup {item.note.size} | Gula {item.note.sugar}{"\n"}
                        Topping: {item.note.toppings.join(", ")}
                        {"\n"}
                        {item.note.message}
                      </Text>
                    )}
                  </View>

                  <View style={styles.qtyContainer}>
                    <TouchableOpacity style={styles.qtyBtn}>
                      <Text style={{ color: "#B71C1C" }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ marginHorizontal: 8 }}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn}>
                      <Text style={{ color: "#B71C1C" }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Footer Total */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text>Subtotal</Text>
                <Text>Rp 400.000</Text>
              </View>
              <View style={styles.footerRow}>
                <Text>Biaya Admin</Text>
                <Text style={{ color: "red" }}>+ Rp 1.000</Text>
              </View>
              <View style={[styles.footerRow, { fontWeight: "bold" }]}>
                <Text>Total Pembayaran</Text>
                <Text style={{ fontWeight: "bold" }}>Rp 401.000</Text>
              </View>

              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={styles.cancelFooterBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: "#B71C1C" }}>Batalkan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.payFooterBtn}
                  onPress={() => {
                    setModalVisible(false);
                    onPay();
                  }}
                >
                  <Text style={{ color: "#fff" }}>Bayar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    borderWidth: 1,
    borderColor: "#B71C1C",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  footerButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  cancelFooterBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#B71C1C",
    borderRadius: 8,
    alignItems: "center",
    padding: 12,
  },
  payFooterBtn: {
    flex: 1,
    backgroundColor: "#B71C1C",
    borderRadius: 8,
    alignItems: "center",
    padding: 12,
  },
});

export default FloatingCartSummary;
