// app/receipt/index.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const formatCurrency = (num: number) =>
  "Rp " + num.toLocaleString("id-ID");

const storeInfo = {
  name: "N7 Coffee",
  address: "Jl Alamat Toko 123",
  logo: "https://via.placeholder.com/40x40.png?text=N7",
};
const transaction = {
  invoice: "#INV123890912389123098",
  date: "28/07/2025, 10:45:12",
  paymentMethod: "Tunai",
  subtotal: 15000000,
  adminFee: 1000,
  total: 14941000,
  amountReceived: 16941000,
};
const items = [
  {
    name: "Matcha Latte",
    price: 25000,
    qty: 1,
    details:
      "Ukuran Cup Large  Takaran Gula Normal\nTopping Boba, Grass Jelly, Coffee Jelly\nBeri pesan “Happy Birthday” pada cup",
  },
  { name: "Coffee Latte", price: 25000, qty: 1 },
  { name: "Red Velvet Latte", price: 25000, qty: 1 },
];

const RowBetween = ({
  label,
  value,
  bold = false,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) => (
  <View style={styles.rowBetween}>
    <Text style={bold && styles.bold}>{label}</Text>
    <Text
      style={[
        bold && styles.bold,
        valueColor && { color: valueColor },
      ]}
    >
      {value}
    </Text>
  </View>
);

export default function ReceiptScreen() {
  const router = useRouter();
  const change = transaction.amountReceived - transaction.total;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
        </View>
        <Text style={styles.successText}>Transaksi Berhasil</Text>

        {/* Card Info */}
        <View style={styles.card}>
          {/* Store Info */}
          <View style={styles.storeRow}>
            <Image
              source={{ uri: storeInfo.logo }}
              style={styles.storeLogo}
            />
            <View>
              <Text style={styles.storeName}>{storeInfo.name}</Text>
              <Text style={styles.storeAddress}>{storeInfo.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.invoice}>{transaction.invoice}</Text>
          <Text style={styles.date}>{transaction.date}</Text>

          <RowBetween
            label="Metode Pembayaran"
            value={transaction.paymentMethod}
            bold
          />
          <RowBetween
            label="Subtotal"
            value={formatCurrency(transaction.subtotal)}
          />
          <RowBetween
            label="Biaya Admin"
            value={`+ ${formatCurrency(transaction.adminFee)}`}
            valueColor="red"
          />
          <RowBetween
            label="Total Bayar"
            value={formatCurrency(transaction.total)}
            bold
          />
          <RowBetween
            label="Uang Diterima"
            value={formatCurrency(transaction.amountReceived)}
          />

          {/* Change */}
          <View style={styles.changeBox}>
            <Text style={styles.changeLabel}>Kembalian</Text>
            <Text style={styles.changeValue}>
              {formatCurrency(change)}
            </Text>
          </View>
        </View>

        {/* Detail Pembelian */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DETAIL PEMBELIAN</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemWrapper}>
              <RowBetween
                label={`${item.qty}x ${item.name}`}
                value={formatCurrency(item.price)}
              />
              {item.details && (
                <Text style={styles.itemDetails}>{item.details}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.printButton}>
          <Ionicons name="print" size={16} color="#DA2424" />
          <Text style={styles.printText}>Cetak Struk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newTransactionButton}
          onPress={() => router.push("/(tabs)")}
        >
          <Ionicons name="cart" size={16} color="#fff" />
          <Text style={styles.newTransactionText}>Transaksi Baru</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  successIcon: { alignItems: "center", marginTop: 10 },
  successText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  storeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  storeLogo: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  storeName: { fontWeight: "bold", fontSize: 16 },
  storeAddress: { fontSize: 12, color: "#666" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 8 },
  invoice: { marginTop: 4, fontWeight: "bold" },
  date: { fontSize: 12, color: "#666", marginBottom: 8 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  bold: { fontWeight: "bold" },
  changeBox: {
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: "#FFF9E6",
    padding: 8,
    marginTop: 6,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  changeLabel: { color: "#333" },
  changeValue: { fontWeight: "bold", color: "#333" },
  sectionTitle: { fontWeight: "bold", marginBottom: 8 },
  itemWrapper: { marginBottom: 10 },
  itemDetails: { fontSize: 12, color: "#666", marginTop: 2 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    width: "100%",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  printButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  printText: { color: "#DA2424", marginLeft: 4, fontWeight: "bold" },
  newTransactionButton: {
    flex: 1,
    backgroundColor: "#DA2424",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  newTransactionText: { color: "#fff", fontWeight: "bold" },
});
